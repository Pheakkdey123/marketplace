import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabase";
import "../styles/Home.css";
function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id")
        .limit(3);

      if (!error) {
        setProducts(data);
      }

      setLoading(false);
    }

    loadProducts();
  }, []);

  return (
    <div className="home">
      <Navbar />

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <p className="hero-small">
            WELCOME TO OUR MARKETPLACE
          </p>

          <h1>
            Find products
            <br />
            you love.
          </h1>

          <p className="hero-description">
            Discover great products at simple and affordable prices.
          </p>

          <Link
            to="/products"
            className="hero-button"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="featured">
        <div className="section-header">
          <div>
            <p className="section-small">
              OUR COLLECTION
            </p>

            <h2>Featured Products</h2>
          </div>

          <Link
            to="/products"
            className="view-all"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <div
                className="product-card"
                key={product.id}
              >
                <Link
                  to={`/products/${product.id}`}
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="product-image"
                  />
                </Link>

                <div className="product-info">
                  <p className="product-category">
                    {product.category}
                  </p>

                  <h3>{product.name}</h3>

                  <p className="product-price">
                    ${Number(product.price).toFixed(2)}
                  </p>

                  <Link
                    to={`/products/${product.id}`}
                    className="product-button"
                  >
                    View Product
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;