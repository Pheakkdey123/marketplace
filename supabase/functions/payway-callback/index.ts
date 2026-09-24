
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYWAY_CHECK_URL =
  "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-payway-hmac-sha512",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

function jsonResponse(
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

function formatReqTime() {
  const now = new Date();

  const yyyy =
    now.getUTCFullYear();

  const MM =
    String(now.getUTCMonth() + 1)
      .padStart(2, "0");

  const dd =
    String(now.getUTCDate())
      .padStart(2, "0");

  const HH =
    String(now.getUTCHours())
      .padStart(2, "0");

  const mm =
    String(now.getUTCMinutes())
      .padStart(2, "0");

  const ss =
    String(now.getUTCSeconds())
      .padStart(2, "0");

  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

async function createHmacSha512(
  value: string,
  secret: string
) {
  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-512",
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value)
    );

  const bytes =
    new Uint8Array(signature);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function verifyHmacSha512(
  value: string,
  secret: string,
  receivedHash: string
) {
  const expectedHash =
    await createHmacSha512(
      value,
      secret
    );

  if (
    expectedHash.length !==
    receivedHash.length
  ) {
    return false;
  }

  let result = 0;

  for (
    let i = 0;
    i < expectedHash.length;
    i++
  ) {
    result |=
      expectedHash.charCodeAt(i) ^
      receivedHash.charCodeAt(i);
  }

  return result === 0;
}

serve(async (req: Request) => {
  try {
    // ------------------------------------------
    // CORS
    // ------------------------------------------

    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }

    // ------------------------------------------
    // POST only
    // ------------------------------------------

    if (req.method !== "POST") {
      return jsonResponse(
        {
          error: "Method not allowed",
        },
        405
      );
    }

    // ------------------------------------------
    // Supabase configuration
    // ------------------------------------------

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    const merchantId =
      Deno.env.get("ABA_MERCHANT_ID");

    const apiKey =
      Deno.env.get("ABA_API_KEY");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !merchantId ||
      !apiKey
    ) {
      console.error(
        "Missing required environment variables"
      );

      return jsonResponse(
        {
          error:
            "Server configuration is incomplete",
        },
        500
      );
    }

    // ------------------------------------------
    // Read raw callback
    // ------------------------------------------

    const rawBody =
      await req.text();

    console.log(
      "PayWay callback received"
    );

    console.log(
      "Raw body:",
      rawBody
    );

    // ------------------------------------------
    // PayWay callback signature
    // ------------------------------------------

    const receivedSignature =
      req.headers.get(
        "X-PAYWAY-HMAC-SHA512"
      ) || "";

    if (!receivedSignature) {
      console.error(
        "Missing PayWay HMAC signature"
      );

      return jsonResponse(
        {
          error:
            "Missing PayWay signature",
        },
        401
      );
    }

    // ------------------------------------------
    // Parse callback JSON
    // ------------------------------------------

    let callbackData: any;

    try {
      callbackData =
        JSON.parse(rawBody);
    } catch {
      console.error(
        "Invalid callback JSON"
      );

      return jsonResponse(
        {
          error:
            "Invalid callback JSON",
        },
        400
      );
    }

    // ------------------------------------------
    // Get transaction ID
    // ------------------------------------------

    const tranId =
      callbackData?.tran_id ||
      callbackData?.status?.tran_id ||
      "";

    if (!tranId) {
      console.error(
        "Callback does not contain tran_id"
      );

      return jsonResponse(
        {
          error:
            "tran_id is missing",
        },
        400
      );
    }

    console.log(
      "PayWay transaction:",
      tranId
    );

    // ------------------------------------------
    // Verify callback HMAC
    //
    // The callback body itself is used as the
    // value for the HMAC verification.
    // ------------------------------------------

    const validSignature =
      await verifyHmacSha512(
        rawBody,
        apiKey,
        receivedSignature
      );

    if (!validSignature) {
      console.error(
        "Invalid PayWay HMAC signature"
      );

      return jsonResponse(
        {
          error:
            "Invalid PayWay signature",
        },
        401
      );
    }

    console.log(
      "PayWay HMAC verified"
    );

    // ------------------------------------------
    // Check transaction with PayWay
    // ------------------------------------------

    const reqTime =
      formatReqTime();

    /*
     * PayWay Check Transaction API hash:
     *
     * req_time + merchant_id + tran_id
     */

    const checkHashString =
      reqTime +
      merchantId +
      tranId;

    const checkHash =
      await createHmacSha512(
        checkHashString,
        apiKey
      );

    const checkRequest = {
      req_time:
        reqTime,

      merchant_id:
        merchantId,

      tran_id:
        tranId,

      hash:
        checkHash,
    };

    console.log(
      "Checking PayWay transaction..."
    );

    const paywayResponse =
      await fetch(
        PAYWAY_CHECK_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              checkRequest
            ),
        }
      );

    const responseText =
      await paywayResponse.text();

    console.log(
      "Check Transaction HTTP status:",
      paywayResponse.status
    );

    console.log(
      "Check Transaction response:",
      responseText
    );

    let paywayData: any;

    try {
      paywayData =
        JSON.parse(responseText);
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid PayWay Check Transaction response",
        },
        502
      );
    }

    // ------------------------------------------
    // Verify PayWay response
    // ------------------------------------------

    if (
      !paywayResponse.ok
    ) {
      console.error(
        "PayWay Check Transaction failed"
      );

      return jsonResponse(
        {
          error:
            "PayWay transaction check failed",
        },
        502
      );
    }

    const paymentData =
      paywayData?.data;

    const paymentStatus =
      paymentData?.payment_status;

    const paymentStatusCode =
      paymentData?.payment_status_code;

    console.log(
      "Payment status:",
      paymentStatus
    );

    console.log(
      "Payment status code:",
      paymentStatusCode
    );

    // ------------------------------------------
    // Only APPROVED payments can become paid
    // ------------------------------------------

    if (
      paymentStatusCode !== 0 ||
      paymentStatus !== "APPROVED"
    ) {
      console.log(
        "Payment is not approved."
      );

      return jsonResponse({
        received: true,
        paid: false,
        tran_id: tranId,
        payment_status:
          paymentStatus || null,
        payment_status_code:
          paymentStatusCode ?? null,
      });
    }

    // ------------------------------------------
    // Create Supabase admin client
    // ------------------------------------------

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    // ------------------------------------------
    // Find order by PayWay transaction ID
    // ------------------------------------------

    const {
      data: order,
      error: orderError,
    } =
      await supabase
        .from("orders")
        .select(
          "id, user_id, status, total, payment_reference"
        )
        .eq(
          "payment_reference",
          tranId
        )
        .maybeSingle();

    if (orderError) {
      console.error(
        "Order lookup failed:",
        orderError
      );

      return jsonResponse(
        {
          error:
            "Unable to find order",
        },
        500
      );
    }

    if (!order) {
      console.error(
        "No order found for transaction:",
        tranId
      );

      return jsonResponse(
        {
          error:
            "Order not found",
          tran_id:
            tranId,
        },
        404
      );
    }

    console.log(
      "Order found:",
      order.id
    );

    // ------------------------------------------
    // Idempotency
    // ------------------------------------------

    if (
      order.status === "paid" ||
      order.status === "processing" ||
      order.status === "shipped" ||
      order.status === "completed"
    ) {
      console.log(
        "Order already paid/processed:",
        order.id
      );

      return jsonResponse({
        received: true,
        paid: true,
        already_processed: true,
        order_id:
          order.id,
        tran_id:
          tranId,
      });
    }

    // ------------------------------------------
    // Verify amount
    // ------------------------------------------

    const orderTotal =
      Number(order.total);

    const paidAmount =
      Number(
        paymentData?.payment_amount
      );

    if (
      !Number.isFinite(paidAmount) ||
      paidAmount !== orderTotal
    ) {
      console.error(
        "Payment amount mismatch",
        {
          orderTotal,
          paidAmount,
        }
      );

      return jsonResponse(
        {
          error:
            "Payment amount does not match order",
        },
        400
      );
    }

    // ------------------------------------------
    // Mark order as paid
    // ------------------------------------------

    const {
      data: updatedOrder,
      error: updateError,
    } =
      await supabase
        .from("orders")
        .update({
          status:
            "paid",

          payment_method:
            "payway",

          payment_reference:
            tranId,

          paid_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          order.id
        )
        .eq(
          "status",
          "pending"
        )
        .select()
        .single();

    if (updateError) {
      console.error(
        "Order update failed:",
        updateError
      );

      return jsonResponse(
        {
          error:
            "Unable to update order",
        },
        500
      );
    }

    console.log(
      "================================"
    );

    console.log(
      "PAYMENT APPROVED"
    );

    console.log(
      "Order:",
      updatedOrder.id
    );

    console.log(
      "Transaction:",
      tranId
    );

    console.log(
      "Amount:",
      paidAmount
    );

    console.log(
      "================================"
    );

    // ------------------------------------------
    // Success
    // ------------------------------------------

    return jsonResponse({
      received: true,

      paid: true,

      order_id:
        updatedOrder.id,

      tran_id:
        tranId,

      payment_status:
        "APPROVED",
    });
  } catch (error) {
    console.error(
      "payway-callback error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      500
    );
  }
});

