import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../service/supabase";
import Navbar from "../components/Navbar";
import "../styles/Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        is_active,
        created_at,
        category_id,
        categories (
          id,
          name
        ),
        product_images (
          id,
          image_url,
          alt_text,
          sort_order,
          is_primary
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Load products error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  function getProductImage(product) {
    if (
      product.product_images &&
      product.product_images.length > 0
    ) {
      const primaryImage = product.product_images.find(
        (image) => image.is_primary
      );

      if (primaryImage) {
        return primaryImage.image_url;
      }

      const sortedImages = [...product.product_images].sort(
        (a, b) => a.sort_order - b.sort_order
      );

      return sortedImages[0]?.image_url || product.image_url;
    }

    return product.image_url;
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="products-page">
          <div className="products-loading">
            <div className="loading-spinner"></div>
            <p>Loading products...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="products-page">
          <div className="products-error">
            <h2>Unable to load products.</h2>
            <p>{error}</p>

            <button onClick={loadProducts}>
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="products-page">
      <div className="products-container">

        {/* Header */}
        <div className="products-header">
          <div>
            <h1>Products</h1>
            <p>
              Discover products from our marketplace.
            </p>
          </div>

          <span className="product-count">
            {products.length}{" "}
            {products.length === 1 ? "product" : "products"}
          </span>
        </div>

        {/* Empty */}
        {products.length === 0 ? (
          <div className="products-empty">
            <h2>No products available</h2>
            <p>
              There are currently no products available.
            </p>
          </div>
        ) : (
          <div className="products-grid">

            {products.map((product) => {
              const image = getProductImage(product);

              return (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="product-card"
                >
                  {/* Image */}
                  <div className="product-image-container">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="product-image"
                      />
                    ) : (
                      <div className="product-image-placeholder">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Information */}
                  <div className="product-info">

                    <div className="product-category">
                      {product.categories?.name || "Uncategorized"}
                    </div>

                    <h2>{product.name}</h2>

                    {product.description && (
                      <p className="product-description">
                        {product.description}
                      </p>
                    )}

                    <div className="product-bottom">
                      <span className="product-price">
                        ${Number(product.price).toFixed(2)}
                      </span>

                      <span className="view-product">
                        View →
                      </span>
                    </div>

                  </div>
                </Link>
              );
            })}

          </div>
        )}

      </div>
      </div>
    </>
  );
}

export default Products;