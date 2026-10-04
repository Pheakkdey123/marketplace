import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/analytics.css";

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [range, setRange] = useState("7");

  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    items: 0,
    customers: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [range]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      // =====================================================
      // GET CURRENT SELLER
      // =====================================================

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
      // GET SELLER PRODUCTS
      // =====================================================

      const {
        data: sellerProducts,
        error: productsError,
      } = await supabase
        .from("products")
        .select("id, name, image_url")
        .eq("seller_id", user.id);

      if (productsError) {
        throw productsError;
      }

      const products = sellerProducts || [];

      const productIds = products.map(
        (product) => product.id
      );

      if (productIds.length === 0) {
        setSalesData([]);
        setTopProducts([]);
        setStats({
          revenue: 0,
          orders: 0,
          items: 0,
          customers: 0,
        });

        return;
      }

      // =====================================================
      // DATE RANGE
      // =====================================================

      const days = Number(range);

      const startDate = new Date();

      startDate.setHours(
        0,
        0,
        0,
        0
      );

      startDate.setDate(
        startDate.getDate() -
          (days - 1)
      );

      // =====================================================
      // GET SELLER ORDER ITEMS
      // =====================================================

      const {
        data: orderItems,
        error: itemsError,
      } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          product_name,
          quantity,
          subtotal,
          created_at
        `)
        .in("product_id", productIds)
        .gte(
          "created_at",
          startDate.toISOString()
        )
        .order("created_at", {
          ascending: true,
        });

      if (itemsError) {
        throw itemsError;
      }

      const items = orderItems || [];

      // =====================================================
      // GET ORDERS
      // =====================================================

      const orderIds = [
        ...new Set(
          items.map(
            (item) => item.order_id
          )
        ),
      ];

      let orders = [];

      if (orderIds.length > 0) {
        const {
          data: orderData,
          error: ordersError,
        } = await supabase
          .from("orders")
          .select(`
            id,
            user_id,
            status,
            created_at
          `)
          .in("id", orderIds);

        if (ordersError) {
          throw ordersError;
        }

        orders = orderData || [];
      }

      // =====================================================
      // BASIC STATS
      // =====================================================

      const revenue = items.reduce(
        (total, item) =>
          total +
          Number(item.subtotal || 0),
        0
      );

      const itemCount = items.reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0),
        0
      );

      const uniqueOrders = new Set(
        items.map(
          (item) => item.order_id
        )
      );

      const uniqueCustomers =
        new Set(
          orders
            .map(
              (order) => order.user_id
            )
            .filter(Boolean)
        );

      setStats({
        revenue,
        orders: uniqueOrders.size,
        items: itemCount,
        customers:
          uniqueCustomers.size,
      });

      // =====================================================
      // DAILY SALES
      // =====================================================

      const dailyMap = {};

      for (let i = 0; i < days; i++) {
        const date = new Date(
          startDate
        );

        date.setDate(
          startDate.getDate() + i
        );

        const key =
          date.toISOString().split(
            "T"
          )[0];

        dailyMap[key] = {
          date: key,
          revenue: 0,
          orders: new Set(),
        };
      }

      items.forEach((item) => {
        const key =
          new Date(
            item.created_at
          )
            .toISOString()
            .split("T")[0];

        if (!dailyMap[key]) {
          dailyMap[key] = {
            date: key,
            revenue: 0,
            orders: new Set(),
          };
        }

        dailyMap[key].revenue += Number(
          item.subtotal || 0
        );

        dailyMap[key].orders.add(
          item.order_id
        );
      });

      const dailySales = Object.values(
        dailyMap
      ).map((day) => ({
        date: day.date,
        revenue: day.revenue,
        orders: day.orders.size,
      }));

      setSalesData(dailySales);

      // =====================================================
      // TOP PRODUCTS
      // =====================================================

      const productMap = {};

      items.forEach((item) => {
        const productId =
          item.product_id;

        if (!productMap[productId]) {
          productMap[productId] = {
            product_id: productId,
            name:
              item.product_name ||
              "Unknown Product",
            quantity: 0,
            revenue: 0,
          };
        }

        productMap[productId].quantity +=
          Number(item.quantity || 0);

        productMap[productId].revenue +=
          Number(item.subtotal || 0);
      });

      const imageMap = {};

      products.forEach((product) => {
        imageMap[product.id] =
          product.image_url;
      });

      const top = Object.values(
        productMap
      )
        .map((product) => ({
          ...product,
          image_url:
            imageMap[
              product.product_id
            ] || null,
        }))
        .sort(
          (a, b) =>
            b.revenue - a.revenue
        )
        .slice(0, 5);

      setTopProducts(top);
    } catch (err) {
      console.error(
        "Analytics error:",
        err
      );

      setError(
        err.message ||
          "Failed to load analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // MAX CHART VALUE
  // =====================================================

  const maxRevenue = useMemo(() => {
    const values = salesData.map(
      (day) =>
        Number(day.revenue || 0)
    );

    return Math.max(
      ...values,
      1
    );
  }, [salesData]);

  // =====================================================
  // AVERAGE ORDER VALUE
  // =====================================================

  const averageOrderValue =
    stats.orders > 0
      ? stats.revenue / stats.orders
      : 0;

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatChartDate = (
    date
  ) => {
    const value = new Date(
      `${date}T00:00:00`
    );

    if (range === "7") {
      return value.toLocaleDateString(
        undefined,
        {
          weekday: "short",
        }
      );
    }

    return value.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
      }
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="dashboard-loading">
          Loading analytics...
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="analytics-page">

      {/* HEADER */}
      <div className="dashboard-page-header">

        <div>
          <h2>Analytics</h2>

          <p>
            Track your store performance
            and sales.
          </p>
        </div>

        <div className="analytics-range">

          <select
            value={range}
            onChange={(e) =>
              setRange(e.target.value)
            }
          >
            <option value="7">
              Last 7 Days
            </option>

            <option value="14">
              Last 14 Days
            </option>

            <option value="30">
              Last 30 Days
            </option>
          </select>

        </div>

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
            $
          </div>

          <div>
            <span className="dashboard-stat-label">
              Revenue
            </span>

            <strong>
              $
              {stats.revenue.toFixed(
                2
              )}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            □
          </div>

          <div>
            <span className="dashboard-stat-label">
              Orders
            </span>

            <strong>
              {stats.orders}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            #
          </div>

          <div>
            <span className="dashboard-stat-label">
              Items Sold
            </span>

            <strong>
              {stats.items}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ≈
          </div>

          <div>
            <span className="dashboard-stat-label">
              Avg. Order Value
            </span>

            <strong>
              $
              {averageOrderValue.toFixed(
                2
              )}
            </strong>
          </div>
        </div>

      </div>

      {/* SALES CHART */}
      <div className="dashboard-card analytics-chart-card">

        <div className="dashboard-card-header">

          <div>
            <h3>Sales Overview</h3>

            <p>
              Seller revenue during the
              selected period.
            </p>
          </div>

        </div>

        <div className="analytics-chart">

          <div className="analytics-y-axis">

            <span>
              ${maxRevenue.toFixed(0)}
            </span>

            <span>
              ${(maxRevenue * 0.75).toFixed(0)}
            </span>

            <span>
              ${(maxRevenue * 0.5).toFixed(0)}
            </span>

            <span>
              ${(maxRevenue * 0.25).toFixed(0)}
            </span>

            <span>$0</span>

          </div>

          <div className="analytics-bars">

            {salesData.map(
              (day) => {

                const height =
                  maxRevenue > 0
                    ? Math.max(
                        (day.revenue /
                          maxRevenue) *
                          100,
                        day.revenue > 0
                          ? 4
                          : 0
                      )
                    : 0;

                return (
                  <div
                    className="analytics-bar-column"
                    key={day.date}
                  >

                    <div className="analytics-bar-value">
                      {day.revenue > 0
                        ? `$${day.revenue.toFixed(
                            0
                          )}`
                        : ""}
                    </div>

                    <div className="analytics-bar-area">

                      <div
                        className="analytics-bar"
                        style={{
                          height: `${height}%`,
                        }}
                        title={`${day.date}: $${day.revenue.toFixed(
                          2
                        )}`}
                      />

                    </div>

                    <span className="analytics-bar-label">
                      {formatChartDate(
                        day.date
                      )}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        </div>

      </div>

      {/* BOTTOM GRID */}
      <div className="analytics-bottom-grid">

        {/* TOP PRODUCTS */}
        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <h3>
                Top Products
              </h3>

              <p>
                Products generating the
                most revenue.
              </p>
            </div>

          </div>

          {topProducts.length ===
          0 ? (

            <div className="dashboard-empty">

              <div className="dashboard-empty-icon">
                📦
              </div>

              <h3>
                No sales yet
              </h3>

              <p>
                Product sales will
                appear here.
              </p>

            </div>

          ) : (

            <div className="analytics-products">

              {topProducts.map(
                (product, index) => (

                  <div
                    className="analytics-product"
                    key={
                      product.product_id
                    }
                  >

                    <span className="analytics-product-rank">
                      {index + 1}
                    </span>

                    {product.image_url ? (
                      <img
                        src={
                          product.image_url
                        }
                        alt={
                          product.name
                        }
                        className="analytics-product-image"
                      />
                    ) : (
                      <div className="analytics-product-placeholder">
                        📦
                      </div>
                    )}

                    <div className="analytics-product-info">

                      <strong>
                        {product.name}
                      </strong>

                      <span>
                        {
                          product.quantity
                        } items sold
                      </span>

                    </div>

                    <strong className="analytics-product-revenue">
                      $
                      {Number(
                        product.revenue
                      ).toFixed(2)}
                    </strong>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* SUMMARY */}
        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <h3>
                Performance Summary
              </h3>

              <p>
                Key numbers for this
                period.
              </p>
            </div>

          </div>

          <div className="analytics-summary">

            <div className="analytics-summary-row">

              <span>
                Total Revenue
              </span>

              <strong>
                $
                {stats.revenue.toFixed(
                  2
                )}
              </strong>

            </div>

            <div className="analytics-summary-row">

              <span>
                Total Orders
              </span>

              <strong>
                {stats.orders}
              </strong>

            </div>

            <div className="analytics-summary-row">

              <span>
                Items Sold
              </span>

              <strong>
                {stats.items}
              </strong>

            </div>

            <div className="analytics-summary-row">

              <span>
                Customers
              </span>

              <strong>
                {stats.customers}
              </strong>

            </div>

            <div className="analytics-summary-row">

              <span>
                Average Order
              </span>

              <strong>
                $
                {averageOrderValue.toFixed(
                  2
                )}
              </strong>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Analytics;