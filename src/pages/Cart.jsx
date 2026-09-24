import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import "../styles/Home.css";
import "../styles/App.css";

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

        <main className="featured">
          <p className="section-small">
            YOUR CART
          </p>

          <h1>Your cart is empty</h1>

          <p>
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

      <main className="featured">

        <p className="section-small">
          YOUR CART
        </p>

        <h1>Shopping Cart</h1>

        <div
          style={{
            display: "grid",
            gap: "20px",
            marginTop: "30px",
          }}
        >

          {cart.map((product) => (
            <div
              key={product.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "100px 1fr auto",
                gap: "20px",
                alignItems: "center",
                background: "#fff",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid #eee",
              }}
            >

              {/* Image */}

              <img
                src={product.image}
                alt={product.name}
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />

              {/* Product Info */}

              <div>
                <p className="section-small">
                  {product.category}
                </p>

                <h3>
                  {product.name}
                </h3>

                <p>
                  ${product.price.toFixed(2)}
                </p>

                {/* Quantity */}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() =>
                      updateQuantity(
                        product.id,
                        product.quantity - 1
                      )
                    }
                  >
                    −
                  </button>

                  <strong>
                    {product.quantity}
                  </strong>

                  <button
                    onClick={() =>
                      updateQuantity(
                        product.id,
                        product.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Actions */}

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <strong>
                  $
                  {(
                    product.price *
                    product.quantity
                  ).toFixed(2)}
                </strong>

                <br />

                <button
                  onClick={() =>
                    removeFromCart(product.id)
                  }
                  style={{
                    marginTop: "10px",
                    border: "none",
                    background: "none",
                    color: "#c00",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>

            </div>
          ))}

        </div>

        {/* Cart Summary */}

        <div
          style={{
            marginTop: "30px",
            marginLeft: "auto",
            maxWidth: "400px",
            background: "#fff",
            padding: "25px",
            borderRadius: "12px",
            border: "1px solid #eee",
          }}
        >

          <h2>Order Summary</h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "20px",
            }}
          >
            <span>Total</span>

            <strong>
              ${cartTotal.toFixed(2)}
            </strong>
          </div>

          <Link
            to="/checkout"
            style={{
              display: "block",
              marginTop: "20px",
              padding: "14px",
              textAlign: "center",
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "8px",
            }}
          >
            Proceed to Checkout
          </Link>

        </div>

      </main>
    </div>
  );
}

export default Cart;