import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../service/supabase";
import "../styles/Payment.css";

function Payment() {
  const [searchParams] =
    useSearchParams();

  const navigate = useNavigate();

  const orderId =
    searchParams.get("order_id");

  const [payment, setPayment] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadPayment() {
      try {
        setLoading(true);
        setError("");

        if (!orderId) {
          setError(
            "Order ID is missing."
          );
          return;
        }

        // =====================================
        // GET SAVED PAYWAY INFORMATION
        // =====================================

        const savedPayment =
          sessionStorage.getItem(
            `payway_${orderId}`
          );

        console.log(
          "Saved payment:",
          savedPayment
        );

        if (
          !savedPayment
        ) {
          setError(
            "Payment information was not found."
          );
          return;
        }

        let paymentData;

        try {
          paymentData =
            JSON.parse(
              savedPayment
            );
        } catch (parseError) {
          console.error(
            "Payment JSON error:",
            parseError
          );

          setError(
            "Invalid payment information."
          );

          return;
        }

        console.log(
          "Payment data:",
          paymentData
        );

        setPayment(
          paymentData
        );

      } catch (err) {
        console.error(
          "Payment page error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load payment."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPayment();
  }, [orderId]);

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-card">

          <div className="payment-loading">
            Loading payment...
          </div>

        </div>
      </div>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (error) {
    return (
      <div className="payment-page">
        <div className="payment-card">

          <h1>
            Payment Error
          </h1>

          <div className="payment-error">
            {error}
          </div>

          <button
            className="payment-back-button"
            onClick={() =>
              navigate("/products")
            }
          >
            Continue Shopping
          </button>

        </div>
      </div>
    );
  }

  // =========================================
  // NO PAYMENT
  // =========================================

  if (!payment) {
    return (
      <div className="payment-page">
        <div className="payment-card">

          <h1>
            Payment Not Found
          </h1>

          <button
            className="payment-back-button"
            onClick={() =>
              navigate("/products")
            }
          >
            Continue Shopping
          </button>

        </div>
      </div>
    );
  }

  // =========================================
  // QR CODE
  // =========================================

  const qrImage =
    payment.qrImage || "";

  return (
    <div className="payment-page">

      <div className="payment-card">

        <div className="payment-header">

          <h1>
            Complete Payment
          </h1>

          <p>
            Scan the QR code to pay
          </p>

        </div>

        {/* ===================================
            ORDER
        =================================== */}

        <div className="payment-order">

          <span>
            Order
          </span>

          <strong>
            #{orderId}
          </strong>

        </div>

        {/* ===================================
            QR CODE
        =================================== */}

        {qrImage ? (
          <div className="payment-qr">

            <img
              src={qrImage}
              alt="PayWay QR Code"
            />

          </div>
        ) : (
          <div className="payment-no-qr">

            <p>
              QR code was not returned by PayWay.
            </p>

            <p>
              Please check the browser console
              for the PayWay response.
            </p>

          </div>
        )}

        {/* ===================================
            TRANSACTION ID
        =================================== */}

        {payment.tranId && (
          <div className="payment-transaction">

            <span>
              Transaction ID
            </span>

            <strong>
              {payment.tranId}
            </strong>

          </div>
        )}

        {/* ===================================
            ACTIONS
        =================================== */}

        <button
          className="payment-back-button"
          onClick={() =>
            navigate("/products")
          }
        >
          Continue Shopping
        </button>

      </div>

    </div>
  );
}

export default Payment;