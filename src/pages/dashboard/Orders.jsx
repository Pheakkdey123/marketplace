
import { useEffect, useState } from "react";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/orders.css";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, search, statusFilter]);

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      // --------------------------------------------------
      // CURRENT USER
      // --------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      // --------------------------------------------------
      // SELLER PRODUCTS
      // --------------------------------------------------

      const {
        data: products,
        error: productsError,
      } = await supabase
        .from("products")
        .select("id")
        .eq("seller_id", user.id);

      if (productsError) {
        throw productsError;
      }

      const productIds = (products || []).map(
        (product) => product.id
      );

      if (productIds.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // SELLER ORDER ITEMS
      // --------------------------------------------------

      const {
        data: orderItems,
        error: itemsError,
      } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          variant_id,
          product_name,
          variant_name,
          sku,
          price,
          quantity,
          subtotal,
          created_at
        `)
        .in("product_id", productIds)
        .order("created_at", {
          ascending: false,
        });

      if (itemsError) {
        throw itemsError;
      }

      const sellerItems = orderItems || [];

      // --------------------------------------------------
      // ORDER IDS
      // --------------------------------------------------

      const orderIds = [
        ...new Set(
          sellerItems.map(
            (item) => item.order_id
          )
        ),
      ];

      if (orderIds.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // ORDERS
      // --------------------------------------------------

      const {
        data: orderData,
        error: ordersError,
      } = await supabase
        .from("orders")
        .select(`
          id,
          user_id,
          status,
          total,
          payment_method,
          payment_reference,
          paid_at,
          created_at,
          updated_at
        `)
        .in("id", orderIds)
        .order("created_at", {
          ascending: false,
        });

      if (ordersError) {
        throw ordersError;
      }

      // --------------------------------------------------
      // COMBINE ORDER + SELLER ITEMS
      // --------------------------------------------------

      const formattedOrders = (orderData || []).map(
        (order) => {
          const items = sellerItems.filter(
            (item) =>
              item.order_id === order.id
          );

          const sellerTotal = items.reduce(
            (sum, item) =>
              sum +
              Number(item.subtotal || 0),
            0
          );

          const totalQuantity = items.reduce(
            (sum, item) =>
              sum +
              Number(item.quantity || 0),
            0
          );

          return {
            ...order,

            sellerItems: items,

            sellerTotal,

            totalQuantity,
          };
        }
      );

      setOrders(formattedOrders);
    } catch (err) {
      console.error("Orders error:", err);

      setError(
        err.message ||
          "Failed to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------
  // FILTER
  // ------------------------------------------------------

  function filterOrders() {
    let result = [...orders];

    const searchValue =
      search.trim().toLowerCase();

    if (searchValue) {
      result = result.filter((order) => {
        const orderId =
          String(order.id).toLowerCase();

        const customer =
          String(order.user_id || "")
            .toLowerCase();

        return (
          orderId.includes(searchValue) ||
          customer.includes(searchValue)
        );
      });
    }

    if (statusFilter !== "all") {
      result = result.filter(
        (order) =>
          String(order.status).toLowerCase() ===
          statusFilter.toLowerCase()
      );
    }

    setFilteredOrders(result);
  }

  // ------------------------------------------------------
  // STATUS CLASS
  // ------------------------------------------------------

  function getStatusClass(status) {
    switch (
      String(status).toLowerCase()
    ) {
      case "paid":
      case "completed":
      case "delivered":
        return "success";

      case "pending":
      case "processing":
        return "warning";

      case "cancelled":
      case "canceled":
      case "failed":
        return "danger";

      case "shipped":
        return "info";

      default:
        return "neutral";
    }
  }

  // ------------------------------------------------------
  // FORMAT DATE
  // ------------------------------------------------------

  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  // ------------------------------------------------------
  // LOADING
  // ------------------------------------------------------

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner" />
      </div>
    );
  }

  // ------------------------------------------------------
  // ERROR
  // ------------------------------------------------------

  if (error) {
    return (
      <div>
        <div className="dashboard-error">
          {error}
        </div>

        <button
          type="button"
          className="dashboard-button dashboard-button-primary"
          onClick={loadOrders}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------

  return (
    <div className="orders-page">

      {/* HEADER */}
      <div className="dashboard-page-header">

        <div>
          <h2>Orders</h2>

          <p>
            Manage orders containing your products
          </p>
        </div>

      </div>


      {/* TOOLBAR */}
      <div className="dashboard-toolbar">

        <div className="dashboard-search">
          <input
            type="text"
            placeholder="Search order ID or customer..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>


        <select
          className="dashboard-filter"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            All Status
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="processing">
            Processing
          </option>

          <option value="paid">
            Paid
          </option>

          <option value="shipped">
            Shipped
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="delivered">
            Delivered
          </option>

          <option value="cancelled">
            Cancelled
          </option>

          <option value="failed">
            Failed
          </option>
        </select>

      </div>


      {/* ORDERS */}
      <div className="dashboard-card">

        <div className="dashboard-card-header">

          <div>
            <h3 className="dashboard-card-title">
              Seller Orders
            </h3>

            <p className="dashboard-card-subtitle">
              {filteredOrders.length} order
              {filteredOrders.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

        </div>


        {filteredOrders.length === 0 ? (

          <div className="dashboard-empty">

            <div className="dashboard-empty-icon">
              □
            </div>

            <h3>
              No orders found
            </h3>

            <p>
              Orders containing your products
              will appear here.
            </p>

          </div>

        ) : (

          <div className="dashboard-table-wrapper">

            <table className="dashboard-table">

              <thead>
                <tr>

                  <th>
                    Order
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Customer
                  </th>

                  <th>
                    Items
                  </th>

                  <th>
                    Seller Total
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Status
                  </th>

                </tr>
              </thead>


              <tbody>

                {filteredOrders.map(
                  (order) => (

                    <tr key={order.id}>

                      {/* ORDER */}
                      <td>
                        <strong>
                          #{order.id}
                        </strong>
                      </td>


                      {/* DATE */}
                      <td>
                        {formatDate(
                          order.created_at
                        )}
                      </td>


                      {/* CUSTOMER */}
                      <td>

                        <span className="orders-customer">
                          {order.user_id
                            ? `${order.user_id.slice(
                                0,
                                8
                              )}...`
                            : "-"}
                        </span>

                      </td>


                      {/* ITEMS */}
                      <td>
                        {order.totalQuantity}
                      </td>


                      {/* SELLER TOTAL */}
                      <td>
                        <strong>
                          $
                          {order.sellerTotal.toFixed(
                            2
                          )}
                        </strong>
                      </td>


                      {/* PAYMENT */}
                      <td>
                        {order.payment_method ||
                          "-"}
                      </td>


                      {/* STATUS */}
                      <td>

                        <span
                          className={`dashboard-status ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {order.status ||
                            "pending"}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default Orders;

