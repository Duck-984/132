import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { telegram_user_id, message, parse_mode, product_id, type } = body;

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Product notification mode: send to all users with notify_price or notify_stock
    if (product_id && type) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const supabase = createClient(supabaseUrl, serviceKey);

      // Get product info
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price, slug")
        .eq("id", product_id)
        .maybeSingle();

      if (!product) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const productName = typeof product.name === "object" ? (product.name as { ru: string }).ru : product.name;

      // Get users to notify
      const field = type === "price_drop" ? "notify_price" : "notify_stock";
      const { data: favorites } = await supabase
        .from("favorites")
        .select("telegram_user_id")
        .eq("product_id", product_id)
        .eq(field, true);

      if (!favorites || favorites.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: "No users to notify" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const chatIds = [...new Set(favorites.map((f) => f.telegram_user_id))];
      let sent = 0;
      let errors = 0;

      for (const chatId of chatIds) {
        try {
          const text = type === "price_drop"
            ? `🔥 Товар из избранного стал дешевле!\n\n📦 ${productName}\n💰 Новая цена: ${product.price} сум\n\nОткройте каталог, чтобы оформить заказ.`
            : `📦 Товар снова в наличии!\n\n📦 ${productName}\n\nУспейте заказать!`;

          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: "HTML",
              }),
            }
          );

          if (response.ok) {
            sent++;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
        // Rate limit: 30 messages/sec max
        await new Promise((r) => setTimeout(r, 35));
      }

      return new Response(
        JSON.stringify({ success: true, sent, errors, total: chatIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Direct message mode
    if (!telegram_user_id || !message) {
      return new Response(
        JSON.stringify({ error: "telegram_user_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegram_user_id,
          text: message,
          parse_mode: parse_mode || "HTML",
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Telegram API error:", result);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.description || "Failed to send message",
          error_code: result.error_code,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: result.result?.message_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
