import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/products.css";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      // Get logged-in seller
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You must be logged in.");
        return;
      }

      // =====================================================
      // 1. GET SELLER PRODUCTS
      // =====================================================

      const { data: productData, error: productsError } =
        await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            image_url,
            category_id,
            seller_id,
            is_active,
            created_at
          `)
          .eq("seller_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (productsError) {
        throw productsError;
      }

      const productList = productData || [];

      // =====================================================
      // 2. GET CATEGORY NAMES
      // =====================================================

      const productCategoryIds = [
        ...new Set(
          productList
            .map((product) => product.category_id)
            .filter(Boolean)
        ),
      ];

      let categories = [];

      if (productCategoryIds.length > 0) {
        const {
          data: categoryData,
          error: categoryError,
        } = await supabase
          .from("categories")
          .select("id, name")
          .in("id", productCategoryIds);

        if (categoryError) {
          throw categoryError;
        }

        categories = categoryData || [];
      }

      const categoryMap = {};

      categories.forEach((category) => {
        categoryMap[category.id] = category.name;
      });

      // =====================================================
      // 3. GET PRODUCT VARIANTS
      // =====================================================

      const productIds = productList.map(
        (product) => product.id
      );

      let variants = [];

      if (productIds.length > 0) {
        const {
          data: variantData,
          error: variantError,
        } = await supabase
          .from("product_variants")
          .select(`
            id,
            product_id
          `)
          .in("product_id", productIds);

        if (variantError) {
          throw variantError;
        }

        variants = variantData || [];
      }

      // =====================================================
      // 4. GET INVENTORY
      // =====================================================

      const variantIds = variants.map(
        (variant) => variant.id
      );

      let inventoryRows = [];

      if (variantIds.length > 0) {
        const {
          data: inventoryData,
          error: inventoryError,
        } = await supabase
          .from("inventory")
          .select(`
            variant_id,
            quantity,
            reserved_quantity
          `)
          .in("variant_id", variantIds);

        if (inventoryError) {
          throw inventoryError;
        }

        inventoryRows = inventoryData || [];
      }

      // =====================================================
      // 5. MAP VARIANT -> PRODUCT
      // =====================================================

      const variantProductMap = {};

      variants.forEach((variant) => {
        variantProductMap[variant.id] =
          variant.product_id;
      });

      // =====================================================
      // 6. CALCULATE STOCK PER PRODUCT
      // =====================================================

      const stockMap = {};

      inventoryRows.forEach((item) => {
        const productId =
          variantProductMap[item.variant_id];

        if (!productId) {
          return;
        }

        const quantity = Number(
          item.quantity || 0
        );

        const reserved = Number(
          item.reserved_quantity || 0
        );

        const available = Math.max(
          0,
          quantity - reserved
        );

        stockMap[productId] =
          (stockMap[productId] || 0) +
          available;
      });

      // =====================================================
      // 7. COUNT VARIANTS PER PRODUCT
      // =====================================================

      const variantCounts = {};

      variants.forEach((variant) => {
        variantCounts[variant.product_id] =
          (variantCounts[variant.product_id] || 0) + 1;
      });

      // =====================================================
      // 8. FORMAT PRODUCTS FOR UI
      // =====================================================

      const formattedProducts = productList.map(
        (product) => ({
          ...product,

          category_name:
            categoryMap[product.category_id] || "-",

          variant_count:
            variantCounts[product.id] || 0,

          stock:
            stockMap[product.id] || 0,
        })
      );

      setProducts(formattedProducts);
    } catch (err) {
      console.error("Products error:", err);

      setError(
        err.message ||
          "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // TOGGLE PRODUCT STATUS
  // =====================================================

  const toggleProductStatus = async (product) => {
    try {
      setError("");

      const newStatus = !product.is_active;

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            is_active: newStatus,
          })
          .eq("id", product.id);

      if (updateError) {
        throw updateError;
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                is_active: newStatus,
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Status update error:",
        err
      );

      setError(
        err.message ||
          "Failed to update product status."
      );
    }
  };
  // =====================================================
// DELETE PRODUCT
// =====================================================

const deleteProduct = async (product) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${product.name}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    setError("");

    // Delete product
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (deleteError) {
      throw deleteError;
    }

    // Remove from UI
    setProducts((current) =>
      current.filter(
        (item) => item.id !== product.id
      )
    );
  } catch (err) {
    console.error(
      "Delete product error:",
      err
    );

    setError(
      err.message ||
        "Failed to delete product."
    );
  }
};
  // =====================================================
  // FILTER PRODUCTS
  // =====================================================

  const filteredProducts = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !searchText ||
        product.name
          ?.toLowerCase()
          .includes(searchText) ||
        product.category_name
          ?.toLowerCase()
          .includes(searchText) ||
        product.description
          ?.toLowerCase()
          .includes(searchText);

      let matchesStatus = true;

      if (statusFilter === "active") {
        matchesStatus =
          product.is_active === true;
      }

      if (statusFilter === "inactive") {
        matchesStatus =
          product.is_active === false;
      }

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    products,
    search,
    statusFilter,
  ]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const activeCount = products.filter(
    (product) => product.is_active
  ).length;

  const inactiveCount = products.filter(
    (product) => !product.is_active
  ).length;

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  );

  const totalVariants = products.reduce(
    (total, product) =>
      total +
      Number(product.variant_count || 0),
    0
  );

  // =====================================================
  // STOCK STATUS
  // =====================================================

  const getStockStatus = (stock) => {
    const value = Number(stock || 0);

    if (value <= 0) {
      return {
        label: "Out of Stock",
        className: "status-danger",
      };
    }

    if (value <= 10) {
      return {
        label: "Low Stock",
        className: "status-warning",
      };
    }

    return {
      label: "In Stock",
      className: "status-success",
    };
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="products-dashboard-page">
        <div className="dashboard-loading">
          Loading products...
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="products-dashboard-page">

      {/* PAGE HEADER */}
      <div className="dashboard-page-header">
        <div>
          <h2>Products</h2>

          <p>
            Manage the products in your store.
          </p>
        </div>

        <Link
          to="/dashboard/products/new"
          className="dashboard-btn dashboard-btn-primary"
        >
          + Add Product
        </Link>
      </div>

      {/* ERROR */}
      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {/* STATS */}
      <div className="dashboard-stats">

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            📦
          </div>

          <div>
            <span className="dashboard-stat-label">
              Total Products
            </span>

            <strong>
              {products.length}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ✓
          </div>

          <div>
            <span className="dashboard-stat-label">
              Active
            </span>

            <strong>
              {activeCount}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ○
          </div>

          <div>
            <span className="dashboard-stat-label">
              Inactive
            </span>

            <strong>
              {inactiveCount}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            #
          </div>

          <div>
            <span className="dashboard-stat-label">
              Total Stock
            </span>

            <strong>
              {totalStock}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ◈
          </div>

          <div>
            <span className="dashboard-stat-label">
              Variants
            </span>

            <strong>
              {totalVariants}
            </strong>
          </div>
        </div>

      </div>

      {/* TOOLBAR */}
      <div className="dashboard-toolbar">

        <div className="dashboard-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="dashboard-filter">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="all">
              All Products
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>
        </div>

      </div>

      {/* PRODUCTS CARD */}
      <div className="dashboard-card">

        <div className="dashboard-card-header">

          <div>
            <h3>All Products</h3>

            <p>
              {filteredProducts.length} product
              {filteredProducts.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <button
            type="button"
            className="dashboard-btn dashboard-btn-secondary"
            onClick={loadProducts}
          >
            ↻ Refresh
          </button>

        </div>

        {/* EMPTY */}
        {filteredProducts.length === 0 ? (

          <div className="dashboard-empty">

            <div className="dashboard-empty-icon">
              📦
            </div>

            <h3>
              No products found
            </h3>

            <p>
              {products.length === 0
                ? "You have not added any products yet."
                : "No products match your search or filter."}
            </p>

            {products.length === 0 && (
              <Link
                to="/dashboard/products/new"
                className="dashboard-btn dashboard-btn-primary"
              >
                + Add Your First Product
              </Link>
            )}

          </div>

        ) : (

          /* TABLE */
          <div className="dashboard-table-wrapper">

            <table className="dashboard-table">

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Variants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredProducts.map(
                  (product) => {

                    const stockStatus =
                      getStockStatus(
                        product.stock
                      );

                    return (
                      <tr
                        key={product.id}
                      >

                        {/* PRODUCT */}
                        <td>
                          <div className="dashboard-product-cell">

                            {product.image_url ? (
                              <img
                                src={
                                  product.image_url
                                }
                                alt={
                                  product.name
                                }
                                className="dashboard-product-image"
                              />
                            ) : (
                              <div className="products-image-placeholder">
                                📦
                              </div>
                            )}

                            <div className="products-name-cell">

                              <strong>
                                {
                                  product.name
                                }
                              </strong>

                              <span>
                                ID: #
                                {product.id}
                              </span>

                            </div>

                          </div>
                        </td>

                        {/* CATEGORY */}
                        <td>
                          <span className="products-category">
                            {
                              product.category_name
                            }
                          </span>
                        </td>

                        {/* PRICE */}
                        <td>
                          <strong className="products-price">
                            $
                            {Number(
                              product.price || 0
                            ).toFixed(2)}
                          </strong>
                        </td>

                        {/* STOCK */}
                        <td>

                          <strong>
                            {product.stock}
                          </strong>

                          <div>
                            <span
                              className={`products-stock-status ${stockStatus.className}`}
                            >
                              {
                                stockStatus.label
                              }
                            </span>
                          </div>

                        </td>

                        {/* VARIANTS */}
                        <td>
                          <span className="products-variant-count">
                            {
                              product.variant_count
                            }
                          </span>
                        </td>

                        {/* STATUS */}
                        <td>

                          <span
                            className={`dashboard-status ${
                              product.is_active
                                ? "status-success"
                                : "status-danger"
                            }`}
                          >
                            {product.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>

                        </td>

                        {/* ACTIONS */}
                        <td>

                          <div className="products-actions">

                            <Link
                              to={`/products/${product.id}`}
                              className="products-action-btn"
                            >
                              View
                            </Link>

                            <button
                              type="button"
                              className="products-action-btn"
                              onClick={() =>
                                toggleProductStatus(
                                  product
                                )
                              }
                            >
                              {product.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                            <Link to={`/dashboard/products/${product.id}/edit`}
                              className="dashboard-btn dashboard-btn-secondary">
                              Edit    
                            </Link>
                             <button
                                type="button"
                                className="products-action-btn products-delete-btn"
                               onClick={() =>
                              deleteProduct(product)
                              }
                              >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default Products;