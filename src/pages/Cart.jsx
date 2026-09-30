
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import "../styles/Cart.css";

function Cart() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartTotal,
  } = useCart();

  // ==========================================
  // EMPTY CART
  // ==========================================

  if (cart.length === 0) {
    return (
      <div className="home">
        <Navbar />

        <main className="featured cart-page">
          <p className="section-small">
            YOUR CART
          </p>

          <h1>Your cart is empty</h1>

          <p className="cart-empty-text">
            Add some products before checking out.
          </p>

          <Link
            to="/products"
            className="hero-button"
          >
            Browse Products
          </Link>
        </main>
      </div>
    );
  }

  // ==========================================
  // CART
  // ==========================================

  return (
    <div className="home">
      <Navbar />

      <main className="featured cart-page">

        <p className="section-small">
          YOUR CART
        </p>

        <h1>Shopping Cart</h1>

        <div className="cart-list">

          {cart.map((product) => {

            const price = Number(
              product.variant_price ??
              product.price ??
              0
            );

            const stock = Number(
              product.variant_stock ??
              0
            );

            return (
              <div
                className="cart-item"
                key={`${product.id}-${product.variant_id}`}
              >

                {/* ============================
                    IMAGE
                ============================ */}

                <img
                  src={product.image_url}
                  alt={product.name}
                  className="cart-item-image"
                />

                {/* ============================
                    PRODUCT INFO
                ============================ */}

                <div className="cart-item-info">

                  <p className="section-small">
                    {product.category}
                  </p>

                  <h3>
                    {product.name}
                  </h3>

                  {/* VARIANT */}

                  {product.variant_name && (
                    <p className="cart-item-variant">
                      Variant:{" "}
                      <strong>
                        {product.variant_name}
                      </strong>
                    </p>
                  )}

                  {/* SKU */}

                  {product.variant_sku && (
                    <p className="cart-item-sku">
                      SKU:{" "}
                      {product.variant_sku}
                    </p>
                  )}

                  {/* PRICE */}

                  <p className="cart-item-price">
                    ${price.toFixed(2)}
                  </p>

                  {/* STOCK */}

                  <p className="cart-item-stock">
                    Available: {stock}
                  </p>

                  {/* ==========================
                      QUANTITY
                  ========================== */}

                  <div className="cart-quantity">

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          product.id,
                          product.variant_id,
                          product.quantity - 1
                        )
                      }
                      disabled={
                        product.quantity <= 1
                      }
                      aria-label={`Decrease ${product.name} quantity`}
                    >
                      −
                    </button>

                    <strong>
                      {product.quantity}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          product.id,
                          product.variant_id,
                          Math.min(
                            product.quantity + 1,
                            stock
                          )
                        )
                      }
                      disabled={
                        product.quantity >= stock
                      }
                      aria-label={`Increase ${product.name} quantity`}
                    >
                      +
                    </button>

                  </div>

                </div>

                {/* ============================
                    ACTIONS
                ============================ */}

                <div className="cart-item-actions">

                  <strong className="cart-item-total">
                    $
                    {(
                      price *
                      product.quantity
                    ).toFixed(2)}
                  </strong>

                  <button
                    type="button"
                    className="cart-remove"
                    onClick={() =>
                      removeFromCart(
                        product.id,
                        product.variant_id
                      )
                    }
                  >
                    Remove
                  </button>

                </div>

              </div>
            );
          })}

        </div>

        {/* ================================
            ORDER SUMMARY
        ================================= */}

        <div className="cart-summary">

          <h2>Order Summary</h2>

          <div className="cart-summary-row">

            <span>
              Total
            </span>

            <strong>
              $
              {Number(cartTotal).toFixed(2)}
            </strong>

          </div>

          <Link
            to="/checkout"
            className="cart-checkout-button"
          >
            Proceed to Checkout
          </Link>

        </div>

      </main>
    </div>
  );
}

export default Cart;

