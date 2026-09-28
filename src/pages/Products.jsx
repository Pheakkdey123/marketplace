
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import "../styles/Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load products error:", error);
        setError(error.message);
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    }

    loadProducts();
  }, []);

  return (
    <div className="products-page">
      <Navbar />

      <main className="products-content">
        <div className="products-header">
          <p className="products-small">OUR PRODUCTS</p>

          <h1>All Products</h1>

          <p className="products-description">
            Browse our collection and find something you like.
          </p>
        </div>

        {loading && (
          <div className="products-status">
            <p>Loading products...</p>
          </div>
        )}

        {error && !loading && (
          <div className="products-error">
            <p>Unable to load products.</p>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="products-status">
            <p>No products available.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Products;

