import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import "../styles/ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setProduct(data);
      }

      setLoading(false);
    }

    loadProduct();
  }, [id]);

  const handleBuyNow = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate(
        `/login?redirect=${encodeURIComponent(
          `/products/${id}`
        )}`
      );
      return;
    }

    addToCart(product);

    navigate("/checkout");
  };

  const handleAddToCart = () => {
    addToCart(product);
  };

  if (loading) {
    return (
      <div className="home">
        <Navbar />

        <main className="featured">
          <p>Loading product...</p>
        </main>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="home">
        <Navbar />

        <main className="featured">
          <h1>Product not found</h1>

          <p>{error}</p>

          <Link to="/products">
            ← Back to products
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar />

      <main className="featured">

        <Link
          to="/products"
          className="view-all"
        >
          ← Back to products
        </Link>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "50px",
            marginTop: "30px",
          }}
        >

          {/* Product Image */}

          <img
            src={product.image_url}
            alt={product.name}
            style={{
              width: "100%",
              borderRadius: "12px",
            }}
          />

          {/* Product Information */}

          <div>

            <p className="section-small">
              {product.category}
            </p>

            <h1>{product.name}</h1>

            <h2>
              ${Number(product.price).toFixed(2)}
            </h2>

            <p>
              {product.description}
            </p>

            <p>
              Stock: {product.stock}
            </p>

            {/* Add To Cart */}

            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              style={{
                marginTop: "20px",
                marginRight: "10px",
                padding: "14px 24px",
                border: "1px solid #111",
                borderRadius: "8px",
                background: "#fff",
                color: "#111",
                cursor:
                  product.stock > 0
                    ? "pointer"
                    : "not-allowed",
                fontSize: "16px",
              }}
            >
              {product.stock > 0
                ? "Add to Cart"
                : "Out of Stock"}
            </button>

            {/* Buy Now */}

            <button
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              style={{
                marginTop: "20px",
                padding: "14px 28px",
                border: "none",
                borderRadius: "8px",
                background: "#111",
                color: "#fff",
                cursor:
                  product.stock > 0
                    ? "pointer"
                    : "not-allowed",
                fontSize: "16px",
              }}
            >
              Buy Now
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetails;