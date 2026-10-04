import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../service/supabase";
import { useCart } from "../context/CartContext";
import "../styles/Checkout.css";

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { cart } = useCart();

  // =========================================
  // BUY NOW ITEM
  // =========================================

  const buyNowItem =
    location.state?.buyNowItem || null;

  // =========================================
  // CHECKOUT ITEMS
  // =========================================

  const checkoutItems = buyNowItem
    ? [buyNowItem]
    : cart;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================
  // CALCULATE TOTAL
  // =========================================

  const total = checkoutItems.reduce(
    (sum, item) => {
      const price = Number(
        item.variant_price ??
          item.price ??
          0
      );

      return (
        sum +
        price * Number(item.quantity || 1)
      );
    },
    0
  );

  // =========================================
  // PAYMENT
  // =========================================

  async function handlePayment() {
    try {
      setLoading(true);
      setError("");

      // =======================================
      // 1. CHECK LOGGED-IN USER
      // =======================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate(
          "/login?redirect=/checkout"
        );
        return;
      }

      // =======================================
      // 2. CHECK CHECKOUT ITEMS
      // =======================================

      if (
        !checkoutItems ||
        checkoutItems.length === 0
      ) {
        setError(
          "Your cart is empty."
        );
        return;
      }

      // =======================================
      // 3. PREPARE ORDER ITEMS
      // =======================================

      const items =
        checkoutItems.map(
          (item) => ({
            product_id:
              Number(item.id),

            variant_id:
              item.variant_id
                ? Number(
                    item.variant_id
                  )
                : null,

            product_name:
              item.name,

            quantity:
              Number(
                item.quantity || 1
              ),
          })
        );

      console.log(
        "Checkout items:",
        items
      );

      // =======================================
      // 4. CREATE PENDING ORDER
      // =======================================

      const {
        data: orderId,
        error: orderError,
      } = await supabase.rpc(
        "create_order",
        {
          p_items: items,
        }
      );

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
        setError(
          "Order was not created."
        );

        return;
      }

      console.log(
        "Created order:",
        orderId
      );

      // =======================================
      // 5. GET SESSION
      // =======================================

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        setError(
          "Your login session has expired."
        );

        return;
      }

      console.log(
        "User session found."
      );

      // =======================================
      // 6. CREATE PAYWAY PAYMENT
      // =======================================

      console.log(
        "Calling create-payment..."
      );

      const {
        data: paymentData,
        error: paymentError,
      } =
        await supabase.functions.invoke(
          "create-payment",
          {
            body: {
              order_id: orderId,
            },

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      // =======================================
      // 7. HANDLE EDGE FUNCTION ERROR
      // =======================================

      if (paymentError) {
        console.error(
          "Create payment error:",
          paymentError
        );

        console.error(
          "Payment error name:",
          paymentError.name
        );

        console.error(
          "Payment error message:",
          paymentError.message
        );

        console.error(
          "Payment error context:",
          paymentError.context
        );

        let errorMessage =
          paymentError.message ||
          "Unable to create PayWay payment.";

        // Try to read actual response
        try {
          if (
            paymentError.context
          ) {
            const response =
              paymentError.context;

            const responseText =
              await response.text();

            console.error(
              "Edge Function response:",
              responseText
            );

            if (responseText) {
              try {
                const responseJson =
                  JSON.parse(
                    responseText
                  );

                console.error(
                  "Edge Function JSON:",
                  responseJson
                );

                errorMessage =
                  responseJson.error ||
                  responseJson.message ||
                  errorMessage;

              } catch {
                errorMessage =
                  responseText;
              }
            }
          }
        } catch (readError) {
          console.error(
            "Could not read Edge Function error:",
            readError
          );
        }

        setError(
          errorMessage
        );

        return;
      }

      // =======================================
      // 8. SHOW PAYWAY RESPONSE
      // =======================================

      console.log(
        "PayWay response:",
        paymentData
      );

      // =======================================
      // 9. CHECK PAYMENT SUCCESS
      // =======================================

      if (
        !paymentData?.success
      ) {
        const paymentMessage =
          paymentData?.error ||
          "PayWay payment could not be created.";

        console.error(
          "PayWay returned an error:",
          paymentData
        );

        setError(
          paymentMessage
        );

        return;
      }

      // =======================================
      // 10. GET QR IMAGE
      // =======================================

      const qrImage =
        paymentData.qrImage ||
        paymentData.qr_image ||
        "";

      console.log(
        "QR Image:",
        qrImage
      );

      // =======================================
      // 11. GET TRANSACTION ID
      // =======================================

      const tranId =
        paymentData.status
          ?.tran_id ||
        paymentData.tran_id ||
        "";

      console.log(
        "Transaction ID:",
        tranId
      );

      // =======================================
      // 12. SAVE PAYMENT INFORMATION
      // =======================================

      sessionStorage.setItem(
        `payway_${orderId}`,
        JSON.stringify({
          orderId,

          qrImage,

          tranId,
        })
      );

      console.log(
        "PayWay information saved."
      );

      // =======================================
      // 13. GO TO PAYMENT PAGE
      // =======================================

      navigate(
        `/payment?order_id=${orderId}`
      );

    } catch (err) {
      // =======================================
      // GENERAL ERROR
      // =======================================

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

  // =========================================
  // EMPTY CHECKOUT
  // =========================================

  if (
    !checkoutItems ||
    checkoutItems.length === 0
  ) {
    return (
      <div className="checkout-page">
        <div className="checkout-card">

          <h1>
            Your Cart Is Empty
          </h1>

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

  // =========================================
  // CHECKOUT UI
  // =========================================

  return (
    <div className="checkout-page">

      <div className="checkout-card">

        <h1>
          Checkout
        </h1>

        {/* ===================================
            BUY NOW INDICATOR
        =================================== */}

        {buyNowItem && (
          <div className="checkout-buy-now">
            Buy Now
          </div>
        )}

        {/* ===================================
            ITEMS
        =================================== */}

        <div className="checkout-items">

          {checkoutItems.map(
            (item) => {

              const price =
                Number(
                  item.variant_price ??
                    item.price ??
                    0
                );

              const quantity =
                Number(
                  item.quantity || 1
                );

              return (
                <div
                  className="checkout-item"
                  key={`${item.id}-${item.variant_id || "default"}`}
                >

                  <div>

                    <strong>
                      {item.name}
                    </strong>

                    {item.variant_name && (
                      <p>
                        Variant:{" "}
                        <strong>
                          {
                            item.variant_name
                          }
                        </strong>
                      </p>
                    )}

                    {(
                      item.variant_sku ||
                      item.sku
                    ) && (
                      <p>
                        SKU:{" "}
                        {
                          item.variant_sku ||
                          item.sku
                        }
                      </p>
                    )}

                    <p>
                      $
                      {price.toFixed(2)}
                      {" "}×{" "}
                      {quantity}
                    </p>

                  </div>

                  <strong>
                    $
                    {(
                      price *
                      quantity
                    ).toFixed(2)}
                  </strong>

                </div>
              );
            }
          )}

        </div>

        {/* ===================================
            TOTAL
        =================================== */}

        <div className="checkout-total">

          <span>
            Total
          </span>

          <strong>
            ${total.toFixed(2)}
          </strong>

        </div>

        {/* ===================================
            ERROR
        =================================== */}

        {error && (
          <div className="checkout-error">
            {error}
          </div>
        )}

        {/* ===================================
            PAY BUTTON
        =================================== */}

        <button
          className="checkout-pay-button"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading
            ? "Creating Payment..."
            : `Pay $${total.toFixed(2)}`}
        </button>

        {/* ===================================
            BACK BUTTON
        =================================== */}

        <button
          className="checkout-back-button"
          onClick={() =>
            buyNowItem
              ? navigate(
                  `/products/${buyNowItem.id}`
                )
              : navigate("/cart")
          }
          disabled={loading}
        >
          {buyNowItem
            ? "Back to Product"
            : "Back to Cart"}
        </button>

      </div>

    </div>
  );
}

export default Checkout;