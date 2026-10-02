import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../service/supabase";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartId, setCartId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // LOAD CART
  // ==========================================

  useEffect(() => {
    initializeCart();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await initializeCart();
        } else {
          setCart([]);
          setCartId(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // INITIALIZE CART
  // ==========================================

  async function initializeCart() {
    try {
      setLoading(true);

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        setCart([]);
        setCartId(null);
        return;
      }

      // ----------------------------------------
      // FIND USER CART
      // ----------------------------------------

      let { data: existingCart, error } =
        await supabase
          .from("carts")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (error) {
        throw error;
      }

      // ----------------------------------------
      // CREATE CART IF NEEDED
      // ----------------------------------------

      if (!existingCart) {
        const {
          data: newCart,
          error: createError,
        } = await supabase
          .from("carts")
          .insert({
            user_id: user.id,
          })
          .select("id")
          .single();

        if (createError) {
          throw createError;
        }

        existingCart = newCart;
      }

      setCartId(existingCart.id);

      // ----------------------------------------
      // LOAD CART ITEMS
      // ----------------------------------------

      await loadCartItems(existingCart.id);
    } catch (error) {
      console.error(
        "Initialize cart error:",
        error
      );

      setCart([]);
      setCartId(null);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // LOAD CART ITEMS
  // ==========================================

  async function loadCartItems(currentCartId) {
    const {
      data,
      error,
    } = await supabase
      .from("cart_items")
      .select(`
        id,
        cart_id,
        product_id,
        variant_id,
        quantity
      `)
      .eq("cart_id", currentCartId)
      .order("id", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      setCart([]);
      return;
    }

    // ----------------------------------------
    // LOAD PRODUCTS
    // ----------------------------------------

    const productIds = [
      ...new Set(
        data.map(
          (item) => item.product_id
        )
      ),
    ];

    const {
      data: products,
      error: productError,
    } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        image_url
      `)
      .in("id", productIds);

    if (productError) {
      throw productError;
    }

    // ----------------------------------------
    // LOAD VARIANTS
    // ----------------------------------------

    const variantIds = [
      ...new Set(
        data
          .map(
            (item) => item.variant_id
          )
          .filter(Boolean)
      ),
    ];

    let variants = [];

    if (variantIds.length > 0) {
      const {
        data: variantData,
        error: variantError,
      } = await supabase
        .from("product_variants")
        .select(`
          id,
          product_id,
          sku,
          name,
          price
        `)
        .in("id", variantIds);

      if (variantError) {
        throw variantError;
      }

      variants = variantData || [];
    }

    // ----------------------------------------
    // LOAD INVENTORY
    // ----------------------------------------

    let inventory = [];

    if (variantIds.length > 0) {
      const {
        data: inventoryData,
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .select(`
          variant_id,
          quantity,
          reserved_quantity
        `)
        .in(
          "variant_id",
          variantIds
        );

      if (inventoryError) {
        throw inventoryError;
      }

      inventory =
        inventoryData || [];
    }

    // ----------------------------------------
    // BUILD CART
    // ----------------------------------------

    const finalCart = data.map(
      (item) => {
        const product =
          products?.find(
            (p) =>
              p.id ===
              item.product_id
          );

        const variant =
          variants.find(
            (v) =>
              v.id ===
              item.variant_id
          );

        const stockInfo =
          inventory.find(
            (stock) =>
              stock.variant_id ===
              item.variant_id
          );

        const stock =
          Math.max(
            0,
            Number(
              stockInfo?.quantity ?? 0
            ) -
              Number(
                stockInfo?.reserved_quantity ??
                  0
              )
          );

        return {
          cart_item_id: item.id,

          id: item.product_id,

          name:
            product?.name ||
            "Product",

          description:
            product?.description ||
            "",

          image_url:
            product?.image_url ||
            "",

          variant_id:
            item.variant_id,

          variant_name:
            variant?.name ||
            "Default",

          sku:
            variant?.sku ||
            "",

          variant_price:
            Number(
              variant?.price ??
                product?.price ??
                0
            ),

          variant_stock: stock,

          quantity:
            Number(
              item.quantity
            ),
        };
      }
    );

    setCart(finalCart);
  }

  // ==========================================
  // ADD TO CART
  // ==========================================

  const addToCart = async (product) => {
    try {
      // ----------------------------------------
      // USER
      // ----------------------------------------

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Please log in before adding items to your cart."
        );
      }

      // ----------------------------------------
      // GET CART
      // ----------------------------------------

      let currentCartId =
        cartId;

      if (!currentCartId) {
        await initializeCart();

        const {
          data: userCart,
        } = await supabase
          .from("carts")
          .select("id")
          .eq(
            "user_id",
            user.id
          )
          .single();

        currentCartId =
          userCart?.id;
      }

      if (!currentCartId) {
        throw new Error(
          "Unable to create cart."
        );
      }

      // ----------------------------------------
      // CHECK EXISTING ITEM
      // ----------------------------------------

      const {
        data: existingItem,
        error: findError,
      } = await supabase
        .from("cart_items")
        .select(`
          id,
          quantity
        `)
        .eq(
          "cart_id",
          currentCartId
        )
        .eq(
          "product_id",
          product.id
        )
        .eq(
          "variant_id",
          product.variant_id
        )
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      const stock = Number(
        product.variant_stock ?? 0
      );

      if (stock <= 0) {
        throw new Error(
          "This product is out of stock."
        );
      }

      // ----------------------------------------
      // EXISTING ITEM
      // ----------------------------------------

      if (existingItem) {
        const newQuantity =
          Number(
            existingItem.quantity
          ) + 1;

        if (
          newQuantity > stock
        ) {
          throw new Error(
            "You cannot add more than the available stock."
          );
        }

        const {
          error: updateError,
        } = await supabase
          .from("cart_items")
          .update({
            quantity:
              newQuantity,
          })
          .eq(
            "id",
            existingItem.id
          );

        if (updateError) {
          throw updateError;
        }
      }

      // ----------------------------------------
      // NEW ITEM
      // ----------------------------------------

      else {
        const {
          error: insertError,
        } = await supabase
          .from("cart_items")
          .insert({
            cart_id:
              currentCartId,

            product_id:
              product.id,

            variant_id:
              product.variant_id,

            quantity: 1,
          });

        if (insertError) {
          throw insertError;
        }
      }

      // ----------------------------------------
      // REFRESH CART
      // ----------------------------------------

      await loadCartItems(
        currentCartId
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "Add to cart error:",
        error
      );

      return {
        success: false,
        error:
          error.message ||
          "Unable to add product to cart.",
      };
    }
  };

  // ==========================================
  // REMOVE FROM CART
  // ==========================================

  const removeFromCart = async (
    productId,
    variantId
  ) => {
    try {
      if (!cartId) return;

      const {
        error,
      } = await supabase
        .from("cart_items")
        .delete()
        .eq(
          "cart_id",
          cartId
        )
        .eq(
          "product_id",
          productId
        )
        .eq(
          "variant_id",
          variantId
        );

      if (error) {
        throw error;
      }

      await loadCartItems(
        cartId
      );
    } catch (error) {
      console.error(
        "Remove cart item error:",
        error
      );
    }
  };

  // ==========================================
  // UPDATE QUANTITY
  // ==========================================

  const updateQuantity = async (
    productId,
    variantId,
    quantity
  ) => {
    try {
      if (!cartId) return;

      const item =
        cart.find(
          (item) =>
            item.id ===
              productId &&
            item.variant_id ===
              variantId
        );

      if (!item) return;

      const stock = Number(
        item.variant_stock ?? 0
      );

      const safeQuantity =
        Math.min(
          Math.max(
            1,
            Number(quantity)
          ),
          stock
        );

      const {
        error,
      } = await supabase
        .from("cart_items")
        .update({
          quantity:
            safeQuantity,
        })
        .eq(
          "cart_id",
          cartId
        )
        .eq(
          "product_id",
          productId
        )
        .eq(
          "variant_id",
          variantId
        );

      if (error) {
        throw error;
      }

      await loadCartItems(
        cartId
      );
    } catch (error) {
      console.error(
        "Update cart quantity error:",
        error
      );
    }
  };

  // ==========================================
  // CLEAR CART
  // ==========================================

  const clearCart = async () => {
    try {
      if (!cartId) return;

      const {
        error,
      } = await supabase
        .from("cart_items")
        .delete()
        .eq(
          "cart_id",
          cartId
        );

      if (error) {
        throw error;
      }

      setCart([]);
    } catch (error) {
      console.error(
        "Clear cart error:",
        error
      );
    }
  };

  // ==========================================
  // CART COUNT
  // ==========================================

  const cartCount = cart.reduce(
    (total, item) =>
      total +
      Number(
        item.quantity || 0
      ),
    0
  );

  // ==========================================
  // CART TOTAL
  // ==========================================

  const cartTotal = cart.reduce(
    (total, item) => {
      const price =
        Number(
          item.variant_price ??
            item.price ??
            0
        );

      return (
        total +
        price *
          Number(
            item.quantity || 0
          )
      );
    },
    0
  );

  // ==========================================
  // PROVIDER
  // ==========================================

  return (
    <CartContext.Provider
      value={{
        cart,
        cartId,
        loading,

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

// ==========================================
// USE CART
// ==========================================

export function useCart() {
  return useContext(
    CartContext
  );
}