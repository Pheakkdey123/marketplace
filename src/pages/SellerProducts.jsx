import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../service/supabase";
import "../styles/SellerProducts.css";

function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("Please log in first.");
        return;
      }

      const { data, error: productError } = await supabase
        .from("products")
        .select(`
          id,
          seller_id,
          name,
          description,
          price,
          image_url,
          is_active,
          created_at
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (productError) {
        throw productError;
      }

      setProducts(data || []);
    } catch (err) {
      console.error("SellerProducts error:", err);
      setError(err.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      setProducts((current) =>
        current.filter((product) => product.id !== id)
      );
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="seller-products-page">
        <div className="seller-products-center">
          <div className="seller-products-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-products-page">
      <div className="seller-products-container">

        <div className="seller-products-header">
          <div>
            <h1>My Products</h1>
            <p>Manage your products</p>
          </div>

          <Link
            to="/seller/products/new"
            className="seller-add-product-button"
          >
            + Add Product
          </Link>
        </div>

        {error && (
          <div className="seller-products-error">
            <h3>Unable to load products</h3>

            <p>{error}</p>

            <button onClick={loadProducts}>
              Try Again
            </button>
          </div>
        )}

        {!error && products.length === 0 && (
          <div className="seller-products-empty">
            <h2>No products yet</h2>

            <p>
              You haven't added any products yet.
            </p>

            <Link
              to="/seller/products/new"
              className="seller-add-product-button"
            >
              + Add Your First Product
            </Link>
          </div>
        )}

        {!error && products.length > 0 && (
          <div className="seller-products-grid">

            {products.map((product) => (
              <div
                key={product.id}
                className="seller-product-card"
              >

                <div className="seller-product-image">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                    />
                  ) : (
                    <span>No Image</span>
                  )}
                </div>

                <div className="seller-product-info">

                  <h2>{product.name}</h2>

                  <p className="seller-product-description">
                    {product.description ||
                      "No description"}
                  </p>

                  <div className="seller-product-price">
                    ${Number(product.price || 0).toFixed(2)}
                  </div>

                  <div className="seller-product-status">
                    <span
                      className={
                        product.is_active
                          ? "status-active"
                          : "status-inactive"
                      }
                    >
                      {product.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  <div className="seller-product-actions">

                    <Link
                      to={`/products/${product.id}`}
                      className="seller-view-button"
                    >
                      View
                    </Link>

                    <button
                      onClick={() =>
                        deleteProduct(product.id)
                      }
                      className="seller-delete-button"
                    >
                      Delete
                    </button>

                  </div>

                </div>
              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}

export default SellerProducts;