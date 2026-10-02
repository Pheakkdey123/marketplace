
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../service/supabase";
import { useCart } from "../context/CartContext";
import "../styles/Checkout.css";

function Checkout() {
  const navigate = useNavigate();
  const { cart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Calculate total using variant price
  const total = cart.reduce((sum, item) => {
    const price = Number(
      item.variant_price ??
      item.price ??
      0
    );

    return (
      sum +
      price * Number(item.quantity)
    );
  }, 0);

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

      // 2. Check cart
      if (!cart || cart.length === 0) {
        setError("Your cart is empty.");
        return;
      }

      // 3. Prepare cart items
      //
      // Send variant_id when available.
      // Keep product_id for compatibility
      // with the existing order system.
      const items = cart.map((item) => ({
        product_id: Number(item.id),
        variant_id: item.variant_id
          ? Number(item.variant_id)
          : null,
        quantity: Number(item.quantity),
      }));

      console.log(
        "Checkout items:",
        items
      );

      // 4. Create pending order in Supabase
      const {
        data: orderId,
        error: orderError,
      } = await supabase.rpc("create_order", {
        p_items: items,
      });

      if (orderError) {
        console.error(
          "Create order error:",
          orderError
        );

        setError(
          orderError.message ||
            "Unable to create order."
        );

        return;
      }

      if (!orderId) {
        setError("Order was not created.");
        return;
      }

      console.log(
        "Created order:",
        orderId
      );

      // 5. Get current session/access token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Your login session has expired."
        );

        return;
      }

      // 6. Ask Supabase to create PayWay payment
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
       * PayWay "code 00" means the payment
       * request was successfully created.
       *
       * It does NOT mean the customer has paid.
       */

      // 7. Get PayWay QR image
      const qrImage =
        paymentData.qrImage ||
        paymentData.qr_image ||
        "";

      // 8. Save PayWay information
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

      // 9. Do NOT clear cart yet.
      //
      // Payment has not been confirmed.

      // 10. Go to payment page
      navigate(
        `/payment?order_id=${orderId}`
      );
    } catch (err) {
      console.error(
        "Checkout error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  // Empty cart
  if (!cart || cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <h1>Your Cart Is Empty</h1>

          <button
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

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        <h1>Checkout</h1>

        <div className="checkout-items">
          {cart.map((item) => {
            const price = Number(
              item.variant_price ??
              item.price ??
              0
            );

            return (
              <div
                className="checkout-item"
                key={`${item.id}-${item.variant_id}`}
              >
                <div>
                  <strong>
                    {item.name}
                  </strong>

                  {item.variant_name && (
                    <p>
                      Variant:{" "}
                      <strong>
                        {item.variant_name}
                      </strong>
                    </p>
                  )}

                  {item.variant_sku && (
                    <p>
                      SKU:{" "}
                      {item.variant_sku}
                    </p>
                  )}

                  <p>
                    ${price.toFixed(2)} ×{" "}
                    {item.quantity}
                  </p>
                </div>

                <strong>
                  $
                  {(
                    price *
                    Number(item.quantity)
                  ).toFixed(2)}
                </strong>
              </div>
            );
          })}
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
          onClick={() =>
            navigate("/cart")
          }
          disabled={loading}
        >
          Back to Cart
        </button>
      </div>
    </div>
  );
}

export default Checkout;

