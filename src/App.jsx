import { BrowserRouter, Routes, Route } from "react-router-dom";

import { CartProvider } from "./context/CartContext";

// Public pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Shopping
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";

// Dashboard
import DashboardLayout from "./components/dashboard/DashboardLayout";

import Dashboard from "./pages/dashboard/Dashboard";
import SellerProducts from "./pages/dashboard/Products";
import AddProduct from "./pages/dashboard/AddProduct";
import Orders from "./pages/dashboard/Orders";
import Inventory from "./pages/dashboard/Inventory";
import Customers from "./pages/dashboard/Customers";
import Analytics from "./pages/dashboard/Analytics";
import Settings from "./pages/dashboard/Settings";
import EditProduct from "./pages/dashboard/EditProduct";
import Cart from "./pages/Cart";
function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route
            path="/products/:id"
            element={<ProductDetails />}
          />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* PAYMENT */}
          <Route path="/payment" element={<Payment />} />

          {/* SHOPPING */}
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/cart" element={<Cart />} />
          {/* DASHBOARD */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />

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
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;