import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/customers.css";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
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
        .select("id")
        .eq("seller_id", user.id);

      if (productsError) {
        throw productsError;
      }

      const productIds = (sellerProducts || []).map(
        (product) => product.id
      );

      if (productIds.length === 0) {
        setCustomers([]);
        return;
      }

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
          quantity,
          subtotal,
          created_at
        `)
        .in("product_id", productIds);

      if (itemsError) {
        throw itemsError;
      }

      const sellerItems = orderItems || [];

      if (sellerItems.length === 0) {
        setCustomers([]);
        return;
      }

      // =====================================================
      // GET ORDERS
      // =====================================================

      const orderIds = [
        ...new Set(
          sellerItems.map(
            (item) => item.order_id
          )
        ),
      ];

      const {
        data: orders,
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

      const orderMap = {};

      (orders || []).forEach((order) => {
        orderMap[order.id] = order;
      });

      // =====================================================
      // BUILD CUSTOMER DATA
      // =====================================================

      const customerMap = {};

      sellerItems.forEach((item) => {
        const order = orderMap[item.order_id];

        if (!order || !order.user_id) {
          return;
        }

        const userId = order.user_id;

        if (!customerMap[userId]) {
          customerMap[userId] = {
            user_id: userId,
            orders: new Set(),
            total_spent: 0,
            total_items: 0,
            first_order: order.created_at,
            last_order: order.created_at,
          };
        }

        const customer =
          customerMap[userId];

        customer.orders.add(
          item.order_id
        );

        customer.total_spent += Number(
          item.subtotal || 0
        );

        customer.total_items += Number(
          item.quantity || 0
        );

        if (
          new Date(order.created_at) <
          new Date(customer.first_order)
        ) {
          customer.first_order =
            order.created_at;
        }

        if (
          new Date(order.created_at) >
          new Date(customer.last_order)
        ) {
          customer.last_order =
            order.created_at;
        }
      });

      // =====================================================
      // FORMAT CUSTOMERS
      // =====================================================

      const formattedCustomers =
        Object.values(customerMap)
          .map((customer) => ({
            ...customer,

            order_count:
              customer.orders.size,

            customer_short_id:
              customer.user_id
                ? customer.user_id.slice(
                    0,
                    8
                  )
                : "-",
          }))
          .sort(
            (a, b) =>
              Number(b.total_spent) -
              Number(a.total_spent)
          );

      setCustomers(
        formattedCustomers
      );
    } catch (err) {
      console.error(
        "Customers error:",
        err
      );

      setError(
        err.message ||
          "Failed to load customers."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredCustomers = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    if (!searchText) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.user_id
          ?.toLowerCase()
          .includes(searchText) ||
        customer.customer_short_id
          ?.toLowerCase()
          .includes(searchText)
    );
  }, [customers, search]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalCustomers =
    customers.length;

  const totalOrders = customers.reduce(
    (total, customer) =>
      total + customer.order_count,
    0
  );

  const totalRevenue = customers.reduce(
    (total, customer) =>
      total +
      Number(customer.total_spent || 0),
    0
  );

  const averageCustomerValue =
    totalCustomers > 0
      ? totalRevenue / totalCustomers
      : 0;

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString(
      undefined,
      {
        year: "numeric",
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
      <div className="customers-page">
        <div className="dashboard-loading">
          Loading customers...
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="customers-page">

      {/* HEADER */}
      <div className="dashboard-page-header">

        <div>
          <h2>Customers</h2>

          <p>
            Customers who purchased
            your products.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-btn dashboard-btn-secondary"
          onClick={loadCustomers}
        >
          ↻ Refresh
        </button>

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
            ♙
          </div>

          <div>
            <span className="dashboard-stat-label">
              Customers
            </span>

            <strong>
              {totalCustomers}
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
              {totalOrders}
            </strong>
          </div>
        </div>

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
              {totalRevenue.toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon">
            ≈
          </div>

          <div>
            <span className="dashboard-stat-label">
              Avg. Customer Value
            </span>

            <strong>
              $
              {averageCustomerValue.toFixed(
                2
              )}
            </strong>
          </div>
        </div>

      </div>

      {/* SEARCH */}
      <div className="dashboard-toolbar">

        <div className="dashboard-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search customer ID..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />
        </div>

      </div>

      {/* CUSTOMERS TABLE */}
      <div className="dashboard-card">

        <div className="dashboard-card-header">

          <div>
            <h3>Customer List</h3>

            <p>
              {filteredCustomers.length} customer
              {filteredCustomers.length !==
              1
                ? "s"
                : ""}
            </p>
          </div>

        </div>

        {filteredCustomers.length === 0 ? (

          <div className="dashboard-empty">

            <div className="dashboard-empty-icon">
              ♙
            </div>

            <h3>
              No customers found
            </h3>

            <p>
              {customers.length === 0
                ? "You don't have any customers yet."
                : "No customers match your search."}
            </p>

          </div>

        ) : (

          <div className="dashboard-table-wrapper">

            <table className="dashboard-table">

              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Orders</th>
                  <th>Items Purchased</th>
                  <th>Total Spent</th>
                  <th>First Order</th>
                  <th>Last Order</th>
                </tr>
              </thead>

              <tbody>

                {filteredCustomers.map(
                  (customer) => (
                    <tr
                      key={
                        customer.user_id
                      }
                    >

                      {/* CUSTOMER */}
                      <td>

                        <div className="customers-user-cell">

                          <div className="customers-avatar">
                            {customer.customer_short_id
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              Customer
                            </strong>

                            <span>
                              {
                                customer.customer_short_id
                              }
                              ...
                            </span>
                          </div>

                        </div>

                      </td>

                      {/* ORDERS */}
                      <td>
                        <strong>
                          {
                            customer.order_count
                          }
                        </strong>
                      </td>

                      {/* ITEMS */}
                      <td>
                        {
                          customer.total_items
                        }
                      </td>

                      {/* TOTAL */}
                      <td>
                        <strong className="customers-total">
                          $
                          {Number(
                            customer.total_spent
                          ).toFixed(2)}
                        </strong>
                      </td>

                      {/* FIRST ORDER */}
                      <td>
                        {formatDate(
                          customer.first_order
                        )}
                      </td>

                      {/* LAST ORDER */}
                      <td>
                        {formatDate(
                          customer.last_order
                        )}
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

export default Customers;