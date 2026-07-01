import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Apikey, X-Client-Info",
};

interface OrderItem {
  productId: string;
  name: { ru: string; uz: string } | string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

interface CheckoutRequest {
  telegram_user_id: number;
  items: OrderItem[];
  total_amount: number;
  customer_info: {
    name: string;
    phone: string;
    city: string;
    address: string;
    zone_id?: string;
    region?: string;
  };
  delivery_type: string;
  delivery_cost: number;
  payment_method: string;
  notes?: string;
  coupon_id?: string;
  discount_amount?: number;
  init_data?: string;
}

async function verifyTelegramInitData(initData: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    const dataCheckArr: string[] = [];
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(dataCheckString)
    );
    const hmacHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hmacHex === hash;
  } catch {
    return false;
  }
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

    const body: CheckoutRequest = await req.json();

    // Verify Telegram init_data for security
    if (Deno.env.get("TELEGRAM_BOT_TOKEN") && body.init_data) {
      const isValid = await verifyTelegramInitData(body.init_data);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid Telegram data" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate required fields
    if (!body.telegram_user_id || !body.items?.length || !body.total_amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate customer info
    if (!body.customer_info?.name || !body.customer_info?.phone || !body.customer_info?.address) {
      return new Response(
        JSON.stringify({ error: "Missing customer info" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify stock for all items before creating order
    for (const item of body.items) {
      if (item.quantity <= 0) {
        return new Response(
          JSON.stringify({ error: `Invalid quantity for product ${item.productId}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: product, error: prodError } = await supabase
        .from("products")
        .select("id, stock, price, is_active")
        .eq("id", item.productId)
        .maybeSingle();

      if (prodError || !product) {
        return new Response(
          JSON.stringify({ error: `Product ${item.productId} not found` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!product.is_active) {
        return new Response(
          JSON.stringify({ error: `Product ${item.productId} is not available` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (product.stock < item.quantity) {
        return new Response(
          JSON.stringify({ error: `Insufficient stock for product ${item.productId}. Available: ${product.stock}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify price matches (prevent price tampering)
      if (Math.abs(Number(product.price) - item.price) > 1) {
        return new Response(
          JSON.stringify({ error: `Price mismatch for product ${item.productId}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate coupon if provided
    let discountAmount = body.discount_amount || 0;
    if (body.coupon_id) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, type, value, min_order_amount, is_active, valid_from, valid_until")
        .eq("id", body.coupon_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!coupon) {
        return new Response(
          JSON.stringify({ error: "Invalid coupon" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify coupon validity
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Coupon expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(coupon.valid_from) > new Date()) {
        return new Response(
          JSON.stringify({ error: "Coupon not yet active" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Recalculate discount server-side
      const subtotal = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (subtotal < coupon.min_order_amount) {
        return new Response(
          JSON.stringify({ error: `Minimum order amount: ${coupon.min_order_amount}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      discountAmount = coupon.type === "percent"
        ? Math.round(subtotal * coupon.value / 100)
        : Math.min(coupon.value, subtotal);
    }

    // Create order with atomic stock deduction using a transaction
    const { data: order, error: orderError } = await supabase.rpc("create_order_with_stock", {
      p_telegram_user_id: body.telegram_user_id,
      p_items: body.items,
      p_total_amount: body.total_amount,
      p_customer_info: body.customer_info,
      p_delivery_type: body.delivery_type,
      p_delivery_cost: body.delivery_cost,
      p_payment_method: body.payment_method,
      p_notes: body.notes || null,
      p_coupon_id: body.coupon_id || null,
      p_discount_amount: discountAmount,
      p_status: body.payment_method === "cash" ? "new" : "processing",
    }).maybeSingle();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: orderError?.message || "Failed to create order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record coupon usage if applicable
    if (body.coupon_id) {
      await supabase.from("coupon_usage").insert({
        coupon_id: body.coupon_id,
        telegram_user_id: body.telegram_user_id,
        order_id: order.id,
      });
    }

    // Log the order creation
    await supabase.from("audit_log").insert({
      admin_id: "system",
      action: "order_created",
      entity_type: "orders",
      entity_id: order.id,
      details: {
        telegram_user_id: body.telegram_user_id,
        total_amount: body.total_amount,
        payment_method: body.payment_method,
        items_count: body.items.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          total_amount: order.total_amount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
