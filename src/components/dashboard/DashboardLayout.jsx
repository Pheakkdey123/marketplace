import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../../service/supabase";

function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: "▦", end: true },
    { label: "Orders", path: "/dashboard/orders", icon: "□" },
    { label: "Products", path: "/dashboard/products", icon: "▤" },
    { label: "Inventory", path: "/dashboard/inventory", icon: "▥" },
    { label: "Customers", path: "/dashboard/customers", icon: "♙" },
    { label: "Analytics", path: "/dashboard/analytics", icon: "◒" },
    { label: "Settings", path: "/dashboard/settings", icon: "⚙" },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">
          <h2>Marketplace</h2>
          <span>Seller Dashboard</span>
        </div>

        <nav className="dashboard-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              <span className="dashboard-nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-sidebar-bottom">
          <button
            type="button"
            className="dashboard-logout"
            onClick={handleLogout}
          >
            <span className="dashboard-nav-icon">↪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>Seller Dashboard</h1>
            <p>Manage your marketplace store</p>
          </div>

          <div className="dashboard-header-right">
            <div className="dashboard-user">
              <div className="dashboard-user-avatar">
                S
              </div>

              <div className="dashboard-user-info">
                <span className="dashboard-user-name">
                  Store Owner
                </span>

                <span className="dashboard-user-role">
                  Seller
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;