import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import Navbar from "../components/Navbar";
import "../styles/Home.css";
import "../styles/App.css";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You are not signed in.");
        setLoading(false);
        return;
      }

      const { data: ordersData, error: ordersError } =
        await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (ordersError) {
        setError(ordersError.message);
        setLoading(false);
        return;
      }

      if (ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = ordersData.map(
        (order) => order.id
      );

      const { data: itemsData, error: itemsError } =
        await supabase
          .from("order_items")
          .select(`
            id,
            order_id,
            product_id,
            quantity,
            price,
            products (
              name,
              image_url
            )
          `)
          .in("order_id", orderIds);

      if (itemsError) {
        setError(itemsError.message);
        setLoading(false);
        return;
      }

      const ordersWithItems = ordersData.map(
        (order) => ({
          ...order,
          items: itemsData.filter(
            (item) =>
              item.order_id === order.id
          ),
        })
      );

      setOrders(ordersWithItems);
      setLoading(false);
    }

    loadOrders();
  }, []);

  if (loading) {
    return (
      <div className="home">
        <Navbar />

        <main className="featured">
          <p>Loading orders...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar />

      <main className="featured">

        <p className="section-small">
          YOUR ACCOUNT
        </p>

        <h1>My Orders</h1>

        {error && (
          <p style={{ color: "#c00" }}>
            {error}
          </p>
        )}

        {!error && orders.length === 0 && (
          <div style={{ marginTop: "30px" }}>
            <p>You don't have any orders yet.</p>

            <Link
              to="/products"
              className="hero-button"
            >
              Browse Products
            </Link>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: "25px",
            marginTop: "30px",
          }}
        >
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "#fff",
                padding: "25px",
                borderRadius: "12px",
                border: "1px solid #eee",
              }}
            >

              {/* ORDER HEADER */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >

                <div>
                  <p className="section-small">
                    ORDER
                  </p>

                  <h2>
                    #{order.id}
                  </h2>
                </div>

                <div>
                  <p className="section-small">
                    STATUS
                  </p>

                  <strong>
                    {order.status}
                  </strong>
                </div>

                <div>
                  <p className="section-small">
                    TOTAL
                  </p>

                  <strong>
                    ${Number(order.total).toFixed(2)}
                  </strong>
                </div>

              </div>

              {/* ORDER DATE */}

              <p
                style={{
                  marginTop: "15px",
                  color: "#666",
                }}
              >
                {new Date(
                  order.created_at
                ).toLocaleString()}
              </p>

              {/* ORDER ITEMS */}

              <div
                style={{
                  marginTop: "25px",
                  display: "grid",
                  gap: "12px",
                }}
              >

                <p className="section-small">
                  ITEMS
                </p>

                {order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "15px",
                      padding: "12px",
                      background: "#f7f7f7",
                      borderRadius: "8px",
                    }}
                  >

                    {item.products
                      ?.image_url && (
                      <img
                        src={
                          item.products
                            .image_url
                        }
                        alt={
                          item.products
                            .name
                        }
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit:
                            "cover",
                          borderRadius:
                            "6px",
                        }}
                      />
                    )}

                    <div
                      style={{
                        flex: 1,
                      }}
                    >
                      <strong>
                        {
                          item.products
                            ?.name
                        }
                      </strong>

                      <p
                        style={{
                          margin:
                            "5px 0 0",
                          color: "#666",
                        }}
                      >
                        Quantity:{" "}
                        {item.quantity}
                      </p>
                    </div>

                    <strong>
                      $
                      {(
                        Number(
                          item.price
                        ) *
                        item.quantity
                      ).toFixed(2)}
                    </strong>

                  </div>
                ))}

              </div>

            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

export default Orders;