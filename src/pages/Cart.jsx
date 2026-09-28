
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

  return (
    <div className="home">
      <Navbar />

      <main className="featured cart-page">
        <p className="section-small">
          YOUR CART
        </p>

        <h1>Shopping Cart</h1>

        <div className="cart-list">
          {cart.map((product) => (
            <div
              className="cart-item"
              key={product.id}
            >
              <img
                src={product.image}
                alt={product.name}
                className="cart-item-image"
              />

              <div className="cart-item-info">
                <p className="section-small">
                  {product.category}
                </p>

                <h3>{product.name}</h3>

                <p className="cart-item-price">
                  ${product.price.toFixed(2)}
                </p>

                <div className="cart-quantity">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        product.id,
                        product.quantity - 1
                      )
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
                        product.quantity + 1
                      )
                    }
                    aria-label={`Increase ${product.name} quantity`}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="cart-item-actions">
                <strong className="cart-item-total">
                  $
                  {(
                    product.price *
                    product.quantity
                  ).toFixed(2)}
                </strong>

                <button
                  type="button"
                  className="cart-remove"
                  onClick={() =>
                    removeFromCart(product.id)
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>

          <div className="cart-summary-row">
            <span>Total</span>

            <strong>
              ${cartTotal.toFixed(2)}
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

