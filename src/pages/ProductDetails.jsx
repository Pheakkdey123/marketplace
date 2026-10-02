import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../service/supabase";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import "../styles/ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      // =========================================
      // LOAD PRODUCT
      // =========================================

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          is_active,
          created_at
        `)
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (productError) {
        throw productError;
      }

      setProduct(productData);

      // =========================================
      // LOAD PRODUCT IMAGES
      // =========================================

      const {
        data: imageData,
        error: imageError,
      } = await supabase
        .from("product_images")
        .select(`
          id,
          image_url,
          alt_text,
          sort_order,
          is_primary
        `)
        .eq("product_id", id)
        .order("is_primary", {
          ascending: false,
        })
        .order("sort_order", {
          ascending: true,
        });

      if (imageError) {
        throw imageError;
      }

      const loadedImages = imageData || [];

      setImages(loadedImages);

      if (loadedImages.length > 0) {
        setSelectedImage(
          loadedImages[0].image_url
        );
      } else if (productData.image_url) {
        setSelectedImage(
          productData.image_url
        );
      } else {
        setSelectedImage("");
      }

      // =========================================
      // LOAD VARIANTS
      // =========================================

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
          price,
          is_active
        `)
        .eq("product_id", id)
        .eq("is_active", true)
        .order("id", {
          ascending: true,
        });

      if (variantError) {
        throw variantError;
      }

      const loadedVariants =
        variantData || [];

      // =========================================
      // LOAD INVENTORY
      // =========================================

      let inventoryData = [];

      const variantIds =
        loadedVariants.map(
          (variant) => variant.id
        );

      if (variantIds.length > 0) {
        const {
          data,
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

        inventoryData = data || [];
      }

      // =========================================
      // COMBINE VARIANT + INVENTORY
      // =========================================

      const finalVariants =
        loadedVariants.map(
          (variant) => {
            const inventory =
              inventoryData.find(
                (item) =>
                  item.variant_id ===
                  variant.id
              );

            const quantity = Number(
              inventory?.quantity ?? 0
            );

            const reservedQuantity =
              Number(
                inventory?.reserved_quantity ??
                  0
              );

            const availableStock =
              Math.max(
                0,
                quantity -
                  reservedQuantity
              );

            return {
              ...variant,

              variant_price: Number(
                variant.price ??
                  productData.price ??
                  0
              ),

              variant_stock:
                availableStock,
            };
          }
        );

      setVariants(finalVariants);

      if (finalVariants.length > 0) {
        setSelectedVariant(
          finalVariants[0]
        );
      }
    } catch (err) {
      console.error(
        "Product details error:",
        err
      );

      setError(
        err.message ||
          "Unable to load product."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================
  // TOAST
  // =========================================

  function showMessage(text) {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  // =========================================
  // ADD TO CART
  // =========================================

  async function handleAddToCart() {
    if (!product) {
      return;
    }

    if (!selectedVariant) {
      showMessage(
        "Please select a variant."
      );
      return;
    }

    if (
      selectedVariant.variant_stock <= 0
    ) {
      showMessage(
        "This product is out of stock."
      );
      return;
    }

    const result =
      await addToCart({
        id: product.id,
        name: product.name,
        description: product.description,

        image_url:
          selectedImage ||
          product.image_url ||
          "",

        variant_id:
          selectedVariant.id,

        variant_name:
          selectedVariant.name,

        sku:
          selectedVariant.sku,

        variant_price:
          selectedVariant.variant_price,

        variant_stock:
          selectedVariant.variant_stock,
      });

    if (result?.success) {
      showMessage(
        "Product added to cart."
      );
    } else {
      showMessage(
        result?.error ||
          "Unable to add product to cart."
      );
    }
  }

  // =========================================
  // BUY NOW
  // =========================================

  async function handleBuyNow() {
    if (!product) {
      return;
    }

    if (!selectedVariant) {
      showMessage(
        "Please select a variant."
      );
      return;
    }

    if (
      selectedVariant.variant_stock <= 0
    ) {
      showMessage(
        "This product is out of stock."
      );
      return;
    }

    const result =
      await addToCart({
        id: product.id,
        name: product.name,
        description: product.description,

        image_url:
          selectedImage ||
          product.image_url ||
          "",

        variant_id:
          selectedVariant.id,

        variant_name:
          selectedVariant.name,

        sku:
          selectedVariant.sku,

        variant_price:
          selectedVariant.variant_price,

        variant_stock:
          selectedVariant.variant_stock,
      });

    if (!result?.success) {
      showMessage(
        result?.error ||
          "Unable to buy this product."
      );

      return;
    }

    navigate("/checkout");
  }

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="product-details-page">
          <div className="product-details-loading">
            Loading product...
          </div>
        </div>
      </>
    );
  }

  // =========================================
  // ERROR
  // =========================================

  if (error || !product) {
    return (
      <>
        <Navbar />

        <div className="product-details-page">
          <div className="product-details-error">

            <h2>
              Product not found
            </h2>

            {error && (
              <p>{error}</p>
            )}

            <Link to="/products">
              ← Back to products
            </Link>

          </div>
        </div>
      </>
    );
  }

  // =========================================
  // CURRENT PRICE / STOCK
  // =========================================

  const currentPrice =
    selectedVariant
      ? selectedVariant.variant_price
      : Number(product.price || 0);

  const currentStock =
    selectedVariant
      ? selectedVariant.variant_stock
      : 0;

  return (
    <>
      {/* =====================================
          NAVBAR
      ====================================== */}

      <Navbar />

      {/* =====================================
          PRODUCT PAGE
      ====================================== */}

      <div className="product-details-page">

        {/* =====================================
            TOAST
        ====================================== */}

        {message && (
          <div className="cart-message">

            <div className="cart-message-icon">
              ✓
            </div>

            <div className="cart-message-text">
              {message}
            </div>

          </div>
        )}

        <div className="product-details-container">

          {/* ===================================
              BACK BUTTON
          ==================================== */}

          <Link
            to="/products"
            className="product-back-link"
          >
            ← Back to products
          </Link>

          <div className="product-details-content">

            {/* =================================
                LEFT - IMAGE GALLERY
            ================================== */}

            <div className="product-gallery">

              <div className="product-main-image">

                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={product.name}
                  />
                ) : (
                  <div className="no-image">
                    No image available
                  </div>
                )}

              </div>

              {/* =================================
                  THUMBNAILS
              ================================== */}

              {images.length > 0 && (
                <div className="product-thumbnails">

                  {images.map(
                    (image) => (
                      <button
                        key={image.id}
                        type="button"
                        className={`product-thumbnail ${
                          selectedImage ===
                          image.image_url
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedImage(
                            image.image_url
                          )
                        }
                        aria-label={`Select image ${
                          image.sort_order + 1
                        }`}
                      >
                        <img
                          src={
                            image.image_url
                          }
                          alt={
                            image.alt_text ||
                            product.name
                          }
                        />
                      </button>
                    )
                  )}

                </div>
              )}

            </div>

            {/* =================================
                RIGHT - PRODUCT INFORMATION
            ================================== */}

            <div className="product-info">

              <h1 className="product-title">
                {product.name}
              </h1>

              <div className="product-price">
                ${currentPrice.toFixed(2)}
              </div>

              {/* =================================
                  VARIANTS
              ================================== */}

              {variants.length > 0 && (
                <div className="product-variants">

                  <h3>
                    Variant
                  </h3>

                  <div className="variant-list">

                    {variants.map(
                      (variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          className={`variant-button ${
                            selectedVariant?.id ===
                            variant.id
                              ? "selected"
                              : ""
                          } ${
                            variant.variant_stock <=
                            0
                              ? "disabled"
                              : ""
                          }`}
                          onClick={() => {
                            if (
                              variant.variant_stock >
                              0
                            ) {
                              setSelectedVariant(
                                variant
                              );
                            }
                          }}
                          disabled={
                            variant.variant_stock <=
                            0
                          }
                        >

                          <span className="variant-name">
                            {variant.name}
                          </span>

                          <span className="variant-price">
                            $
                            {variant.variant_price.toFixed(
                              2
                            )}
                          </span>

                        </button>
                      )
                    )}

                  </div>

                </div>
              )}

              {/* =================================
                  STOCK
              ================================== */}

              <div className="product-stock">

                {currentStock > 0 ? (
                  <>
                    <span className="stock-label">
                      In stock
                    </span>

                    <span className="stock-number">
                      {currentStock} available
                    </span>
                  </>
                ) : (
                  <span className="out-of-stock">
                    Out of stock
                  </span>
                )}

              </div>

              {/* =================================
                  SKU
              ================================== */}

              {selectedVariant?.sku && (
                <div className="product-sku">
                  SKU: {selectedVariant.sku}
                </div>
              )}

              {/* =================================
                  ACTION BUTTONS
              ================================== */}

              <div className="product-action-buttons">

                <button
                  type="button"
                  className="add-to-cart-button"
                  onClick={
                    handleAddToCart
                  }
                  disabled={
                    !selectedVariant ||
                    currentStock <= 0
                  }
                >
                  {currentStock > 0
                    ? "Add to Cart"
                    : "Out of Stock"}
                </button>

                <button
                  type="button"
                  className="buy-now-button"
                  onClick={
                    handleBuyNow
                  }
                  disabled={
                    !selectedVariant ||
                    currentStock <= 0
                  }
                >
                  Buy Now
                </button>

              </div>

              {/* =================================
                  DESCRIPTION
              ================================== */}

              <div className="product-description">

                <h2>
                  Description
                </h2>

                <p>
                  {product.description ||
                    "No description available."}
                </p>

              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default ProductDetails;