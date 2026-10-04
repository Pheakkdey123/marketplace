
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/dashboard.css";

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    sales: 0,
    orders: 0,
    products: 0,
    customers: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      // --------------------------------------------------
      // 1. GET CURRENT USER
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
      // 2. GET SELLER PRODUCTS
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

      // --------------------------------------------------
      // NO PRODUCTS
      // --------------------------------------------------

      if (productIds.length === 0) {
        setStats({
          sales: 0,
          orders: 0,
          products: 0,
          customers: 0,
        });

        setRecentOrders([]);
        setSalesData(createEmptySalesData());

        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // 3. GET ORDER ITEMS FOR SELLER PRODUCTS
      // --------------------------------------------------

      const {
        data: orderItems,
        error: orderItemsError,
      } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          product_name,
          variant_name,
          price,
          quantity,
          subtotal,
          created_at
        `)
        .in("product_id", productIds)
        .order("created_at", {
          ascending: false,
        });

      if (orderItemsError) {
        throw orderItemsError;
      }

      const sellerOrderItems = orderItems || [];

      // --------------------------------------------------
      // 4. GET UNIQUE ORDER IDS
      // --------------------------------------------------

      const orderIds = [
        ...new Set(
          sellerOrderItems.map(
            (item) => item.order_id
          )
        ),
      ];

      // --------------------------------------------------
      // 5. GET ORDERS
      // --------------------------------------------------

      let orders = [];

      if (orderIds.length > 0) {
        const {
          data,
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

        orders = data || [];
      }

      // --------------------------------------------------
      // 6. CALCULATE SELLER SALES
      // --------------------------------------------------

      const totalSales = sellerOrderItems.reduce(
        (sum, item) => {
          return sum + Number(item.subtotal || 0);
        },
        0
      );

      // --------------------------------------------------
      // 7. UNIQUE CUSTOMERS
      // --------------------------------------------------

      const customerIds = [
        ...new Set(
          orders
            .map((order) => order.user_id)
            .filter(Boolean)
        ),
      ];

      // --------------------------------------------------
      // 8. SET STATS
      // --------------------------------------------------

      setStats({
        sales: totalSales,
        orders: orders.length,
        products: products.length,
        customers: customerIds.length,
      });

      // --------------------------------------------------
      // 9. RECENT ORDERS
      // --------------------------------------------------

      const recent = orders.slice(0, 5).map((order) => {
        const items = sellerOrderItems.filter(
          (item) => item.order_id === order.id
        );

        const sellerTotal = items.reduce(
          (sum, item) =>
            sum + Number(item.subtotal || 0),
          0
        );

        return {
          ...order,
          sellerTotal,
          itemCount: items.reduce(
            (sum, item) =>
              sum + Number(item.quantity || 0),
            0
          ),
        };
      });

      setRecentOrders(recent);

      // --------------------------------------------------
      // 10. SALES OVERVIEW
      // --------------------------------------------------

      setSalesData(
        createSalesData(sellerOrderItems)
      );
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.message ||
          "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------
  // CREATE EMPTY 7-DAY SALES DATA
  // ------------------------------------------------------

  function createEmptySalesData() {
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setDate(
        date.getDate() - i
      );

      data.push({
        date: date.toISOString().split("T")[0],
        label: date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        ),
        sales: 0,
      });
    }

    return data;
  }

  // ------------------------------------------------------
  // CREATE SALES DATA
  // ------------------------------------------------------

  function createSalesData(items) {
    const data = createEmptySalesData();

    items.forEach((item) => {
      if (!item.created_at) return;

      const itemDate =
        new Date(item.created_at)
          .toISOString()
          .split("T")[0];

      const day = data.find(
        (entry) =>
          entry.date === itemDate
      );

      if (day) {
        day.sales += Number(
          item.subtotal || 0
        );
      }
    });

    return data;
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
          onClick={loadDashboard}
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
    <div className="dashboard-page">

      {/* PAGE HEADER */}
      <div className="dashboard-page-header">
        <div>
          <h2>Dashboard</h2>

          <p>
            Overview of your marketplace store
          </p>
        </div>
      </div>


      {/* STATS */}
      <div className="dashboard-stats">

        {/* SALES */}
        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">

            <span className="dashboard-stat-title">
              Total Sales
            </span>

            <div className="dashboard-stat-icon">
              $
            </div>

          </div>

          <div className="dashboard-stat-value">
            ${stats.sales.toFixed(2)}
          </div>

          <div className="dashboard-stat-change">
            Seller sales
          </div>

        </div>


        {/* ORDERS */}
        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">

            <span className="dashboard-stat-title">
              Orders
            </span>

            <div className="dashboard-stat-icon">
              □
            </div>

          </div>

          <div className="dashboard-stat-value">
            {stats.orders}
          </div>

          <div className="dashboard-stat-change">
            Total seller orders
          </div>

        </div>


        {/* PRODUCTS */}
        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">

            <span className="dashboard-stat-title">
              Products
            </span>

            <div className="dashboard-stat-icon">
              ▤
            </div>

          </div>

          <div className="dashboard-stat-value">
            {stats.products}
          </div>

          <div className="dashboard-stat-change">
            Your products
          </div>

        </div>


        {/* CUSTOMERS */}
        <div className="dashboard-stat-card">

          <div className="dashboard-stat-top">

            <span className="dashboard-stat-title">
              Customers
            </span>

            <div className="dashboard-stat-icon">
              ♙
            </div>

          </div>

          <div className="dashboard-stat-value">
            {stats.customers}
          </div>

          <div className="dashboard-stat-change">
            Unique customers
          </div>

        </div>

      </div>


      {/* MAIN GRID */}
      <div className="dashboard-grid">

        {/* SALES OVERVIEW */}
        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <h3 className="dashboard-card-title">
                Sales Overview
              </h3>

              <p className="dashboard-card-subtitle">
                Sales for the last 7 days
              </p>
            </div>

          </div>


          <div className="dashboard-card-body">

            <div className="dashboard-chart">

              {salesData.length > 0 ? (
                <div className="dashboard-sales-chart">

                  {salesData.map((day) => (
                    <div
                      className="dashboard-sales-day"
                      key={day.date}
                    >

                      <div className="dashboard-sales-value">
                        ${day.sales.toFixed(2)}
                      </div>

                      <div className="dashboard-sales-bar-wrapper">

                        <div
                          className="dashboard-sales-bar"
                          style={{
                            height: `${getBarHeight(
                              day.sales,
                              salesData
                            )}%`,
                          }}
                        />

                      </div>

                      <div className="dashboard-sales-label">
                        {day.label}
                      </div>

                    </div>
                  ))}

                </div>
              ) : (
                <div className="dashboard-empty">

                  <div className="dashboard-empty-icon">
                    ◒
                  </div>

                  <h3>
                    No sales data yet
                  </h3>

                  <p>
                    Sales information will appear
                    here when customers purchase
                    your products.
                  </p>

                </div>
              )}

            </div>

          </div>

        </div>


        {/* RECENT ORDERS */}
        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <h3 className="dashboard-card-title">
                Recent Orders
              </h3>

              <p className="dashboard-card-subtitle">
                Latest customer orders
              </p>
            </div>

            <Link
              to="/dashboard/orders"
              className="dashboard-link"
            >
              View all
            </Link>

          </div>


          <div className="dashboard-card-body">

            {recentOrders.length === 0 ? (
              <div className="dashboard-empty">

                <div className="dashboard-empty-icon">
                  □
                </div>

                <h3>
                  No orders yet
                </h3>

                <p>
                  New orders will appear here
                  when customers purchase your
                  products.
                </p>

              </div>
            ) : (
              <div className="dashboard-recent-orders">

                {recentOrders.map((order) => (
                  <div
                    className="dashboard-recent-order"
                    key={order.id}
                  >

                    <div className="dashboard-order-left">

                      <strong>
                        Order #{order.id}
                      </strong>

                      <span>
                        {order.itemCount} item
                        {order.itemCount !== 1
                          ? "s"
                          : ""}
                      </span>

                    </div>


                    <div className="dashboard-order-right">

                      <strong>
                        ${order.sellerTotal.toFixed(2)}
                      </strong>

                      <span
                        className={`dashboard-status ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {order.status || "pending"}
                      </span>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>

      </div>


      {/* QUICK ACTIONS */}
      <div className="dashboard-card">

        <div className="dashboard-card-header">

          <div>
            <h3 className="dashboard-card-title">
              Quick Actions
            </h3>

            <p className="dashboard-card-subtitle">
              Manage your store quickly
            </p>
          </div>

        </div>


        <div className="dashboard-card-body">

          <div className="dashboard-actions">

            <Link
              to="/dashboard/products/new"
              className="dashboard-action"
            >
              <div className="dashboard-action-icon">
                +
              </div>

              <span className="dashboard-action-title">
                Add Product
              </span>

              <span className="dashboard-action-description">
                Create a new product
              </span>
            </Link>


            <Link
              to="/dashboard/products"
              className="dashboard-action"
            >
              <div className="dashboard-action-icon">
                ▤
              </div>

              <span className="dashboard-action-title">
                Manage Products
              </span>

              <span className="dashboard-action-description">
                View and edit your products
              </span>
            </Link>


            <Link
              to="/dashboard/inventory"
              className="dashboard-action"
            >
              <div className="dashboard-action-icon">
                ▥
              </div>

              <span className="dashboard-action-title">
                Inventory
              </span>

              <span className="dashboard-action-description">
                Check product stock
              </span>
            </Link>


            <Link
              to="/dashboard/orders"
              className="dashboard-action"
            >
              <div className="dashboard-action-icon">
                □
              </div>

              <span className="dashboard-action-title">
                Orders
              </span>

              <span className="dashboard-action-description">
                Manage customer orders
              </span>
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}


// ========================================================
// BAR HEIGHT
// ========================================================

function getBarHeight(value, data) {
  const max = Math.max(
    ...data.map((item) => item.sales),
    1
  );

  if (value === 0) {
    return 3;
  }

  return Math.max(
    8,
    (value / max) * 100
  );
}


// ========================================================
// ORDER STATUS CLASS
// ========================================================

function getStatusClass(status) {
  switch (String(status).toLowerCase()) {
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

export default Dashboard;

