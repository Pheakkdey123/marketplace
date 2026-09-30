
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useCart } from "../context/CartContext";
import Navbar from "../components/Navbar";
import "../styles/ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");

  const [options, setOptions] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError("");

      // ==========================================
      // LOAD PRODUCT
      // ==========================================

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (productError) {
        setError(productError.message);
        setLoading(false);
        return;
      }

      setProduct(productData);

      // ==========================================
      // LOAD PRODUCT IMAGES
      // ==========================================

      const {
        data: imageData,
        error: imageError,
      } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", id)
        .order("sort_order", {
          ascending: true,
        });

      if (imageError) {
        console.error(
          "Load product images error:",
          imageError
        );

        if (productData.image_url) {
          const fallbackImage = {
            id: "fallback",
            image_url: productData.image_url,
            alt_text: productData.name,
            sort_order: 0,
            is_primary: true,
          };

          setImages([fallbackImage]);
          setSelectedImage(productData.image_url);
        }
      } else {
        const loadedImages = imageData || [];

        if (loadedImages.length > 0) {
          setImages(loadedImages);

          const primaryImage =
            loadedImages.find(
              (image) => image.is_primary
            ) || loadedImages[0];

          setSelectedImage(primaryImage.image_url);
        } else if (productData.image_url) {
          const fallbackImage = {
            id: "fallback",
            image_url: productData.image_url,
            alt_text: productData.name,
            sort_order: 0,
            is_primary: true,
          };

          setImages([fallbackImage]);
          setSelectedImage(productData.image_url);
        }
      }

      // ==========================================
      // LOAD PRODUCT OPTIONS
      // ==========================================

      const {
        data: optionData,
        error: optionError,
      } = await supabase
        .from("product_options")
        .select(`
          id,
          name,
          sort_order,
          is_active,
          product_option_values (
            id,
            value,
            sort_order,
            is_active
          )
        `)
        .eq("product_id", id)
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        });

      if (optionError) {
        console.error(
          "Load product options error:",
          optionError
        );
      } else {
        const loadedOptions = (optionData || []).map(
          (option) => ({
            ...option,
            product_option_values: (
              option.product_option_values || []
            )
              .filter(
                (value) => value.is_active
              )
              .sort(
                (a, b) =>
                  a.sort_order - b.sort_order
              ),
          })
        );

        setOptions(loadedOptions);

        const initialSelections = {};

        loadedOptions.forEach((option) => {
          if (
            option.product_option_values.length > 0
          ) {
            initialSelections[option.id] =
              option.product_option_values[0].id;
          }
        });

        setSelectedOptions(initialSelections);
      }

      // ==========================================
      // LOAD VARIANTS + INVENTORY
      // ==========================================

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
          is_active,

          product_variant_options (
            option_value_id
          ),

          inventory (
            quantity,
            reserved_quantity
          )
        `)
        .eq("product_id", id)
        .eq("is_active", true)
        .order("id", {
          ascending: true,
        });

      if (variantError) {
        console.error(
          "Load product variants error:",
          variantError
        );

        setError(variantError.message);
        setLoading(false);
        return;
      }

      // ==========================================
      // CALCULATE AVAILABLE STOCK
      // ==========================================

      const variantsWithInventory =
        (variantData || []).map((variant) => {
          /*
            Supabase can return the one-to-one
            inventory relationship as an object
            or as an array depending on the
            relationship/query.

            Handle both formats.
          */

          const inventoryData = variant.inventory;

          const inventory = Array.isArray(
            inventoryData
          )
            ? inventoryData[0]
            : inventoryData;

          const quantity =
            Number(inventory?.quantity) || 0;

          const reservedQuantity =
            Number(
              inventory?.reserved_quantity
            ) || 0;

          const availableStock =
            quantity - reservedQuantity;

          return {
            ...variant,
            available_stock: availableStock,
          };
        });

      console.log(
        "Variants with inventory:",
        variantsWithInventory
      );

      setVariants(variantsWithInventory);

      setLoading(false);
    }

    loadProduct();
  }, [id]);

  // ==========================================
  // FIND SELECTED VARIANT
  // ==========================================

  useEffect(() => {
    if (
      variants.length === 0 ||
      Object.keys(selectedOptions).length === 0
    ) {
      setSelectedVariant(null);
      return;
    }

    const selectedValueIds =
      Object.values(selectedOptions);

    const matchingVariant = variants.find(
      (variant) => {
        const variantValueIds = (
          variant.product_variant_options || []
        ).map(
          (item) => item.option_value_id
        );

        if (
          variantValueIds.length !==
          selectedValueIds.length
        ) {
          return false;
        }

        return selectedValueIds.every(
          (valueId) =>
            variantValueIds.includes(valueId)
        );
      }
    );

    setSelectedVariant(
      matchingVariant || null
    );
  }, [selectedOptions, variants]);

  // ==========================================
  // SELECT OPTION
  // ==========================================

  const handleOptionChange = (
    optionId,
    valueId
  ) => {
    setSelectedOptions((current) => ({
      ...current,
      [optionId]: valueId,
    }));
  };

  // ==========================================
  // CREATE CART ITEM
  // ==========================================

  const createCartItem = () => {
    if (!selectedVariant) {
      return null;
    }

    return {
      ...product,

      variant_id:
        selectedVariant.id,

      variant_sku:
        selectedVariant.sku,

      variant_name:
        selectedVariant.name,

      variant_price:
        selectedVariant.price ??
        product.price,

      variant_stock:
        selectedVariant.available_stock,
    };
  };

  // ==========================================
  // ADD TO CART
  // ==========================================

  const handleAddToCart = () => {
    if (!selectedVariant) {
      alert(
        "Please select product options."
      );
      return;
    }

    if (
      selectedVariant.available_stock <= 0
    ) {
      alert(
        "This variant is out of stock."
      );
      return;
    }

    const cartItem = createCartItem();

    if (cartItem) {
      addToCart(cartItem);
    }
  };

  // ==========================================
  // BUY NOW
  // ==========================================

  const handleBuyNow = async () => {
    if (!selectedVariant) {
      alert(
        "Please select product options."
      );
      return;
    }

    if (
      selectedVariant.available_stock <= 0
    ) {
      alert(
        "This variant is out of stock."
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate(
        `/login?redirect=${encodeURIComponent(
          `/products/${id}`
        )}`
      );

      return;
    }

    const cartItem = createCartItem();

    if (cartItem) {
      addToCart(cartItem);
    }

    navigate("/checkout");
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="home">
        <Navbar />

        <main className="featured">
          <div className="product-details-loading">
            Loading product...
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (error || !product) {
    return (
      <div className="home">
        <Navbar />

        <main className="featured">
          <div className="product-details-error">
            <h1>
              Product not found
            </h1>

            {error && (
              <p>{error}</p>
            )}

            <Link to="/products">
              ← Back to products
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // DISPLAY VALUES
  // ==========================================

  const displayPrice =
    selectedVariant?.price ??
    product.price;

  const displayStock =
    selectedVariant?.available_stock ?? 0;

  const isOutOfStock =
    !selectedVariant ||
    displayStock <= 0;

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="home">
      <Navbar />

      <main className="featured">

        <Link
          to="/products"
          className="view-all"
        >
          ← Back to products
        </Link>

        <div className="product-details-layout">

          {/* ====================================
              GALLERY
          ==================================== */}

          <div className="product-gallery">

            <div className="product-main-image">

              {selectedImage && (
                <img
                  src={selectedImage}
                  alt={product.name}
                />
              )}

            </div>

            {images.length > 1 && (
              <div className="product-thumbnails">

                {images.map((image) => (
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
                  >
                    <img
                      src={image.image_url}
                      alt={
                        image.alt_text ||
                        product.name
                      }
                    />
                  </button>
                ))}

              </div>
            )}

          </div>

          {/* ====================================
              PRODUCT INFORMATION
          ==================================== */}

          <div className="product-details-info">

            <p className="section-small">
              {product.category}
            </p>

            <h1>
              {product.name}
            </h1>

            <h2 className="product-details-price">
              $
              {Number(displayPrice).toFixed(2)}
            </h2>

            {product.description && (
              <p className="product-details-description">
                {product.description}
              </p>
            )}

            {/* ==================================
                OPTIONS
            ================================== */}

            {options.length > 0 && (
              <div className="product-options">

                {options.map((option) => (
                  <div
                    key={option.id}
                    className="product-option-group"
                  >

                    <h3>
                      {option.name}
                    </h3>

                    <div className="product-option-values">

                      {option.product_option_values.map(
                        (value) => (
                          <button
                            key={value.id}
                            type="button"
                            className={`product-option-value ${
                              selectedOptions[
                                option.id
                              ] === value.id
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              handleOptionChange(
                                option.id,
                                value.id
                              )
                            }
                          >
                            {value.value}
                          </button>
                        )
                      )}

                    </div>

                  </div>
                ))}

              </div>
            )}

            {/* ==================================
                SELECTED VARIANT
            ================================== */}

            {selectedVariant && (
              <div className="selected-variant">

                <p>
                  SKU:
                  <strong>
                    {selectedVariant.sku}
                  </strong>
                </p>

              </div>
            )}

            {/* ==================================
                STOCK
            ================================== */}

            <p className="product-details-stock">
              Stock: {displayStock}
            </p>

            {/* ==================================
                ACTIONS
            ================================== */}

            <div className="product-details-actions">

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="product-add-cart"
              >
                {!selectedVariant
                  ? "Select Options"
                  : displayStock > 0
                  ? "Add to Cart"
                  : "Out of Stock"}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="product-buy-now"
              >
                {!selectedVariant
                  ? "Select Options"
                  : displayStock > 0
                  ? "Buy Now"
                  : "Out of Stock"}
              </button>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}

export default ProductDetails;

