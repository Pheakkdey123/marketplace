
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYWAY_QR_URL =
  "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/generate-qr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function formatReqTime() {
  const now = new Date();

  const yyyy = now.getUTCFullYear();
  const MM = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const HH = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");

  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

function base64Encode(value: string) {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function createHmacSha512(
  value: string,
  secret: string
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  const bytes = new Uint8Array(signature);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return jsonResponse(
        {
          error: "Method not allowed",
        },
        405
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        {
          error: "Missing authorization",
        },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(
        {
          error: "Supabase configuration is missing",
        },
        500
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: "You must be logged in",
        },
        401
      );
    }

    const body = await req.json();

    const orderId = Number(body.order_id);

    if (!orderId) {
      return jsonResponse(
        {
          error: "order_id is required",
        },
        400
      );
    }

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, total"
      )
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      console.error(
        "Order lookup failed:",
        orderError
      );

      return jsonResponse(
        {
          error: "Order not found",
        },
        404
      );
    }

    if (order.status !== "pending") {
      return jsonResponse(
        {
          error:
            "This order is not available for payment",
        },
        400
      );
    }

    const {
      data: orderItems,
      error: itemsError,
    } = await supabase
      .from("order_items")
      .select(`
        quantity,
        price,
        products (
          name
        )
      `)
      .eq("order_id", orderId);

    if (itemsError) {
      return jsonResponse(
        {
          error: itemsError.message,
        },
        500
      );
    }

    if (!orderItems || orderItems.length === 0) {
      return jsonResponse(
        {
          error: "Order has no items",
        },
        400
      );
    }

    const items = orderItems.map(
      (item: any) => ({
        name:
          item.products?.name ||
          "Product",
        quantity: Number(item.quantity),
        price: Number(item.price),
      })
    );

    const itemsBase64 = base64Encode(
      JSON.stringify(items)
    );

    const merchantId =
      Deno.env.get("ABA_MERCHANT_ID");

    const apiKey =
      Deno.env.get("ABA_API_KEY");

    if (!merchantId || !apiKey) {
      return jsonResponse(
        {
          error:
            "ABA PayWay credentials are not configured",
        },
        500
      );
    }

    const supabaseServiceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!supabaseServiceRoleKey) {
      return jsonResponse(
        {
          error:
            "Supabase service role key is not configured",
        },
        500
      );
    }

    const appBaseUrl =
      Deno.env.get("APP_BASE_URL");

    if (!appBaseUrl) {
      return jsonResponse(
        {
          error:
            "APP_BASE_URL is not configured",
        },
        500
      );
    }

    const reqTime = formatReqTime();

    const tranId =
      `ORD${orderId}${Date.now()}`;

    const amount =
      Number(order.total).toFixed(2);

    const firstname =
      user.user_metadata?.first_name ||
      user.user_metadata?.firstname ||
      "";

    const lastname =
      user.user_metadata?.last_name ||
      user.user_metadata?.lastname ||
      "";

    const email =
      user.email || "";

    const phone =
      user.user_metadata?.phone || "";

    const purchaseType =
      "purchase";

    const paymentOption =
      "abapay_khqr";

    const currency =
      "USD";

    const callbackUrl =
      `${supabaseUrl}/functions/v1/payway-callback`;

    const callbackUrlBase64 =
      base64Encode(callbackUrl);

    const returnParams =
      JSON.stringify({
        order_id: orderId,
      });

    const returnDeeplink = "";
    const customFields = "";
    const payout = "";
    const lifetime = 15;

    const qrImageTemplate =
      "template3_color";

    const hashString =
      reqTime +
      merchantId +
      tranId +
      amount +
      itemsBase64 +
      firstname +
      lastname +
      email +
      phone +
      purchaseType +
      paymentOption +
      callbackUrlBase64 +
      returnDeeplink +
      currency +
      customFields +
      returnParams +
      payout +
      lifetime +
      qrImageTemplate;

    const hash =
      await createHmacSha512(
        hashString,
        apiKey
      );

    const paywayRequest = {
      req_time: reqTime,
      merchant_id: merchantId,
      tran_id: tranId,

      first_name: firstname,
      last_name: lastname,

      email,
      phone,

      amount,

      purchase_type:
        purchaseType,

      payment_option:
        paymentOption,

      items:
        itemsBase64,

      currency,

      callback_url:
        callbackUrlBase64,

      return_deeplink:
        null,

      custom_fields:
        null,

      return_params:
        returnParams,

      payout:
        null,

      lifetime,

      qr_image_template:
        qrImageTemplate,

      hash,
    };

    const paywayResponse =
      await fetch(
        PAYWAY_QR_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              paywayRequest
            ),
        }
      );

    const responseText =
      await paywayResponse.text();

    let paywayData: any;

    try {
      paywayData =
        JSON.parse(responseText);
    } catch {
      return jsonResponse(
        {
          error:
            "PayWay returned invalid JSON",
        },
        502
      );
    }

    console.log(
      "PayWay response:",
      paywayData
    );

    if (
      !paywayResponse.ok ||
      paywayData?.status?.code !== "0"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            paywayData?.status?.message ||
            "PayWay could not create the QR payment.",
          payway_status:
            paywayData?.status || null,
        },
        400
      );
    }

    // ------------------------------------------
    // Save PayWay transaction reference
    // ------------------------------------------

    const adminSupabase =
      createClient(
        supabaseUrl,
        supabaseServiceRoleKey
      );

    const {
      error: updateError,
    } = await adminSupabase
      .from("orders")
      .update({
        payment_method:
          "payway",

        payment_reference:
          tranId,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (updateError) {
      console.error(
        "Unable to save PayWay reference:",
        updateError
      );

      return jsonResponse(
        {
          error:
            "Payment was created, but the order could not be updated.",
        },
        500
      );
    }

    console.log(
      "Saved PayWay reference:",
      tranId
    );

    return jsonResponse({
      success: true,

      order_id:
        orderId,

      tran_id:
        tranId,

      qrString:
        paywayData.qrString || "",

      qrImage:
        paywayData.qrImage || "",

      abapay_deeplink:
        paywayData.abapay_deeplink ||
        "",

      app_store:
        paywayData.app_store || "",

      play_store:
        paywayData.play_store || "",

      amount:
        paywayData.amount ??
        Number(amount),

      currency:
        paywayData.currency ||
        currency,

      status:
        paywayData.status || null,
    });
  } catch (error) {
    console.error(
      "create-payment error:",
      error
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      500
    );
  }
});

