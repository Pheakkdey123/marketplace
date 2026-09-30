
import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) =>
          item.id === product.id &&
          item.variant_id === product.variant_id
      );

      // Available stock from inventory
      const stock = Number(
        product.variant_stock ?? 0
      );

      // ========================================
      // ALREADY IN CART
      // ========================================

      if (existingProduct) {
        // Do not allow quantity above stock
        if (
          existingProduct.quantity >= stock
        ) {
          alert(
            "You cannot add more than the available stock."
          );

          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id &&
          item.variant_id === product.variant_id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        );
      }

      // ========================================
      // NEW ITEM
      // ========================================

      if (stock <= 0) {
        alert(
          "This product is out of stock."
        );

        return currentCart;
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  // ==========================================
  // REMOVE FROM CART
  // ==========================================

  const removeFromCart = (
    productId,
    variantId
  ) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          !(
            item.id === productId &&
            item.variant_id === variantId
          )
      )
    );
  };

  // ==========================================
  // UPDATE QUANTITY
  // ==========================================

  const updateQuantity = (
    productId,
    variantId,
    quantity
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (
          item.id !== productId ||
          item.variant_id !== variantId
        ) {
          return item;
        }

        const stock = Number(
          item.variant_stock ?? 0
        );

        const safeQuantity = Math.min(
          Math.max(1, Number(quantity)),
          stock
        );

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  };

  // ==========================================
  // CLEAR CART
  // ==========================================

  const clearCart = () => {
    setCart([]);
  };

  // ==========================================
  // CART COUNT
  // ==========================================

  const cartCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  // ==========================================
  // CART TOTAL
  // ==========================================

  const cartTotal = cart.reduce(
    (total, item) => {
      const price = Number(
        item.variant_price ??
        item.price ??
        0
      );

      return (
        total +
        price * item.quantity
      );
    },
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

