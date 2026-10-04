
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../service/supabase";
import "../../styles/dashboard/edit-product.css";

function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const [variants, setVariants] = useState([]);

  useEffect(() => {
    loadProduct();
    loadCategories();

    return () => {
      images.forEach((image) => {
        if (image.preview) {
          URL.revokeObjectURL(image.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Category error:", error);
      return;
    }

    setCategories(data || []);
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You must be logged in.");
      }

      /* =========================
         PRODUCT
      ========================= */

      const {
        data: product,
        error: productError,
      } = await supabase
        .from("products")
        .select(`
          id,
          seller_id,
          name,
          description,
          price,
          image_url,
          category_id,
          is_active
        `)
        .eq("id", id)
        .eq("seller_id", user.id)
        .single();

      if (productError) throw productError;

      setForm({
        name: product.name || "",
        description: product.description || "",
        price:
          product.price !== null
            ? String(product.price)
            : "",
        category_id:
          product.category_id !== null
            ? String(product.category_id)
            : "",
      });

      /* =========================
         IMAGES
      ========================= */

      const {
        data: productImages,
        error: imagesError,
      } = await supabase
        .from("product_images")
        .select(`
          id,
          product_id,
          variant_id,
          image_url,
          alt_text,
          sort_order,
          is_primary
        `)
        .eq("product_id", id)
        .order("sort_order", {
          ascending: true,
        });

      if (imagesError) throw imagesError;

      const existingImages =
        productImages || [];

      /*
       * If old product has image_url but
       * product_images is empty, show it too.
       */
      if (
        existingImages.length === 0 &&
        product.image_url
      ) {
        setImages([
          {
            type: "existing",
            id: `legacy-${product.id}`,
            imageUrl: product.image_url,
            preview: product.image_url,
            isPrimary: true,
            sortOrder: 0,
            removed: false,
          },
        ]);
      } else {
        setImages(
          existingImages.map(
            (image, index) => ({
              type: "existing",
              id: image.id,
              imageUrl: image.image_url,
              preview: image.image_url,
              isPrimary:
                image.is_primary ||
                (index === 0 &&
                  !existingImages.some(
                    (item) =>
                      item.is_primary
                  )),
              sortOrder:
                image.sort_order ?? index,
              removed: false,
            })
          )
        );
      }

      /* =========================
         VARIANTS
      ========================= */

      const {
        data: productVariants,
        error: variantsError,
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
        .order("id");

      if (variantsError) throw variantsError;

      const variantList =
        productVariants || [];

      let inventoryList = [];

      if (variantList.length > 0) {
        const variantIds =
          variantList.map(
            (variant) => variant.id
          );

        const {
          data: inventory,
          error: inventoryError,
        } = await supabase
          .from("inventory")
          .select(`
            id,
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

        inventoryList = inventory || [];
      }

      const inventoryMap = {};

      inventoryList.forEach(
        (inventory) => {
          inventoryMap[
            inventory.variant_id
          ] = inventory;
        }
      );

      setVariants(
        variantList.map((variant) => {
          const inventory =
            inventoryMap[
              variant.id
            ];

          return {
            type: "existing",
            id: variant.id,
            inventoryId:
              inventory?.id || null,
            name: variant.name || "",
            sku: variant.sku || "",
            price:
              variant.price !== null
                ? String(variant.price)
                : "",
            quantity:
              inventory?.quantity !==
              undefined
                ? String(
                    inventory.quantity
                  )
                : "0",
            reservedQuantity:
              inventory?.reserved_quantity ||
              0,
            isActive:
              variant.is_active !== false,
            deleted: false,
          };
        })
      );
    } catch (err) {
      console.error(
        "Load product error:",
        err
      );

      setError(
        err.message ||
          "Failed to load product."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FORM
  ========================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* =========================
     IMAGE UPLOAD
  ========================= */

  const handleImageChange = (e) => {
    const files = Array.from(
      e.target.files || []
    );

    if (files.length === 0) return;

    setError("");

    const newImages = [];

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError(
          `"${file.name}" is not a valid image.`
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(
          `"${file.name}" is larger than 5 MB.`
        );
        return;
      }

      newImages.push({
        type: "new",
        id: crypto.randomUUID(),
        file,
        imageUrl: null,
        preview: URL.createObjectURL(
          file
        ),
        isPrimary:
          images.filter(
            (image) => !image.removed
          ).length === 0 &&
          newImages.length === 0,
        sortOrder: images.length,
        removed: false,
      });
    });

    if (newImages.length > 0) {
      setImages((current) => [
        ...current.filter(
          (image) => !image.removed
        ),
        ...newImages,
      ]);
    }

    e.target.value = "";
  };

  const removeImage = (imageId) => {
    setImages((current) => {
      const target = current.find(
        (image) => image.id === imageId
      );

      if (!target) return current;

      if (
        target.type === "new" &&
        target.preview
      ) {
        URL.revokeObjectURL(
          target.preview
        );
      }

      const updated = current.map(
        (image) =>
          image.id === imageId
            ? {
                ...image,
                removed: true,
              }
            : image
      );

      const remaining =
        updated.filter(
          (image) => !image.removed
        );

      if (
        target.isPrimary &&
        remaining.length > 0
      ) {
        remaining.forEach(
          (image, index) => {
            image.isPrimary =
              index === 0;
          }
        );
      }

      return updated;
    });
  };

  const setPrimaryImage = (imageId) => {
    setImages((current) =>
      current.map((image) => ({
        ...image,
        isPrimary:
          !image.removed &&
          image.id === imageId,
      }))
    );
  };

  const moveImage = (
    index,
    direction
  ) => {
    setImages((current) => {
      const activeImages =
        current.filter(
          (image) => !image.removed
        );

      const newIndex =
        direction === "left"
          ? index - 1
          : index + 1;

      if (
        newIndex < 0 ||
        newIndex >= activeImages.length
      ) {
        return current;
      }

      [
        activeImages[index],
        activeImages[newIndex],
      ] = [
        activeImages[newIndex],
        activeImages[index],
      ];

      return [
        ...activeImages,
        ...current.filter(
          (image) => image.removed
        ),
      ];
    });
  };

  /* =========================
     VARIANTS
  ========================= */

  const handleVariantChange = (
    index,
    field,
    value
  ) => {
    setVariants((current) =>
      current.map(
        (variant, i) =>
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
        type: "new",
        id: crypto.randomUUID(),
        inventoryId: null,
        name: "",
        sku: "",
        price: form.price || "",
        quantity: "0",
        reservedQuantity: 0,
        isActive: true,
        deleted: false,
      },
    ]);
  };

  const removeVariant = (index) => {
    setVariants((current) =>
      current.map(
        (variant, i) =>
          i === index
            ? {
                ...variant,
                deleted: true,
              }
            : variant
      )
    );
  };

  /* =========================
     STORAGE UPLOAD
  ========================= */

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

    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
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

    const { data } =
      supabase.storage
        .from("product-images")
        .getPublicUrl(
          filePath
        );

    if (!data?.publicUrl) {
      throw new Error(
        "Failed to get image URL."
      );
    }

    return data.publicUrl;
  };

  /* =========================
     SAVE
  ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error(
          "You must be logged in."
        );
      }

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

      /* =========================
         VALIDATE VARIANTS
      ========================= */

      const activeVariants =
        variants.filter(
          (variant) =>
            !variant.deleted
        );

      for (const variant of activeVariants) {
        if (!variant.name.trim()) {
          throw new Error(
            "Every variant must have a name."
          );
        }

        if (
          variant.price === "" ||
          Number.isNaN(
            Number(variant.price)
          ) ||
          Number(variant.price) < 0
        ) {
          throw new Error(
            `Invalid price for variant "${variant.name}".`
          );
        }

        if (
          variant.quantity === "" ||
          Number.isNaN(
            Number(variant.quantity)
          ) ||
          Number(variant.quantity) < 0
        ) {
          throw new Error(
            `Invalid stock for variant "${variant.name}".`
          );
        }

        if (
          Number(variant.quantity) <
          Number(
            variant.reservedQuantity || 0
          )
        ) {
          throw new Error(
            `Stock for "${variant.name}" cannot be lower than reserved stock (${variant.reservedQuantity}).`
          );
        }
      }

      /* =========================
         UPDATE PRODUCT
      ========================= */

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            name: productName,
            description:
              form.description.trim() ||
              null,
            price: Number(form.price),
            category_id:
              Number(form.category_id),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .eq("seller_id", user.id);

      if (updateError) {
        throw updateError;
      }

      /* =========================
         DELETE REMOVED IMAGES
      ========================= */

      const removedExistingImages =
        images.filter(
          (image) =>
            image.type === "existing" &&
            image.removed
        );

      for (const image of removedExistingImages) {
        /*
         * Delete database record.
         */
        if (
          typeof image.id === "number"
        ) {
          const {
            error: deleteImageError,
          } = await supabase
            .from("product_images")
            .delete()
            .eq("id", image.id)
            .eq(
              "product_id",
              id
            );

          if (deleteImageError) {
            throw deleteImageError;
          }
        }
      }

      /* =========================
         UPLOAD NEW IMAGES
      ========================= */

      const activeImages =
        images.filter(
          (image) => !image.removed
        );

      const uploadedImages = [];

      for (
        const image of activeImages
      ) {
        if (image.type === "new") {
          const imageUrl =
            await uploadImage(
              user.id,
              image
            );

          uploadedImages.push({
            ...image,
            imageUrl,
            type: "uploaded",
          });
        } else {
          uploadedImages.push(image);
        }
      }

      /* =========================
         PRIMARY IMAGE
      ========================= */

      let primaryImage =
        uploadedImages.find(
          (image) =>
            image.isPrimary
        );

      if (
        !primaryImage &&
        uploadedImages.length > 0
      ) {
        primaryImage =
          uploadedImages[0];
      }

      /* =========================
         SAVE IMAGE RECORDS
      ========================= */

      /*
       * Existing records are updated
       * and new records are inserted.
       */
      for (
        let index = 0;
        index < uploadedImages.length;
        index++
      ) {
        const image =
          uploadedImages[index];

        const isPrimary =
          image.id ===
          primaryImage?.id;

        if (
          image.type === "existing"
        ) {
          const {
            error: imageUpdateError,
          } = await supabase
            .from("product_images")
            .update({
              sort_order: index,
              is_primary:
                isPrimary,
              alt_text:
                productName,
            })
            .eq("id", image.id)
            .eq(
              "product_id",
              id
            );

          if (imageUpdateError) {
            throw imageUpdateError;
          }
        } else {
          const {
            error: imageInsertError,
          } = await supabase
            .from("product_images")
            .insert({
              product_id: Number(id),
              variant_id: null,
              image_url:
                image.imageUrl,
              alt_text:
                productName,
              sort_order: index,
              is_primary:
                isPrimary,
            });

          if (imageInsertError) {
            throw imageInsertError;
          }
        }
      }

      /* =========================
         UPDATE PRODUCT PRIMARY URL
      ========================= */

      const { error: primaryError } =
        await supabase
          .from("products")
          .update({
            image_url:
              primaryImage?.imageUrl ||
              null,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id)
          .eq(
            "seller_id",
            user.id
          );

      if (primaryError) {
        throw primaryError;
      }

      /* =========================
         DELETE VARIANTS
      ========================= */

      const deletedVariants =
        variants.filter(
          (variant) =>
            variant.deleted &&
            variant.type === "existing"
        );

      for (const variant of deletedVariants) {
        /*
         * Delete inventory first
         * because it references variant.
         */
        if (variant.id) {
          const {
            error: inventoryDeleteError,
          } = await supabase
            .from("inventory")
            .delete()
            .eq(
              "variant_id",
              variant.id
            );

          if (inventoryDeleteError) {
            throw inventoryDeleteError;
          }

          /*
           * Remove variant-option
           * relationships if any.
           */
          const {
            error: valuesDeleteError,
          } = await supabase
            .from(
              "product_variant_values"
            )
            .delete()
            .eq(
              "variant_id",
              variant.id
            );

          if (valuesDeleteError) {
            throw valuesDeleteError;
          }

          /*
           * Remove variant images
           * relationships.
           */
          const {
            error: variantImagesError,
          } = await supabase
            .from("product_images")
            .update({
              variant_id: null,
            })
            .eq(
              "variant_id",
              variant.id
            );

          if (variantImagesError) {
            throw variantImagesError;
          }

          const {
            error: variantDeleteError,
          } = await supabase
            .from("product_variants")
            .delete()
            .eq(
              "id",
              variant.id
            )
            .eq(
              "product_id",
              id
            );

          if (variantDeleteError) {
            throw variantDeleteError;
          }
        }
      }

      /* =========================
         UPDATE / CREATE VARIANTS
      ========================= */

      const variantsToSave =
        variants.filter(
          (variant) =>
            !variant.deleted
        );

      for (
        const variant of variantsToSave
      ) {
        if (
          variant.type ===
          "existing"
        ) {
          const {
            error: variantUpdateError,
          } = await supabase
            .from("product_variants")
            .update({
              name:
                variant.name.trim(),
              sku:
                variant.sku.trim() ||
                null,
              price:
                Number(
                  variant.price
                ),
              is_active:
                variant.isActive,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              variant.id
            )
            .eq(
              "product_id",
              id
            );

          if (variantUpdateError) {
            throw variantUpdateError;
          }

          if (
            variant.inventoryId
          ) {
            const {
              error:
                inventoryUpdateError,
            } = await supabase
              .from("inventory")
              .update({
                quantity:
                  Number(
                    variant.quantity
                  ),
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                variant.inventoryId
              )
              .eq(
                "variant_id",
                variant.id
              );

            if (
              inventoryUpdateError
            ) {
              throw inventoryUpdateError;
            }
          } else {
            const {
              error:
                inventoryInsertError,
            } = await supabase
              .from("inventory")
              .insert({
                variant_id:
                  variant.id,
                quantity:
                  Number(
                    variant.quantity
                  ),
                reserved_quantity: 0,
              });

            if (
              inventoryInsertError
            ) {
              throw inventoryInsertError;
            }
          }
        } else {
          /* NEW VARIANT */

          const {
            data:
              createdVariant,
            error:
              variantInsertError,
          } = await supabase
            .from("product_variants")
            .insert({
              product_id:
                Number(id),
              name:
                variant.name.trim(),
              sku:
                variant.sku.trim() ||
                null,
              price:
                Number(
                  variant.price
                ),
              is_active: true,
            })
            .select()
            .single();

          if (variantInsertError) {
            throw variantInsertError;
          }

          const {
            error:
              inventoryInsertError,
          } = await supabase
            .from("inventory")
            .insert({
              variant_id:
                createdVariant.id,
              quantity:
                Number(
                  variant.quantity
                ),
              reserved_quantity: 0,
            });

          if (
            inventoryInsertError
          ) {
            throw inventoryInsertError;
          }
        }
      }

      setSuccess(
        "Product updated successfully."
      );

      setTimeout(() => {
        navigate(
          "/dashboard/products"
        );
      }, 800);
    } catch (err) {
      console.error(
        "Edit product error:",
        err
      );

      setError(
        err.message ||
          "Failed to update product."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="edit-product-page">
        <div className="dashboard-loading">
          Loading product...
        </div>
      </div>
    );
  }

  return (
    <div className="edit-product-page">
      {/* HEADER */}

      <div className="dashboard-page-header">
        <div>
          <h2>Edit Product</h2>

          <p>
            Update your product information,
            images, variants and stock.
          </p>
        </div>

        <Link
          to="/dashboard/products"
          className="dashboard-btn dashboard-btn-secondary"
        >
          ← Back to Products
        </Link>
      </div>

      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}

      {success && (
        <div className="edit-product-success">
          {success}
        </div>
      )}

      <form
        className="edit-product-form"
        onSubmit={handleSubmit}
      >
        {/* BASIC INFORMATION */}

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>
                Basic Information
              </h3>

              <p>
                Update the main information
                about this product.
              </p>
            </div>
          </div>

          <div className="edit-product-grid">
            <div className="edit-product-field full">
              <label>
                Product Name{" "}
                <span>*</span>
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="edit-product-field">
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

            <div className="edit-product-field">
              <label>
                Base Price{" "}
                <span>*</span>
              </label>

              <div className="edit-product-price-input">
                <span>$</span>

                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="edit-product-field full">
              <label>
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="6"
              />
            </div>
          </div>
        </div>

        {/* IMAGES */}

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3>
                Product Images
              </h3>

              <p>
                Manage your product
                images and primary image.
              </p>
            </div>
          </div>

          <div className="edit-product-images-section">
            <div className="edit-product-upload">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleImageChange
                }
              />

              <span>
                Select additional images
                from your computer.
                Maximum 5 MB per image.
              </span>
            </div>

            {images.filter(
              (image) => !image.removed
            ).length > 0 && (
              <div className="edit-product-images">
                {images
                  .filter(
                    (image) =>
                      !image.removed
                  )
                  .map(
                    (
                      image,
                      index
                    ) => (
                      <div
                        className={`edit-product-image-item ${
                          image.isPrimary
                            ? "is-primary"
                            : ""
                        }`}
                        key={
                          image.id
                        }
                      >
                        <div className="edit-product-image-preview">
                          <img
                            src={
                              image.preview
                            }
                            alt={
                              form.name
                            }
                          />

                          {image.isPrimary && (
                            <span className="edit-product-primary-badge">
                              Primary
                            </span>
                          )}
                        </div>

                        <div className="edit-product-image-actions">
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
                              images.filter(
                                (
                                  item
                                ) =>
                                  !item.removed
                              ).length -
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

            {images.filter(
              (image) => !image.removed
            ).length === 0 && (
              <div className="edit-product-no-images">
                No product images.
              </div>
            )}
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
                Edit prices, SKUs and
                inventory for each variant.
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

          <div className="edit-product-variants">
            {variants.filter(
              (variant) =>
                !variant.deleted
            ).length === 0 ? (
              <div className="edit-product-no-variants">
                No variants.
              </div>
            ) : (
              variants.map(
                (variant, index) => {
                  if (
                    variant.deleted
                  ) {
                    return null;
                  }

                  return (
                    <div
                      className="edit-product-variant"
                      key={
                        variant.id
                      }
                    >
                      <div className="edit-product-variant-number">
                        {index + 1}
                      </div>

                      <div className="edit-product-variant-fields">
                        <div className="edit-product-field">
                          <label>
                            Variant Name
                          </label>

                          <input
                            type="text"
                            value={
                              variant.name
                            }
                            onChange={(
                              e
                            ) =>
                              handleVariantChange(
                                index,
                                "name",
                                e
                                  .target
                                  .value
                              )
                            }
                          />
                        </div>

                        <div className="edit-product-field">
                          <label>
                            SKU
                          </label>

                          <input
                            type="text"
                            value={
                              variant.sku
                            }
                            onChange={(
                              e
                            ) =>
                              handleVariantChange(
                                index,
                                "sku",
                                e
                                  .target
                                  .value
                              )
                            }
                          />
                        </div>

                        <div className="edit-product-field">
                          <label>
                            Price
                          </label>

                          <div className="edit-product-price-input">
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
                                handleVariantChange(
                                  index,
                                  "price",
                                  e
                                    .target
                                    .value
                                )
                              }
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>

                        <div className="edit-product-field">
                          <label>
                            Stock
                          </label>

                          <input
                            type="number"
                            value={
                              variant.quantity
                            }
                            onChange={(
                              e
                            ) =>
                              handleVariantChange(
                                index,
                                "quantity",
                                e
                                  .target
                                  .value
                              )
                            }
                            min={
                              variant.reservedQuantity ||
                              0
                            }
                            step="1"
                          />

                          {Number(
                            variant.reservedQuantity
                          ) > 0 && (
                            <small>
                              {
                                variant.reservedQuantity
                              }{" "}
                              reserved
                            </small>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="edit-product-remove-variant"
                        onClick={() =>
                          removeVariant(
                            index
                          )
                        }
                        title="Remove variant"
                      >
                        ×
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>
        </div>

        {/* ACTIONS */}

        <div className="edit-product-actions">
          <Link
            to="/dashboard/products"
            className="dashboard-btn dashboard-btn-secondary"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="dashboard-btn dashboard-btn-primary"
            disabled={saving}
          >
            {saving
              ? "Saving Changes..."
              : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProduct;

