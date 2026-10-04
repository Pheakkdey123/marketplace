
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/add-product.css";

function AddProduct() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
  });

  const [images, setImages] = useState([]);

  const [variants, setVariants] = useState([
    {
      name: "",
      sku: "",
      price: "",
      quantity: "",
    },
  ]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      setError("");

      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      setCategories(data || []);
    } catch (err) {
      console.error("Category error:", err);
      setError(
        err.message || "Failed to load categories."
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(
      e.target.files || []
    );

    if (selectedFiles.length === 0) return;

    setError("");
    setSuccess("");

    const validImages = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        setError(
          `"${file.name}" is not a valid image.`
        );
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(
          `"${file.name}" is larger than 5 MB.`
        );
        continue;
      }

      validImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        isPrimary: images.length === 0 && validImages.length === 0,
      });
    }

    if (validImages.length > 0) {
      setImages((current) => [
        ...current,
        ...validImages,
      ]);
    }

    e.target.value = "";
  };

  const removeImage = (imageId) => {
    setImages((current) => {
      const imageToRemove = current.find(
        (image) => image.id === imageId
      );

      if (imageToRemove?.preview) {
        URL.revokeObjectURL(
          imageToRemove.preview
        );
      }

      const remaining = current.filter(
        (image) => image.id !== imageId
      );

      if (
        imageToRemove?.isPrimary &&
        remaining.length > 0
      ) {
        remaining[0].isPrimary = true;
      }

      return remaining;
    });

    setError("");
  };

  const setPrimaryImage = (imageId) => {
    setImages((current) =>
      current.map((image) => ({
        ...image,
        isPrimary: image.id === imageId,
      }))
    );
  };

  const moveImage = (index, direction) => {
    setImages((current) => {
      const newImages = [...current];

      const newIndex =
        direction === "left"
          ? index - 1
          : index + 1;

      if (
        newIndex < 0 ||
        newIndex >= newImages.length
      ) {
        return current;
      }

      [
        newImages[index],
        newImages[newIndex],
      ] = [
        newImages[newIndex],
        newImages[index],
      ];

      return newImages;
    });
  };

  const handleVariantChange = (
    index,
    field,
    value
  ) => {
    setVariants((current) =>
      current.map((variant, i) =>
        i === index
          ? {
              ...variant,
              [field]: value,
            }
          : variant
      )
    );

    setError("");
    setSuccess("");
  };

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      {
        name: "",
        sku: "",
        price: "",
        quantity: "",
      },
    ]);
  };

  const removeVariant = (index) => {
    setVariants((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const uploadImage = async (userId, image) => {
    const extension =
      image.file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("product-images")
        .upload(filePath, image.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: image.file.type,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error(
        "Failed to get image URL."
      );
    }

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error(
          "You must be logged in to add a product."
        );
      }

      const productName = form.name.trim();

      if (!productName) {
        throw new Error(
          "Product name is required."
        );
      }

      if (!form.category_id) {
        throw new Error(
          "Please select a category."
        );
      }

      if (
        form.price === "" ||
        Number.isNaN(Number(form.price)) ||
        Number(form.price) < 0
      ) {
        throw new Error(
          "Please enter a valid product price."
        );
      }

      const cleanedVariants = variants
        .filter(
          (variant) =>
            variant.name.trim() ||
            variant.sku.trim() ||
            variant.price !== "" ||
            variant.quantity !== ""
        )
        .map((variant) => ({
          name: variant.name.trim(),
          sku: variant.sku.trim(),
          price:
            variant.price === ""
              ? Number(form.price)
              : Number(variant.price),
          quantity:
            variant.quantity === ""
              ? 0
              : Number(variant.quantity),
        }));

      for (const variant of cleanedVariants) {
        if (!variant.name) {
          throw new Error(
            "Every variant must have a name."
          );
        }

        if (
          Number.isNaN(variant.price) ||
          variant.price < 0
        ) {
          throw new Error(
            "Every variant must have a valid price."
          );
        }

        if (
          Number.isNaN(variant.quantity) ||
          variant.quantity < 0
        ) {
          throw new Error(
            "Every variant must have a valid quantity."
          );
        }
      }

      /*
       * Upload all images first
       */
      const uploadedImages = [];

      for (const image of images) {
        const imageUrl = await uploadImage(
          user.id,
          image
        );

        uploadedImages.push({
          ...image,
          imageUrl,
        });
      }

      /*
       * Find primary image
       */
      const primaryImage =
        uploadedImages.find(
          (image) => image.isPrimary
        ) || uploadedImages[0];

      /*
       * Create product
       */
      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .insert({
          seller_id: user.id,
          category_id: Number(form.category_id),
          name: productName,
          description:
            form.description.trim() || null,
          price: Number(form.price),
          image_url:
            primaryImage?.imageUrl || null,
          is_active: true,
        })
        .select()
        .single();

      if (productError) {
        throw productError;
      }

      /*
       * Save all images
       */
      if (uploadedImages.length > 0) {
        const imageRows =
          uploadedImages.map(
            (image, index) => ({
              product_id: product.id,
              variant_id: null,
              image_url: image.imageUrl,
              alt_text: productName,
              sort_order: index,
              is_primary:
                image.id ===
                primaryImage?.id,
            })
          );

        const { error: imagesError } =
          await supabase
            .from("product_images")
            .insert(imageRows);

        if (imagesError) {
          throw imagesError;
        }
      }

      /*
       * Create variants + inventory
       */
      if (cleanedVariants.length > 0) {
        for (const variant of cleanedVariants) {
          const {
            data: createdVariant,
            error: variantError,
          } = await supabase
            .from("product_variants")
            .insert({
              product_id: product.id,
              name: variant.name,
              sku: variant.sku || null,
              price: variant.price,
              is_active: true,
            })
            .select()
            .single();

          if (variantError) {
            throw variantError;
          }

          const {
            error: inventoryError,
          } = await supabase
            .from("inventory")
            .insert({
              variant_id:
                createdVariant.id,
              quantity: variant.quantity,
              reserved_quantity: 0,
            });

          if (inventoryError) {
            throw inventoryError;
          }
        }
      }

      setSuccess(
        "Product created successfully."
      );

      setTimeout(() => {
        navigate("/dashboard/products");
      }, 800);
    } catch (err) {
      console.error(
        "Add product error:",
        err
      );

      setError(
        err.message ||
          "Failed to create product."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingCategories) {
    return (
      <div className="add-product-page">
        <div className="dashboard-loading">
          Loading categories...
        </div>
      </div>
    );
  }

  return (
    <div className="add-product-page">
      {/* HEADER */}

      <div className="dashboard-page-header">
        <div>
          <h2>Add Product</h2>

          <p>
            Create a new product for your store.
          </p>
        </div>

        <Link
          to="/dashboard/products"
          className="dashboard-btn dashboard-btn-secondary"
        >
          ← Back to Products
        </Link>
      </div>

      {/* MESSAGES */}

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {success && (
        <div className="add-product-success">
          {success}
        </div>
      )}

      <form
        className="add-product-form"
        onSubmit={handleSubmit}
      >
        {/* BASIC INFORMATION */}

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>Basic Information</h3>

              <p>
                Enter the main information about
                your product.
              </p>
            </div>
          </div>

          <div className="add-product-grid">
            {/* PRODUCT NAME */}

            <div className="add-product-field full">
              <label>
                Product Name{" "}
                <span>*</span>
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter product name"
                required
              />
            </div>

            {/* CATEGORY */}

            <div className="add-product-field">
              <label>
                Category{" "}
                <span>*</span>
              </label>

              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* BASE PRICE */}

            <div className="add-product-field">
              <label>
                Base Price{" "}
                <span>*</span>
              </label>

              <div className="add-product-price-input">
                <span>$</span>

                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* MULTIPLE IMAGES */}

            <div className="add-product-field full">
              <label>
                Product Images
              </label>

              <div className="add-product-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={
                    handleImageChange
                  }
                />

                <div className="add-product-upload-hint">
                  Select multiple images.
                  Each image must be smaller
                  than 5 MB.
                </div>

                {images.length > 0 && (
                  <div className="add-product-images">
                    {images.map(
                      (image, index) => (
                        <div
                          className={`add-product-image-item ${
                            image.isPrimary
                              ? "is-primary"
                              : ""
                          }`}
                          key={image.id}
                        >
                          <div className="add-product-image-preview">
                            <img
                              src={
                                image.preview
                              }
                              alt={`Product ${
                                index + 1
                              }`}
                            />

                            {image.isPrimary && (
                              <span className="add-product-primary-badge">
                                Primary
                              </span>
                            )}
                          </div>

                          <div className="add-product-image-actions">
                            <button
                              type="button"
                              onClick={() =>
                                setPrimaryImage(
                                  image.id
                                )
                              }
                              disabled={
                                image.isPrimary
                              }
                              title="Set as primary"
                            >
                              ★
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveImage(
                                  index,
                                  "left"
                                )
                              }
                              disabled={
                                index === 0
                              }
                              title="Move left"
                            >
                              ←
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveImage(
                                  index,
                                  "right"
                                )
                              }
                              disabled={
                                index ===
                                images.length -
                                  1
                              }
                              title="Move right"
                            >
                              →
                            </button>

                            <button
                              type="button"
                              className="remove"
                              onClick={() =>
                                removeImage(
                                  image.id
                                )
                              }
                              title="Remove image"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <small>
                The primary image will be used
                as the main product image.
              </small>
            </div>

            {/* DESCRIPTION */}

            <div className="add-product-field full">
              <label>
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe your product..."
                rows="6"
              />
            </div>
          </div>
        </div>

        {/* VARIANTS */}

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>
                Product Variants
              </h3>

              <p>
                Add sizes, colors, models,
                storage options, or other
                product variations.
              </p>
            </div>

            <button
              type="button"
              className="dashboard-btn dashboard-btn-primary"
              onClick={addVariant}
            >
              + Add Variant
            </button>
          </div>

          <div className="add-product-variants">
            {variants.map(
              (variant, index) => (
                <div
                  className="add-product-variant"
                  key={index}
                >
                  <div className="add-product-variant-number">
                    {index + 1}
                  </div>

                  <div className="add-product-variant-fields">
                    <div className="add-product-field">
                      <label>
                        Variant Name
                      </label>

                      <input
                        type="text"
                        value={
                          variant.name
                        }
                        onChange={(e) =>
                          handleVariantChange(
                            index,
                            "name",
                            e.target
                              .value
                          )
                        }
                        placeholder="e.g. Red / M"
                      />
                    </div>

                    <div className="add-product-field">
                      <label>
                        SKU
                      </label>

                      <input
                        type="text"
                        value={
                          variant.sku
                        }
                        onChange={(e) =>
                          handleVariantChange(
                            index,
                            "sku",
                            e.target
                              .value
                          )
                        }
                        placeholder="e.g. PROD-RED-M"
                      />
                    </div>

                    <div className="add-product-field">
                      <label>
                        Price
                      </label>

                      <div className="add-product-price-input">
                        <span>$</span>

                        <input
                          type="number"
                          value={
                            variant.price
                          }
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "price",
                              e.target
                                .value
                            )
                          }
                          placeholder={
                            form.price ||
                            "0.00"
                          }
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="add-product-field">
                      <label>
                        Initial Stock
                      </label>

                      <input
                        type="number"
                        value={
                          variant.quantity
                        }
                        onChange={(e) =>
                          handleVariantChange(
                            index,
                            "quantity",
                            e.target
                              .value
                          )
                        }
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </div>
                  </div>

                  {variants.length > 1 && (
                    <button
                      type="button"
                      className="add-product-remove-variant"
                      onClick={() =>
                        removeVariant(
                          index
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          <div className="add-product-variant-note">
            <strong>Tip:</strong>{" "}
            You can leave variants empty if
            your product does not need
            variants.
          </div>
        </div>

        {/* ACTIONS */}

        <div className="add-product-actions">
          <Link
            to="/dashboard/products"
            className="dashboard-btn dashboard-btn-secondary"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="dashboard-btn dashboard-btn-primary"
            disabled={loading}
          >
            {loading
              ? "Creating Product..."
              : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddProduct;

