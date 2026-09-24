import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useCart } from "../context/CartContext";
import "../styles/Checkout.css";
import "../styles/App.css";
function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  async function handlePayment() {
    try {
      setLoading(true);
      setError("");

      // 1. Check logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/login?redirect=/checkout");
        return;
      }

      if (!cart || cart.length === 0) {
        setError("Your cart is empty.");
        return;
      }

      // 2. Prepare cart items
      const items = cart.map((item) => ({
        product_id: Number(item.id),
        quantity: Number(item.quantity),
      }));

      // 3. Create pending order in Supabase
      const {
        data: orderId,
        error: orderError,
      } = await supabase.rpc("create_order", {
        p_items: items,
      });

      if (orderError) {
        console.error("Create order error:", orderError);
        setError(orderError.message);
        return;
      }

      if (!orderId) {
        setError("Order was not created.");
        return;
      }

      console.log("Created order:", orderId);

      // 4. Get current session/access token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Your login session has expired.");
        return;
      }

      // 5. Ask Supabase to create PayWay payment
      const {
        data: paymentData,
        error: paymentError,
      } = await supabase.functions.invoke(
        "create-payment",
        {
          body: {
            order_id: orderId,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (paymentError) {
        console.error(
          "Create payment error:",
          paymentError
        );

        setError(
          paymentError.message ||
            "Unable to create PayWay payment."
        );

        return;
      }

      console.log(
        "PayWay response:",
        paymentData
      );

      if (!paymentData?.success) {
        setError(
          paymentData?.error ||
            "PayWay payment could not be created."
        );

        return;
      }

      /*
       * IMPORTANT:
       *
       * PayWay "code 00" means the payment request
       * was successfully created.
       *
       * It does NOT mean the customer has paid.
       *
       * We therefore go to Payment.jsx and wait
       * for the real payment confirmation.
       */

      // 6. Store the PayWay QR image temporarily
      const qrImage =
        paymentData.qrImage ||
        paymentData.qr_image ||
        "";

      // 7. Save payment information for Payment.jsx
      sessionStorage.setItem(
        `payway_${orderId}`,
        JSON.stringify({
          orderId,
          qrImage,
          tranId:
            paymentData.status?.tran_id ||
            paymentData.tran_id ||
            "",
        })
      );

      // 8. IMPORTANT:
      // Do NOT clear the cart yet.
      //
      // The customer has not paid.
      //
      // We clear it only after payment is confirmed.

      // 9. Go to payment page
      navigate(`/payment?order_id=${orderId}`);
    } catch (err) {
      console.error("Checkout error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!cart || cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <h1>Your Cart Is Empty</h1>

          <button
            onClick={() => navigate("/products")}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        <h1>Checkout</h1>

        <div className="checkout-items">
          {cart.map((item) => (
            <div
              className="checkout-item"
              key={item.id}
            >
              <div>
                <strong>{item.name}</strong>

                <p>
                  ${Number(item.price).toFixed(2)} ×{" "}
                  {item.quantity}
                </p>
              </div>

              <strong>
                $
                {(
                  Number(item.price) *
                  Number(item.quantity)
                ).toFixed(2)}
              </strong>
            </div>
          ))}
        </div>

        <div className="checkout-total">
          <span>Total</span>

          <strong>
            ${total.toFixed(2)}
          </strong>
        </div>

        {error && (
          <div className="checkout-error">
            {error}
          </div>
        )}

        <button
          className="checkout-pay-button"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading
            ? "Creating Payment..."
            : `Pay $${total.toFixed(2)}`}
        </button>

        <button
          className="checkout-back-button"
          onClick={() => navigate("/cart")}
          disabled={loading}
        >
          Back to Cart
        </button>
      </div>
    </div>
  );
}

export default Checkout;