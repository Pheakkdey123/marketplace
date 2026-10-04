
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Context
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";

// Public pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ConfirmEmail from "./pages/ConfirmEmail";
import AuthCallback from "./pages/AuthCallback";
import AccountSetup from "./pages/AccountSetup";

// Protected route
import ProtectedRoute from "./components/ProtectedRoute";

// Shopping
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";

// Dashboard
import DashboardLayout from "./components/dashboard/DashboardLayout";

import Dashboard from "./pages/dashboard/Dashboard";
import SellerProducts from "./pages/dashboard/Products";
import AddProduct from "./pages/dashboard/AddProduct";
import EditProduct from "./pages/dashboard/EditProduct";
import Orders from "./pages/dashboard/Orders";
import Inventory from "./pages/dashboard/Inventory";
import Customers from "./pages/dashboard/Customers";
import Analytics from "./pages/dashboard/Analytics";
import Settings from "./pages/dashboard/Settings";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>

            {/* =========================
                PUBLIC
            ========================== */}

            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/products"
              element={<Products />}
            />

            <Route
              path="/products/:id"
              element={<ProductDetails />}
            />


            {/* =========================
                AUTH
            ========================== */}

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/signup"
              element={<Signup />}
            />

            <Route
              path="/confirm-email"
              element={<ConfirmEmail />}
            />

            <Route
              path="/auth/callback"
              element={<AuthCallback />}
            />


            {/* =========================
                PROTECTED
            ========================== */}

            <Route element={<ProtectedRoute />}>

              {/* Account Setup */}

              <Route
                path="/account-setup"
                element={<AccountSetup />}
              />


              {/* Shopping */}

              <Route
                path="/cart"
                element={<Cart />}
              />

              <Route
                path="/checkout"
                element={<Checkout />}
              />

              <Route
                path="/payment"
                element={<Payment />}
              />


              {/* =========================
                  DASHBOARD
              ========================== */}

              <Route
                path="/dashboard"
                element={<DashboardLayout />}
              >

                <Route
                  index
                  element={<Dashboard />}
                />

                <Route
                  path="products"
                  element={<SellerProducts />}
                />

                <Route
                  path="products/new"
                  element={<AddProduct />}
                />

                <Route
                  path="products/:id/edit"
                  element={<EditProduct />}
                />

                <Route
                  path="orders"
                  element={<Orders />}
                />

                <Route
                  path="inventory"
                  element={<Inventory />}
                />

                <Route
                  path="customers"
                  element={<Customers />}
                />

                <Route
                  path="analytics"
                  element={<Analytics />}
                />

                <Route
                  path="settings"
                  element={<Settings />}
                />

              </Route>

            </Route>

          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
