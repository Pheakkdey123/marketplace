
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/SellerDashboard.css";

function SellerDashboard() {
  return (
    <div className="seller-dashboard-page">
      <Navbar />

      <main className="seller-dashboard">
        <div className="seller-dashboard-header">
          <div>
            <p className="seller-dashboard-small">
              SELLER CENTER
            </p>

            <h1>Seller Dashboard</h1>

            <p>
              Manage your products, inventory, and orders.
            </p>
          </div>
        </div>

        <section className="seller-dashboard-grid">

          <Link
            to="/seller/products"
            className="seller-dashboard-card"
          >
            <div className="seller-dashboard-icon">
              📦
            </div>

            <h2>Products</h2>

            <p>
              Add, edit, and manage your products.
            </p>
          </Link>

          <Link
            to="/seller/inventory"
            className="seller-dashboard-card"
          >
            <div className="seller-dashboard-icon">
              📊
            </div>

            <h2>Inventory</h2>

            <p>
              Manage stock and product variants.
            </p>
          </Link>

          <Link
            to="/seller/orders"
            className="seller-dashboard-card"
          >
            <div className="seller-dashboard-icon">
              🛒
            </div>

            <h2>Orders</h2>

            <p>
              View and manage customer orders.
            </p>
          </Link>

        </section>

        <section className="seller-dashboard-stats">

          <div className="seller-stat-card">
            <span>Total Sales</span>
            <strong>$0.00</strong>
          </div>

          <div className="seller-stat-card">
            <span>Total Orders</span>
            <strong>0</strong>
          </div>

          <div className="seller-stat-card">
            <span>Products</span>
            <strong>0</strong>
          </div>

          <div className="seller-stat-card">
            <span>Low Stock</span>
            <strong>0</strong>
          </div>

        </section>
      </main>
    </div>
  );
}

export default SellerDashboard;

