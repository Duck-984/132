import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новый", processing: "В обработке", assembling: "В сборке",
  assembled: "Собран", shipping: "В доставке", delivered: "Доставлен",
  cancelled: "Отменён", return_requested: "Возврат", returned: "Возвращён",
  paid: "Оплачен", shipped: "Отправлен",
};

const ALLOWED_TABLES = [
  "products", "categories", "orders", "users", "banners",
  "delivery_zones", "coupons", "coupon_usage", "returns",
  "reviews", "audit_log", "admin_accounts", "product_collections",
  "promotions", "favorites", "notifications", "product_relations",
  "referrals",
];

// Tables that only require read (no session needed for SELECT)
// ALL mutations require a valid admin session token
const MUTATION_ACTIONS = ["insert", "update", "delete", "updateOrderStatus", "updateReturnStatus"];

async function hashToken(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyAdminSession(
  supabase: ReturnType<typeof createClient>,
  admin_session: { admin_id: string; token: string } | undefined
): Promise<{ ok: boolean; error?: string }> {
  if (!admin_session?.admin_id || !admin_session?.token) {
    return { ok: false, error: "Admin session required" };
  }
  const tokenHash = await hashToken(admin_session.token);
  const { data } = await supabase
    .from("admin_accounts")
    .select("id, is_active")
    .eq("id", admin_session.admin_id)
    .eq("session_token", tokenHash)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) {
    return { ok: false, error: "Invalid or expired admin session" };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action, table, data, filters, id, admin_session } = body;

    if (!action || !table) {
      return new Response(
        JSON.stringify({ error: "Missing action or table" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: "Table not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ALL mutation actions require a valid admin session
    if (MUTATION_ACTIONS.includes(action)) {
      const check = await verifyAdminSession(supabase, admin_session);
      if (!check.ok) {
        return new Response(
          JSON.stringify({ error: check.error }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let result;

    switch (action) {
      case "select": {
        let query = supabase.from(table).select(data || "*");
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
              if (key === "search" && table === "orders") {
                // Search by customer name or phone in customer_info JSONB
                query = query.or(`customer_info->>name.ilike.%${value}%,customer_info->>phone.ilike.%${value}%`);
              } else if (key === "status_in" && table === "orders") {
                // Filter by multiple statuses (comma-separated)
                const statuses = String(value).split(",").map(s => s.trim());
                query = query.in("status", statuses);
              } else if (key === "status_not_in" && table === "orders") {
                // Exclude multiple statuses
                const statuses = String(value).split(",").map(s => s.trim());
                query = query.not("status", "in", `(${statuses.map(s => `"${s}"`).join(",")})`);
              } else {
                query = query.eq(key, value as string);
              }
            }
          }
        }
        if (table === "orders") {
          query = query.order("created_at", { ascending: false }).range(0, 999);
        } else if (table === "audit_log") {
          query = query.order("created_at", { ascending: false }).limit(200);
        } else {
          query = query.order("created_at", { ascending: false }).range(0, 499);
        }
        const { data: rows, error } = await query;
        if (error) throw error;
        result = rows;
        break;
      }

      case "insert": {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        result = inserted;
        break;
      }

      case "update": {
        if (id === "__bulk__" && filters) {
          let query = supabase
            .from(table)
            .update({ ...data, updated_at: new Date().toISOString() });
          for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value as string);
            }
          }
          const { error } = await query;
          if (error) throw error;
          result = { success: true };
        } else {
          if (!id) throw new Error("ID required for update");
          const { error } = await supabase
            .from(table)
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", id);
          if (error) throw error;
          result = { success: true };
        }
        break;
      }

      case "delete": {
        if (id === "__filter__" && filters) {
          let query = supabase.from(table).delete();
          for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value as string);
            }
          }
          const { error } = await query;
          if (error) throw error;
        } else {
          if (!id) throw new Error("ID required for delete");
          const { error } = await supabase.from(table).delete().eq("id", id);
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      case "updateOrderStatus": {
        if (!id) throw new Error("ID required");
        const { status, changed_by } = data;
        const { data: order, error: fetchErr } = await supabase
          .from("orders")
          .select("status_history, telegram_user_id, items")
          .eq("id", id)
          .maybeSingle();
        if (fetchErr) throw fetchErr;

        const history = Array.isArray(order?.status_history) ? order.status_history : [];
        const newEntry = {
          status,
          changed_at: new Date().toISOString(),
          changed_by: changed_by || "Admin",
        };

        const { data: updatedOrder, error: updateErr } = await supabase
          .from("orders")
          .update({
            status,
            status_history: [...history, newEntry],
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();
        if (updateErr) throw updateErr;

        if (order?.telegram_user_id) {
          const shortId = id.slice(0, 8).toUpperCase();
          const statusLabel = STATUS_LABELS[status] || status;

          // In-app notification
          await supabase.from("notifications").insert({
            telegram_user_id: order.telegram_user_id,
            type: `order_${status}`,
            title: `Заказ #${shortId}`,
            body: `Статус изменён: ${statusLabel}`,
            data: { order_id: id, status },
          }).catch(() => {});

          // Telegram notification
          const tgMessages: Record<string, string> = {
            new: `📋 Заказ #${shortId} принят в обработку.\nСтатус: ${statusLabel}`,
            processing: `⏳ Заказ #${shortId} в обработке.\nСтатус: ${statusLabel}`,
            assembling: `📦 Заказ #${shortId} собирается.\nСтатус: ${statusLabel}`,
            assembled: `✅ Заказ #${shortId} готов к отправке.\nСтатус: ${statusLabel}`,
            shipping: `🚚 Заказ #${shortId} в доставке.\nСтатус: ${statusLabel}`,
            delivered: `🎉 Заказ #${shortId} доставлен!\nСпасибо за покупку!`,
            cancelled: `❌ Заказ #${shortId} отменён.\nЕсли у вас есть вопросы — напишите нам.`,
            return_requested: `🔄 Заказ #${shortId}: заявка на возврат.\nМы рассмотрим ваш запрос.`,
            returned: `↩️ Заказ #${shortId}: возврат оформлен.\nСредства будут возвращены.`,
          };
          const tgText = tgMessages[status];
          if (tgText) {
            sendTelegramMessage(order.telegram_user_id, tgText).catch(() => {});
          }
        }

        result = updatedOrder;
        break;
      }

      case "updateReturnStatus": {
        if (!id) throw new Error("ID required");
        const { status: retStatus, admin_note, changed_by: retChangedBy } = data;

        const { data: ret, error: retFetchErr } = await supabase
          .from("returns")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (retFetchErr) throw retFetchErr;

        // Fetch linked order separately (order_id is text, no FK)
        const orderId = (ret as Record<string, unknown>)?.order_id as string;
        let telegramUserId = (ret as Record<string, unknown>)?.telegram_user_id as number;
        if (orderId) {
          const { data: linkedOrder } = await supabase
            .from("orders")
            .select("telegram_user_id")
            .eq("id", orderId)
            .maybeSingle();
          if (linkedOrder?.telegram_user_id) {
            telegramUserId = linkedOrder.telegram_user_id;
          }
        }

        const updates: Record<string, unknown> = {
          status: retStatus,
          updated_at: new Date().toISOString(),
        };
        if (admin_note) updates.admin_note = admin_note;

        const { error: retUpdateErr } = await supabase
          .from("returns")
          .update(updates)
          .eq("id", id);
        if (retUpdateErr) throw retUpdateErr;

        const shortOrderId = orderId?.slice(0, 8).toUpperCase() ?? "";

        if (telegramUserId) {
          const returnMessages: Record<string, string> = {
            approved: `✅ Ваша заявка на возврат по заказу #${shortOrderId} одобрена.\nМы свяжемся с вами для забора товара.`,
            rejected: `❌ Ваша заявка на возврат по заказу #${shortOrderId} отклонена.\nПричина: ${admin_note || 'не указана'}`,
            refunded: `💰 Возврат по заказу #${shortOrderId} оформлен.\nСредства будут возвращены.`,
          };
          const tgText = returnMessages[retStatus as string];
          if (tgText) {
            sendTelegramMessage(telegramUserId, tgText).catch(() => {});
          }

          // In-app notification
          const inAppMessages: Record<string, string> = {
            approved: `Заявка на возврат #${shortOrderId} одобрена`,
            rejected: `Заявка на возврат #${shortOrderId} отклонена`,
            refunded: `Возврат по заказу #${shortOrderId} оформлен`,
          };
          const inAppBody = inAppMessages[retStatus as string];
          if (inAppBody) {
            await supabase.from("notifications").insert({
              telegram_user_id: telegramUserId,
              type: `return_${retStatus}`,
              title: `Возврат #${shortOrderId}`,
              body: inAppBody,
              data: { return_id: id, order_id: orderId, status: retStatus },
            }).catch(() => {});
          }

          // When return is approved → update order status to 'return_requested' so client can see
          if (retStatus === "approved" && orderId) {
            const { data: orderForReturn } = await supabase
              .from("orders")
              .select("status_history")
              .eq("id", orderId)
              .maybeSingle();
            const returnHistory = Array.isArray(orderForReturn?.status_history) ? orderForReturn.status_history : [];
            await supabase.from("orders").update({
              status: "return_requested",
              status_history: [...returnHistory, {
                status: "return_requested",
                changed_at: new Date().toISOString(),
                changed_by: retChangedBy || "Admin",
                note: "Возврат одобрен",
              }],
              updated_at: new Date().toISOString(),
            }).eq("id", orderId).catch(() => {});
          }

          // When refund is confirmed → update order to 'returned' + restore stock
          if (retStatus === "refunded" && orderId) {
            const { data: orderForReturn } = await supabase
              .from("orders")
              .select("status_history")
              .eq("id", orderId)
              .maybeSingle();
            const returnHistory = Array.isArray(orderForReturn?.status_history) ? orderForReturn.status_history : [];
            await supabase.from("orders").update({
              status: "returned",
              status_history: [...returnHistory, {
                status: "returned",
                changed_at: new Date().toISOString(),
                changed_by: retChangedBy || "Admin",
                note: "Возврат подтверждён, товар возвращён",
              }],
              updated_at: new Date().toISOString(),
            }).eq("id", orderId).catch(() => {});

            // Restore stock
            const returnItems = (ret as Record<string, unknown>)?.items;
            if (Array.isArray(returnItems)) {
              for (const item of returnItems as Array<{ productId: string; quantity: number }>) {
                if (item.productId && item.quantity > 0) {
                  const { data: prod } = await supabase
                    .from("products")
                    .select("stock")
                    .eq("id", item.productId)
                    .maybeSingle();
                  if (prod) {
                    await supabase.from("products").update({
                      stock: (prod.stock ?? 0) + item.quantity,
                      updated_at: new Date().toISOString(),
                    }).eq("id", item.productId).catch(() => {});
                  }
                }
              }
            }
          }
        }

        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin API error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
