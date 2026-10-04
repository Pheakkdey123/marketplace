import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../service/supabase";
import Navbar from "../components/Navbar";
import "../styles/Products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const [
        { data: productData, error: productError },
        { data: categoryData, error: categoryError },
      ] = await Promise.all([
        supabase
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
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("categories")
          .select(`
            id,
            name,
            description,
            image_url,
            is_active
          `)
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),
      ]);

      if (productError) {
        throw productError;
      }

      if (categoryError) {
        throw categoryError;
      }

      setProducts(productData || []);
      setCategories(categoryData || []);
    } catch (err) {
      console.error("Load products error:", err);

      setError(
        err.message || "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    GET BEST PRODUCT IMAGE
  */

  function getProductImage(product) {
    if (
      product.product_images &&
      product.product_images.length > 0
    ) {
      const primaryImage =
        product.product_images.find(
          (image) => image.is_primary === true
        );

      if (primaryImage?.image_url) {
        return primaryImage.image_url;
      }

      const sortedImages = [
        ...product.product_images,
      ].sort(
        (a, b) =>
          (a.sort_order || 0) -
          (b.sort_order || 0)
      );

      return (
        sortedImages[0]?.image_url ||
        product.image_url ||
        null
      );
    }

    return product.image_url || null;
  }

  /*
    CATEGORIES THAT ACTUALLY HAVE PRODUCTS
  */

  const visibleCategories = categories.filter(
    (category) =>
      products.some(
        (product) =>
          String(product.category_id) ===
          String(category.id)
      )
  );

  /*
    FILTER
  */

  const filteredProducts = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" ||
        String(product.category_id) ===
          String(selectedCategory);

      if (!matchesCategory) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const name =
        product.name?.toLowerCase() || "";

      const description =
        product.description?.toLowerCase() || "";

      const category =
        product.categories?.name?.toLowerCase() ||
        "";

      return (
        name.includes(searchValue) ||
        description.includes(searchValue) ||
        category.includes(searchValue)
      );
    });
  }, [
    products,
    search,
    selectedCategory,
  ]);

  /*
    CATEGORY COUNT
  */

  function getCategoryCount(categoryId) {
    return products.filter(
      (product) =>
        String(product.category_id) ===
        String(categoryId)
    ).length;
  }

  /*
    CATEGORY NAME
  */

  function getSelectedCategoryName() {
    if (selectedCategory === "all") {
      return "All Products";
    }

    const category = categories.find(
      (item) =>
        String(item.id) ===
        String(selectedCategory)
    );

    return category?.name || "Products";
  }

  /*
    RESET
  */

  function resetFilters() {
    setSearch("");
    setSelectedCategory("all");
  }

  /*
    LOADING
  */

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="products-page">

          <div className="products-loading-page">
            <div className="loading-spinner" />

            <p>
              Loading products...
            </p>
          </div>

        </main>
      </>
    );
  }

  /*
    ERROR
  */

  if (error) {
    return (
      <>
        <Navbar />

        <main className="products-page">

          <div className="products-error-page">

            <div className="products-error-icon">
              !
            </div>

            <h2>
              Unable to load products
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={loadProducts}
            >
              Try Again
            </button>

          </div>

        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="products-page">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="products-header">

          <div className="products-header-content">

            <p className="products-eyebrow">
              MARKETPLACE
            </p>

            <h1>
              Discover Products
            </h1>

            <p className="products-subtitle">
              Find something you like from our
              collection.
            </p>

          </div>


          {/* SEARCH */}

          <div className="products-search">

            <span className="products-search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <button
                type="button"
                className="products-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}

          </div>

        </header>


        {/* =================================================
            CATEGORY BAR
        ================================================= */}

        <nav className="products-category-bar">

          <button
            type="button"
            className={
              selectedCategory === "all"
                ? "products-category active"
                : "products-category"
            }
            onClick={() =>
              setSelectedCategory("all")
            }
          >
            <span>
              All
            </span>

            <small>
              {products.length}
            </small>
          </button>


          {visibleCategories.map(
            (category) => (
              <button
                type="button"
                key={category.id}
                className={
                  String(
                    selectedCategory
                  ) === String(category.id)
                    ? "products-category active"
                    : "products-category"
                }
                onClick={() =>
                  setSelectedCategory(
                    String(category.id)
                  )
                }
              >
                <span>
                  {category.name}
                </span>

                <small>
                  {getCategoryCount(
                    category.id
                  )}
                </small>
              </button>
            )
          )}

        </nav>


        {/* =================================================
            PRODUCT AREA
        ================================================= */}

        <section className="products-content">

          {/* TOP */}

          <div className="products-results-header">

            <div>

              <p className="products-results-label">
                COLLECTION
              </p>

              <h2>
                {getSelectedCategoryName()}
              </h2>

            </div>

            <span className="products-results-count">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1
                ? "product"
                : "products"}
            </span>

          </div>


          {/* =================================================
              EMPTY
          ================================================= */}

          {filteredProducts.length === 0 ? (

            <div className="products-empty">

              <div className="products-empty-icon">
                ⌕
              </div>

              <h2>
                No products found
              </h2>

              <p>
                We couldn't find anything matching
                your search.
              </p>

              <button
                type="button"
                onClick={resetFilters}
              >
                Show All Products
              </button>

            </div>

          ) : (

            /* =================================================
               GRID
            ================================================= */

            <div className="products-grid">

              {filteredProducts.map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    getProductImage={
                      getProductImage
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

      </main>
    </>
  );
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
  product,
  getProductImage,
}) {
  const image =
    getProductImage(product);

  const primaryImage =
    product.product_images?.find(
      (img) => img.is_primary === true
    );

  return (
    <Link
      to={`/products/${product.id}`}
      className="products-card"
    >

      {/* IMAGE */}

      <div className="products-card-image">

        {image ? (
          <img
            src={image}
            alt={
              primaryImage?.alt_text ||
              product.name ||
              "Product"
            }
            loading="lazy"
          />
        ) : (
          <div className="products-image-placeholder">
            No Image
          </div>
        )}

      </div>


      {/* INFO */}

      <div className="products-card-info">

        <p className="products-card-category">
          {product.categories?.name ||
            "Uncategorized"}
        </p>

        <h3
          title={product.name}
        >
          {product.name}
        </h3>

        <div className="products-card-bottom">

          <strong>
            $
            {Number(
              product.price || 0
            ).toFixed(2)}
          </strong>

          <span>
            View →
          </span>

        </div>

      </div>

    </Link>
  );
}

export default Products;