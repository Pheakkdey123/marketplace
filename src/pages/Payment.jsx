
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../service/supabase";
import "../styles/Payment.css";

function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState(null);
  const [qrImage, setQrImage] = useState("");
  const [tranId, setTranId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load order
  // --------------------------------------------------

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is missing.");
      setLoading(false);
      return;
    }

    async function loadPayment() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate(
            `/login?redirect=/payment?order_id=${orderId}`,
            { replace: true }
          );
          return;
        }

        const { data, error: orderError } = await supabase
          .from("orders")
          .select(`
            id,
            total,
            status,
            payment_method,
            payment_reference,
            paid_at
          `)
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single();

        if (orderError) {
          console.error("Order loading error:", orderError);

          setError("Unable to load order.");
          setLoading(false);
          return;
        }

        setOrder(data);

        // Already paid
        if (data.status === "paid") {
          sessionStorage.removeItem(`payway_${orderId}`);

          navigate(
            `/order-success?order_id=${orderId}`,
            { replace: true }
          );

          return;
        }

        // Load PayWay information
        const storedPayment = sessionStorage.getItem(
          `payway_${orderId}`
        );

        if (storedPayment) {
          try {
            const payment = JSON.parse(storedPayment);

            setQrImage(payment.qrImage || "");
            setTranId(payment.tranId || "");
          } catch (parseError) {
            console.error(
              "Unable to read PayWay payment:",
              parseError
            );
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Payment loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load payment."
        );

        setLoading(false);
      }
    }

    loadPayment();
  }, [orderId, navigate]);

  // --------------------------------------------------
  // Check payment status
  // --------------------------------------------------

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;

    async function checkPaymentStatus() {
      const { data, error: statusError } = await supabase
        .from("orders")
        .select(`
          id,
          total,
          status,
          payment_method,
          payment_reference,
          paid_at
        `)
        .eq("id", orderId)
        .single();

      if (cancelled) {
        return;
      }

      if (statusError) {
        console.error(
          "Payment status check error:",
          statusError
        );
        return;
      }

      setOrder(data);

      console.log(
        "Payment status:",
        data.status
      );

      if (data.status === "paid") {
        sessionStorage.removeItem(
          `payway_${orderId}`
        );

        navigate(
          `/order-success?order_id=${orderId}`,
          { replace: true }
        );
      }
    }

    // Check immediately
    checkPaymentStatus();

    // Then check every 5 seconds
    const interval = setInterval(
      checkPaymentStatus,
      5000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, navigate]);

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Loading payment...</h2>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (error) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Payment Error</h2>

          <p>{error}</p>

          <button
            onClick={() => navigate("/checkout")}
          >
            Back to Checkout
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Payment page
  // --------------------------------------------------

  if (!order) {
    return null;
  }

  return (
    <div className="payment-page">
      <div className="payment-card">

        <h1>Complete Your Payment</h1>

        <p className="payment-order">
          Order #{order.id}
        </p>

        <div className="payment-total">
          ${Number(order.total).toFixed(2)}
        </div>

        {tranId && (
          <p className="payment-reference">
            Transaction: {tranId}
          </p>
        )}

        {/* QR CODE */}

        {qrImage ? (
          <div className="payment-qr-container">

            <p>
              Scan this QR code with{" "}
              <strong>ABA Mobile</strong>{" "}
              to pay.
            </p>

            <img
              src={qrImage}
              alt="ABA PayWay QR Code"
              className="payment-qr"
            />

            <p className="payment-instruction">
              After completing the payment,
              please wait while we verify your
              transaction.
            </p>

          </div>
        ) : (
          <div className="payment-waiting">
            <p>
              PayWay QR code is not available.
            </p>

            <small>
              Please return to checkout and try
              again.
            </small>
          </div>
        )}

        {/* PAYMENT STATUS */}

        {order.status === "pending" && (
          <div className="payment-status">

            <div className="payment-spinner"></div>

            <p>
              Waiting for payment confirmation...
            </p>

            <small>
              We automatically check your payment
              status every 5 seconds.
            </small>

          </div>
        )}

        {order.status === "paid" && (
          <div className="payment-status">
            <p>
              Payment confirmed. Redirecting...
            </p>
          </div>
        )}

        {/* BACK BUTTON */}

        {order.status === "pending" && (
          <button
            className="payment-cancel"
            onClick={() => navigate("/checkout")}
          >
            Back to Checkout
          </button>
        )}

      </div>
    </div>
  );
}

export default Payment;

