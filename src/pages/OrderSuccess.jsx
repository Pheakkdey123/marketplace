import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { supabase } from "../services/supabase";
import Navbar from "../components/Navbar";
import "../styles/OrderSuccess.css";

function OrderSuccess() {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("order_id");

  const [status, setStatus] = useState("checking");
  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      setMessage("Order ID is missing.");
      return;
    }

    let cancelled = false;

    async function checkOrder() {
      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Please sign in to view this order."
          );
        }
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("orders")
        .select(
          "id, status, total, payment_method, payment_reference, paid_at, created_at"
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "Order could not be found."
          );
        }
        return;
      }

      if (cancelled) return;

      setOrder(data);

      if (data.status === "paid") {
        setStatus("paid");
        return;
      }

      // Payment may still be processing.
      setStatus("processing");
    }

    checkOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // --------------------------------------------------
  // Poll while payment is being verified
  // --------------------------------------------------

  useEffect(() => {
    if (
      !orderId ||
      status !== "processing"
    ) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const checkAgain = async () => {
      if (cancelled) return;

      attempts++;

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) return;

      const {
        data,
      } = await supabase
        .from("orders")
        .select(
          "id, status, total, payment_method, payment_reference, paid_at, created_at"
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (cancelled || !data) {
        return;
      }

      setOrder(data);

      if (data.status === "paid") {
        setStatus("paid");
        return;
      }

      // Stop checking after about 60 seconds.
      if (attempts >= 12) {
        setStatus("processing");
      }
    };

    const interval = setInterval(
      checkAgain,
      5000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, status]);

  // --------------------------------------------------
  // Missing / error
  // --------------------------------------------------

  if (status === "error") {
    return (
      <div className="home">
        <Navbar />

        <main
          className="featured"
          style={{
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          <p className="section-small">
            ORDER
          </p>

          <h1>Unable to verify order</h1>

          <p
            style={{
              fontSize: "18px",
              color: "#666",
              marginTop: "15px",
            }}
          >
            {message}
          </p>

          <Link
            to="/orders"
            className="hero-button"
            style={{
              display: "inline-block",
              marginTop: "30px",
              textDecoration: "none",
            }}
          >
            View My Orders
          </Link>
        </main>
      </div>
    );
  }

  // --------------------------------------------------
  // Checking
  // --------------------------------------------------

  if (status === "checking") {
    return (
      <div className="home">
        <Navbar />

        <main
          className="featured"
          style={{
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          <p className="section-small">
            PAYMENT
          </p>

          <h1>Checking Payment...</h1>

          <p
            style={{
              fontSize: "18px",
              color: "#666",
              marginTop: "15px",
            }}
          >
            Please wait while we verify
            your payment.
          </p>
        </main>
      </div>
    );
  }

  // --------------------------------------------------
  // Payment processing
  // --------------------------------------------------

  if (status === "processing") {
    return (
      <div className="home">
        <Navbar />

        <main
          className="featured"
          style={{
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          <p className="section-small">
            PAYMENT PROCESSING
          </p>

          <h1>Payment is being verified</h1>

          <p
            style={{
              fontSize: "18px",
              color: "#666",
              marginTop: "15px",
              lineHeight: 1.6,
            }}
          >
            Your payment was sent to ABA PayWay.
            We are waiting for confirmation.
          </p>

          {orderId && (
            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid #eee",
              }}
            >
              <p className="section-small">
                ORDER NUMBER
              </p>

              <h2>
                #{orderId}
              </h2>

              <p
                style={{
                  marginTop: "10px",
                  color: "#666",
                }}
              >
                Current status:{" "}
                {order?.status || "pending"}
              </p>
            </div>
          )}

          <div
            style={{
              marginTop: "30px",
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/orders"
              className="hero-button"
              style={{
                textDecoration: "none",
              }}
            >
              View My Orders
            </Link>

            <Link
              to="/products"
              style={{
                display: "inline-block",
                padding: "13px 24px",
                border: "1px solid #111",
                color: "#111",
                textDecoration: "none",
                borderRadius: "8px",
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------
  // PAID
  // --------------------------------------------------

  return (
    <div className="home">
      <Navbar />

      <main
        className="featured"
        style={{
          textAlign: "center",
          maxWidth: "700px",
        }}
      >
        <p className="section-small">
          ORDER CONFIRMED
        </p>

        <h1>Thank You!</h1>

        <p
          style={{
            fontSize: "18px",
            color: "#666",
            marginTop: "15px",
          }}
        >
          Your payment was successfully
          verified.
        </p>

        <div
          style={{
            marginTop: "30px",
            padding: "25px",
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #eee",
          }}
        >
          <p className="section-small">
            ORDER NUMBER
          </p>

          <h2>
            #{order?.id}
          </h2>

          <p
            style={{
              marginTop: "15px",
              color: "#555",
            }}
          >
            Payment Status:{" "}
            <strong>PAID</strong>
          </p>

          {order?.total && (
            <p
              style={{
                marginTop: "10px",
                color: "#555",
              }}
            >
              Total:{" "}
              <strong>
                $
                {Number(
                  order.total
                ).toFixed(2)}
              </strong>
            </p>
          )}

          {order?.payment_reference && (
            <p
              style={{
                marginTop: "10px",
                color: "#777",
                fontSize: "14px",
                wordBreak: "break-all",
              }}
            >
              Payment Reference:{" "}
              {order.payment_reference}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/orders"
            className="hero-button"
            style={{
              textDecoration: "none",
            }}
          >
            View My Orders
          </Link>

          <Link
            to="/products"
            style={{
              display: "inline-block",
              padding: "13px 24px",
              border: "1px solid #111",
              color: "#111",
              textDecoration: "none",
              borderRadius: "8px",
            }}
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    </div>
  );
}

export default OrderSuccess;