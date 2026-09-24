import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import { supabase } from "../services/supabase";
import "../styles/Home.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id");

      if (error) {
        setError(error.message);
      } else {
        setProducts(data);
      }

      setLoading(false);
    }

    loadProducts();
  }, []);

  return (
    <div className="home">
      <Navbar />

      <main className="featured">
        <div className="section-header">
          <div>
            <p className="section-small">OUR STORE</p>
            <h1>All Products</h1>
          </div>
        </div>

        {loading && <p>Loading products...</p>}

        {error && <p>{error}</p>}

        {!loading && !error && (
          <div className="product-grid">
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