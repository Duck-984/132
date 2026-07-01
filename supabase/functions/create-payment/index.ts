import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Apikey, X-Client-Info",
};

interface PaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod: 'payme' | 'click' | 'uzum';
  customerPhone?: string;
}

interface PaymentResult {
  paymentUrl: string;
  transactionId: string;
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

    const { orderId, amount, paymentMethod }: PaymentRequest = await req.json();

    // Validate input
    if (!orderId || !amount || amount <= 0) {
      throw new Error('Invalid payment parameters');
    }

    if (!['payme', 'click', 'uzum'].includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    // Get order details and verify amount matches
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_method')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Verify amount matches order total (prevent tampering)
    if (Math.abs(Number(order.total_amount) - amount) > 1) {
      throw new Error('Amount mismatch');
    }

    // Verify order is in valid state for payment
    if (order.status === 'paid' || order.status === 'cancelled' || order.status === 'delivered') {
      throw new Error('Order not eligible for payment');
    }

    let paymentData: PaymentResult;

    switch (paymentMethod) {
      case 'payme':
        paymentData = await createPaymePayment(orderId, amount);
        break;
      case 'click':
        paymentData = await createClickPayment(orderId, amount);
        break;
      case 'uzum':
        paymentData = await createUzumPayment(orderId, amount);
        break;
      default:
        throw new Error('Invalid payment method');
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: paymentData.paymentUrl,
        transactionId: paymentData.transactionId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function createPaymePayment(orderId: string, amount: number) {
  const merchantId = Deno.env.get("PAYME_MERCHANT_ID") ?? "";
  const baseUrl = Deno.env.get("PAYME_BASE_URL") ?? "https://checkout.paycom.uz";

  // Payme amount is in tiyin (1/100 sum)
  const amountInTiyin = Math.round(amount * 100);

  // Generate payment URL for Payme
  const params = new URLSearchParams({
    'm': merchantId,
    'ac.order_id': orderId,
    'a': amountInTiyin.toString(),
    'c': `https://${Deno.env.get("SUPABASE_URL")?.replace('https://', '')}/functions/v1/payme-callback`,
  });

  const paymentUrl = `${baseUrl}?${params.toString()}`;

  return {
    paymentUrl,
    transactionId: `payme_${orderId}`,
  };
}

async function createClickPayment(orderId: string, amount: number) {
  const merchantId = Deno.env.get("CLICK_MERCHANT_ID") ?? "";
  const serviceId = Deno.env.get("CLICK_SERVICE_ID") ?? "";

  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: amount.toString(),
    transaction_param: orderId,
    return_url: `https://${Deno.env.get("SUPABASE_URL")?.replace('https://', '')}/functions/v1/click-callback`,
  });

  const paymentUrl = `https://my.click.uz/services/pay?${params.toString()}`;

  return {
    paymentUrl,
    transactionId: `click_${orderId}`,
  };
}

async function createUzumPayment(orderId: string, amount: number) {
  const merchantId = Deno.env.get("UZUM_MERCHANT_ID") ?? "";
  const apiKey = Deno.env.get("UZUM_API_KEY") ?? "";
  const baseUrl = Deno.env.get("UZUM_BASE_URL") ?? "https://api.uzumbank.uz/merchant/v1";

  const response = await fetch(`${baseUrl}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      merchant_id: merchantId,
      order_id: orderId,
      amount: amount,
      currency: 'UZS',
      callback_url: `https://${Deno.env.get("SUPABASE_URL")?.replace('https://', '')}/functions/v1/uzum-callback`,
    }),
  });

  const data = await response.json();

  return {
    paymentUrl: data.payment_url || '',
    transactionId: data.transaction_id || `uzum_${orderId}`,
  };
}
