import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/inventory.css";

function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("You must be logged in.");
        return;
      }

      /*
       * product_variants does NOT have:
       * - stock
       * - seller_id
       *
       * Seller belongs to products.
       */
      const { data: variants, error: variantsError } = await supabase
        .from("product_variants")
        .select(`
          id,
          product_id,
          sku,
          name,
          price,
          is_active,
          products!inner (
            id,
            name,
            seller_id,
            image_url
          )
        `)
        .eq("products.seller_id", user.id)
        .order("id", { ascending: false });

      if (variantsError) throw variantsError;

      const variantIds = (variants || []).map(
        (variant) => variant.id
      );

      let inventoryRows = [];

      if (variantIds.length > 0) {
        const { data, error: inventoryError } = await supabase
          .from("inventory")
          .select(`
            variant_id,
            quantity,
            reserved_quantity
          `)
          .in("variant_id", variantIds);

        if (inventoryError) throw inventoryError;

        inventoryRows = data || [];
      }

      const inventoryMap = {};

      inventoryRows.forEach((item) => {
        inventoryMap[item.variant_id] = item;
      });

      const combined = (variants || []).map((variant) => {
        const inventoryItem = inventoryMap[variant.id];

        const quantity = inventoryItem?.quantity ?? 0;
        const reserved = inventoryItem?.reserved_quantity ?? 0;
        const available = Math.max(0, quantity - reserved);

        return {
          id: variant.id,
          product_id: variant.product_id,
          sku: variant.sku,
          variant_name: variant.name,
          price: variant.price,
          is_active: variant.is_active,

          product_name:
            variant.products?.name || "Unknown Product",

          image_url:
            variant.products?.image_url || "",

          quantity,
          reserved,
          available,
        };
      });

      setInventory(combined);
    } catch (err) {
      console.error("Inventory error:", err);
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch =
        !searchText ||
        item.product_name
          .toLowerCase()
          .includes(searchText) ||
        (item.variant_name || "")
          .toLowerCase()
          .includes(searchText) ||
        (item.sku || "")
          .toLowerCase()
          .includes(searchText);

      let matchesStock = true;

      if (stockFilter === "in-stock") {
        matchesStock = item.available > 0;
      }

      if (stockFilter === "low") {
        matchesStock =
          item.available > 0 &&
          item.available <= 10;
      }

      if (stockFilter === "out") {
        matchesStock = item.available <= 0;
      }

      return matchesSearch && matchesStock;
    });
  }, [inventory, search, stockFilter]);

  const totalQuantity = inventory.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalReserved = inventory.reduce(
    (total, item) => total + item.reserved,
    0
  );

  const totalAvailable = inventory.reduce(
    (total, item) => total + item.available,
    0
  );

  const lowStockCount = inventory.filter(
    (item) =>
      item.available > 0 &&
      item.available <= 10
  ).length;

  const outOfStockCount = inventory.filter(
    (item) => item.available <= 0
  ).length;

  const getStatus = (available) => {
    if (available <= 0) {
      return {
        label: "Out of Stock",
        className: "status-danger",
      };
    }

    if (available <= 10) {
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

  if (loading) {
    return (
      <div className="inventory-page">
        <div className="dashboard-loading">
          Loading inventory...
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <h2>Inventory</h2>
          <p>
            Manage your product stock and inventory.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {/* Statistics */}
      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            📦
          </div>

          <div>
            <span className="dashboard-stat-label">
              Total Quantity
            </span>

            <strong>{totalQuantity}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ✓
          </div>

          <div>
            <span className="dashboard-stat-label">
              Available
            </span>

            <strong>{totalAvailable}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ⏳
          </div>

          <div>
            <span className="dashboard-stat-label">
              Reserved
            </span>

            <strong>{totalReserved}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ⚠
          </div>

          <div>
            <span className="dashboard-stat-label">
              Low Stock
            </span>

            <strong>{lowStockCount}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            !
          </div>

          <div>
            <span className="dashboard-stat-label">
              Out of Stock
            </span>

            <strong>{outOfStockCount}</strong>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dashboard-toolbar">
        <div className="dashboard-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search product, variant or SKU..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="dashboard-filter">
          <select
            value={stockFilter}
            onChange={(e) =>
              setStockFilter(e.target.value)
            }
          >
            <option value="all">
              All Stock
            </option>

            <option value="in-stock">
              In Stock
            </option>

            <option value="low">
              Low Stock
            </option>

            <option value="out">
              Out of Stock
            </option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h3>Inventory</h3>

            <p>
              {filteredInventory.length} variant
              {filteredInventory.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <button
            type="button"
            className="dashboard-btn dashboard-btn-secondary"
            onClick={loadInventory}
          >
            ↻ Refresh
          </button>
        </div>

        {filteredInventory.length === 0 ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">
              📦
            </div>

            <h3>No inventory found</h3>

            <p>
              There are no inventory items
              matching your search.
            </p>
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredInventory.map((item) => {
                  const status = getStatus(
                    item.available
                  );

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="dashboard-product-cell">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="dashboard-product-image"
                            />
                          ) : (
                            <div className="inventory-image-placeholder">
                              📦
                            </div>
                          )}

                          <div>
                            <strong>
                              {item.product_name}
                            </strong>
                          </div>
                        </div>
                      </td>

                      <td>
                        {item.variant_name || "-"}
                      </td>

                      <td>
                        <span className="inventory-sku">
                          {item.sku || "-"}
                        </span>
                      </td>

                      <td>
                        $
                        {Number(
                          item.price || 0
                        ).toFixed(2)}
                      </td>

                      <td>
                        <strong>
                          {item.quantity}
                        </strong>
                      </td>

                      <td>
                        {item.reserved}
                      </td>

                      <td>
                        <strong>
                          {item.available}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`dashboard-status ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventory;