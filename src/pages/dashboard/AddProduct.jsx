import { useEffect, useMemo, useState } from "react";
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

  /*
   * Example:
   *
   * Color
   *   Red
   *   Blue
   *
   * Storage
   *   128GB
   *   256GB
   *   512GB
   */
  const [options, setOptions] = useState([]);

  /*
   * Generated combinations.
   *
   * Example:
   *
   * {
   *   id: "...",
   *   values: {
   *     Color: "Red",
   *     Storage: "128GB"
   *   },
   *   sku: "",
   *   price: "",
   *   quantity: ""
   * }
   */
  const [generatedVariants, setGeneratedVariants] = useState([]);

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
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoadingCategories(false);
    }
  };

  /* =========================================================
     BASIC PRODUCT
  ========================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* =========================================================
     IMAGES
  ========================================================= */

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    setError("");
    setSuccess("");

    const validImages = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" is not a valid image.`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" is larger than 5 MB.`);
        continue;
      }

      validImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        isPrimary:
          images.length === 0 && validImages.length === 0,
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
        URL.revokeObjectURL(imageToRemove.preview);
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

  /* =========================================================
     OPTIONS
  ========================================================= */

  const addOption = () => {
    setOptions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        values: [""],
      },
    ]);

    setGeneratedVariants([]);
  };

  const removeOption = (optionId) => {
    setOptions((current) =>
      current.filter(
        (option) => option.id !== optionId
      )
    );

    setGeneratedVariants([]);
  };

  const updateOptionName = (optionId, value) => {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              name: value,
            }
          : option
      )
    );

    setGeneratedVariants([]);
  };

  const updateOptionValue = (
    optionId,
    valueIndex,
    value
  ) => {
    setOptions((current) =>
      current.map((option) => {
        if (option.id !== optionId) {
          return option;
        }

        const newValues = [...option.values];

        newValues[valueIndex] = value;

        return {
          ...option,
          values: newValues,
        };
      })
    );

    setGeneratedVariants([]);
  };

  const addOptionValue = (optionId) => {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId
          ? {
              ...option,
              values: [
                ...option.values,
                "",
              ],
            }
          : option
      )
    );

    setGeneratedVariants([]);
  };

  const removeOptionValue = (
    optionId,
    valueIndex
  ) => {
    setOptions((current) =>
      current.map((option) => {
        if (option.id !== optionId) {
          return option;
        }

        if (option.values.length <= 1) {
          return option;
        }

        return {
          ...option,
          values: option.values.filter(
            (_, index) =>
              index !== valueIndex
          ),
        };
      })
    );

    setGeneratedVariants([]);
  };

  /* =========================================================
     GENERATE COMBINATIONS
  ========================================================= */

  const validOptions = useMemo(() => {
    return options
      .map((option) => ({
        ...option,
        name: option.name.trim(),
        values: option.values
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter(
        (option) =>
          option.name &&
          option.values.length > 0
      );
  }, [options]);

  const createCombinations = (
    optionList
  ) => {
    if (optionList.length === 0) {
      return [];
    }

    let combinations = [
      {},
    ];

    for (const option of optionList) {
      const next = [];

      for (const combination of combinations) {
        for (const value of option.values) {
          next.push({
            ...combination,
            [option.name]: value,
          });
        }
      }

      combinations = next;
    }

    return combinations;
  };

  const generateVariants = () => {
    setError("");
    setSuccess("");

    if (validOptions.length === 0) {
      setError(
        "Please add at least one valid option with values."
      );
      return;
    }

    const combinations =
      createCombinations(validOptions);

    if (combinations.length === 0) {
      setError(
        "Unable to generate product variants."
      );
      return;
    }

    const newVariants = combinations.map(
      (values) => ({
        id: crypto.randomUUID(),
        values,
        sku: "",
        price: form.price || "",
        quantity: "",
      })
    );

    setGeneratedVariants(
      newVariants
    );
  };

  /* =========================================================
     VARIANT EDIT
  ========================================================= */

  const updateGeneratedVariant = (
    variantId,
    field,
    value
  ) => {
    setGeneratedVariants((current) =>
      current.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              [field]: value,
            }
          : variant
      )
    );

    setError("");
  };

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const uploadImage = async (
    userId,
    image
  ) => {
    const extension =
      image.file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath =
      `${userId}/${fileName}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("product-images")
      .upload(
        filePath,
        image.file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            image.file.type,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data,
    } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error(
        "Failed to get image URL."
      );
    }

    return data.publicUrl;
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const {
        data: {
          user,
        },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in to add a product."
        );
      }

      /* ---------------------------------------------
         BASIC VALIDATION
      --------------------------------------------- */

      const productName =
        form.name.trim();

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
        Number.isNaN(
          Number(form.price)
        ) ||
        Number(form.price) < 0
      ) {
        throw new Error(
          "Please enter a valid product price."
        );
      }

      /* ---------------------------------------------
         VALIDATE GENERATED VARIANTS
      --------------------------------------------- */

      const cleanedVariants =
        generatedVariants.map(
          (variant) => ({
            ...variant,
            sku:
              variant.sku.trim(),
            price:
              variant.price === ""
                ? Number(form.price)
                : Number(variant.price),
            quantity:
              variant.quantity === ""
                ? 0
                : Number(
                    variant.quantity
                  ),
          })
        );

      for (
        let i = 0;
        i < cleanedVariants.length;
        i++
      ) {
        const variant =
          cleanedVariants[i];

        if (
          Number.isNaN(
            variant.price
          ) ||
          variant.price < 0
        ) {
          throw new Error(
            `Variant ${
              i + 1
            } has an invalid price.`
          );
        }

        if (
          Number.isNaN(
            variant.quantity
          ) ||
          variant.quantity < 0
        ) {
          throw new Error(
            `Variant ${
              i + 1
            } has an invalid stock quantity.`
          );
        }
      }

      /* ---------------------------------------------
         UPLOAD IMAGES
      --------------------------------------------- */

      const uploadedImages = [];

      for (const image of images) {
        const imageUrl =
          await uploadImage(
            user.id,
            image
          );

        uploadedImages.push({
          ...image,
          imageUrl,
        });
      }

      const primaryImage =
        uploadedImages.find(
          (image) =>
            image.isPrimary
        ) ||
        uploadedImages[0];

      /* ---------------------------------------------
         CREATE PRODUCT
      --------------------------------------------- */

      const {
        data: product,
        error: productError,
      } =
        await supabase
          .from("products")
          .insert({
            seller_id: user.id,
            category_id:
              Number(
                form.category_id
              ),
            name: productName,
            description:
              form.description.trim() ||
              null,
            price:
              Number(form.price),
            image_url:
              primaryImage?.imageUrl ||
              null,
            is_active: true,
          })
          .select()
          .single();

      if (productError) {
        throw productError;
      }

      /* ---------------------------------------------
         SAVE PRODUCT IMAGES
      --------------------------------------------- */

      if (
        uploadedImages.length > 0
      ) {
        const imageRows =
          uploadedImages.map(
            (image, index) => ({
              product_id:
                product.id,
              variant_id: null,
              image_url:
                image.imageUrl,
              alt_text:
                productName,
              sort_order: index,
              is_primary:
                image.id ===
                primaryImage?.id,
            })
          );

        const {
          error: imagesError,
        } = await supabase
          .from("product_images")
          .insert(
            imageRows
          );

        if (imagesError) {
          throw imagesError;
        }
      }

      /* ---------------------------------------------
         CREATE VARIANTS
      --------------------------------------------- */

      for (
        const variant of
          cleanedVariants
      ) {
        const optionText =
          Object.entries(
            variant.values
          )
            .map(
              ([name, value]) =>
                `${name}: ${value}`
            )
            .join(" / ");

        const variantName =
          optionText ||
          productName;

        const {
          data:
            createdVariant,
          error:
            variantError,
        } =
          await supabase
            .from(
              "product_variants"
            )
            .insert({
              product_id:
                product.id,

              name:
                variantName,

              sku:
                variant.sku ||
                null,

              price:
                variant.price,

              is_active:
                true,
            })
            .select()
            .single();

        if (variantError) {
          throw variantError;
        }

        /* ---------------------------------------------
           INVENTORY
        --------------------------------------------- */

        const {
          error:
            inventoryError,
        } =
          await supabase
            .from("inventory")
            .insert({
              variant_id:
                createdVariant.id,

              quantity:
                variant.quantity,

              reserved_quantity: 0,
            });

        if (inventoryError) {
          throw inventoryError;
        }
      }

      setSuccess(
        "Product created successfully."
      );

      setTimeout(() => {
        navigate(
          "/dashboard/products"
        );
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

  /* =========================================================
     LOADING
  ========================================================= */

  if (loadingCategories) {
    return (
      <div className="add-product-page">
        <div className="dashboard-loading">
          Loading categories...
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

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

        {/* =================================================
            BASIC INFORMATION
        ================================================= */}

        <div className="dashboard-card">

          <div className="dashboard-card-header">
            <div>
              <h3>
                Basic Information
              </h3>

              <p>
                Enter the main information
                about your product.
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
                value={
                  form.category_id
                }
                onChange={
                  handleChange
                }
                required
              >

                <option value="">
                  Select category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
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
                  value={
                    form.price
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />

              </div>

            </div>

            {/* IMAGES */}

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
                  Each image must be
                  smaller than 5 MB.
                </div>

                {images.length >
                  0 && (
                  <div className="add-product-images">

                    {images.map(
                      (
                        image,
                        index
                      ) => (
                        <div
                          className={`add-product-image-item ${
                            image.isPrimary
                              ? "is-primary"
                              : ""
                          }`}
                          key={
                            image.id
                          }
                        >

                          <div className="add-product-image-preview">

                            <img
                              src={
                                image.preview
                              }
                              alt={`Product ${
                                index +
                                1
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
                                index ===
                                0
                              }
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
                The primary image will
                be used as the main
                product image.
              </small>

            </div>

            {/* DESCRIPTION */}

            <div className="add-product-field full">

              <label>
                Description
              </label>

              <textarea
                name="description"
                value={
                  form.description
                }
                onChange={
                  handleChange
                }
                placeholder="Describe your product..."
                rows="6"
              />

            </div>

          </div>

        </div>

        {/* =================================================
            PRODUCT OPTIONS
        ================================================= */}

        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <h3>
                Product Options
              </h3>

              <p>
                Add options such as
                Color, Storage, Model,
                Size, RAM, etc.
              </p>
            </div>

            <button
              type="button"
              className="dashboard-btn dashboard-btn-primary"
              onClick={addOption}
            >
              + Add Option
            </button>

          </div>

          <div className="product-options">

            {options.length ===
              0 ? (
              <div className="product-options-empty">

                <p>
                  No options added yet.
                </p>

                <button
                  type="button"
                  className="dashboard-btn dashboard-btn-secondary"
                  onClick={addOption}
                >
                  + Add First Option
                </button>

              </div>
            ) : (
              options.map(
                (
                  option,
                  optionIndex
                ) => (
                  <div
                    className="product-option"
                    key={
                      option.id
                    }
                  >

                    <div className="product-option-header">

                      <strong>
                        Option{" "}
                        {optionIndex +
                          1}
                      </strong>

                      <button
                        type="button"
                        className="product-option-remove"
                        onClick={() =>
                          removeOption(
                            option.id
                          )
                        }
                      >
                        Remove option
                      </button>

                    </div>

                    {/* OPTION NAME */}

                    <div className="add-product-field">

                      <label>
                        Option Name
                      </label>

                      <input
                        type="text"
                        value={
                          option.name
                        }
                        onChange={(e) =>
                          updateOptionName(
                            option.id,
                            e.target
                              .value
                          )
                        }
                        placeholder="e.g. Color, Storage, Size, Model"
                      />

                    </div>

                    {/* OPTION VALUES */}

                    <div className="add-product-field">

                      <label>
                        Values
                      </label>

                      <div className="product-option-values">

                        {option.values.map(
                          (
                            value,
                            valueIndex
                          ) => (
                            <div
                              className="product-option-value"
                              key={
                                valueIndex
                              }
                            >

                              <input
                                type="text"
                                value={
                                  value
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateOptionValue(
                                    option.id,
                                    valueIndex,
                                    e.target
                                      .value
                                  )
                                }
                                placeholder={
                                  valueIndex ===
                                  0
                                    ? "e.g. Red"
                                    : "e.g. Blue"
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeOptionValue(
                                    option.id,
                                    valueIndex
                                  )
                                }
                                disabled={
                                  option
                                    .values
                                    .length <=
                                  1
                                }
                              >
                                ×
                              </button>

                            </div>
                          )
                        )}

                        <button
                          type="button"
                          className="product-option-add-value"
                          onClick={() =>
                            addOptionValue(
                              option.id
                            )
                          }
                        >
                          + Add Value
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )
            )}

          </div>

          {options.length >
            0 && (
            <div className="product-options-generate">

              <button
                type="button"
                className="dashboard-btn dashboard-btn-primary"
                onClick={
                  generateVariants
                }
              >
                Generate Variants
              </button>

              <span>
                Example: Color × Storage
                automatically creates
                every combination.
              </span>

            </div>
          )}

        </div>

        {/* =================================================
            GENERATED VARIANTS
        ================================================= */}

        {generatedVariants.length >
          0 && (
          <div className="dashboard-card">

            <div className="dashboard-card-header">

              <div>
                <h3>
                  Generated Variants
                </h3>

                <p>
                  Set the price, SKU,
                  and stock for each
                  combination.
                </p>
              </div>

              <span className="generated-variant-count">
                {
                  generatedVariants.length
                }{" "}
                variants
              </span>

            </div>

            <div className="generated-variants-wrapper">

              <table className="generated-variants-table">

                <thead>
                  <tr>

                    {validOptions.map(
                      (option) => (
                        <th
                          key={
                            option.id
                          }
                        >
                          {
                            option.name
                          }
                        </th>
                      )
                    )}

                    <th>
                      SKU
                    </th>

                    <th>
                      Price
                    </th>

                    <th>
                      Stock
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {generatedVariants.map(
                    (variant) => (
                      <tr
                        key={
                          variant.id
                        }
                      >

                        {validOptions.map(
                          (
                            option
                          ) => (
                            <td
                              key={
                                option.id
                              }
                            >
                              {
                                variant
                                  .values[
                                  option.name
                                ]
                              }
                            </td>
                          )
                        )}

                        <td>

                          <input
                            type="text"
                            value={
                              variant.sku
                            }
                            onChange={(
                              e
                            ) =>
                              updateGeneratedVariant(
                                variant.id,
                                "sku",
                                e.target
                                  .value
                              )
                            }
                            placeholder="SKU"
                          />

                        </td>

                        <td>

                          <div className="generated-price">

                            <span>
                              $
                            </span>

                            <input
                              type="number"
                              value={
                                variant.price
                              }
                              onChange={(
                                e
                              ) =>
                                updateGeneratedVariant(
                                  variant.id,
                                  "price",
                                  e.target
                                    .value
                                )
                              }
                              min="0"
                              step="0.01"
                            />

                          </div>

                        </td>

                        <td>

                          <input
                            type="number"
                            value={
                              variant.quantity
                            }
                            onChange={(
                              e
                            ) =>
                              updateGeneratedVariant(
                                variant.id,
                                "quantity",
                                e.target
                                  .value
                              )
                            }
                            placeholder="0"
                            min="0"
                            step="1"
                          />

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>
        )}

        {/* =================================================
            ACTIONS
        ================================================= */}

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