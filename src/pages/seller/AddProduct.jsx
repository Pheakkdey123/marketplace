import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../service/supabase";
import "../../styles/seller/AddProduct.css";

function AddProduct() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoadingCategories(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/login", { replace: true });
      return;
    }

    setUser(user);

    const { data, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name");

    if (categoryError) {
      setError(categoryError.message);
    } else {
      setCategories(data || []);
    }

    setLoadingCategories(false);
  }

  function handleImageChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    const validFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length !== selectedFiles.length) {
      setError("Only image files are allowed.");
    }

    const newFiles = [...images, ...validFiles];

    if (newFiles.length > 8) {
      setError("You can upload a maximum of 8 images.");
      return;
    }

    setImages(newFiles);

    const newPreviews = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews((current) => [...current, ...newPreviews]);
  }

  function removeImage(index) {
    const preview = previews[index];

    if (preview) {
      URL.revokeObjectURL(preview.url);
    }

    setImages((current) => current.filter((_, i) => i !== index));
    setPreviews((current) => current.filter((_, i) => i !== index));
  }

  function validateForm() {
    if (!name.trim()) {
      return "Product name is required.";
    }

    if (!description.trim()) {
      return "Product description is required.";
    }

    if (!price || Number(price) <= 0) {
      return "Please enter a valid price.";
    }

    if (stock === "" || Number(stock) < 0) {
      return "Please enter a valid stock quantity.";
    }

    if (images.length === 0) {
      return "Please upload at least one product image.";
    }

    return "";
  }

  async function uploadImage(file, productId, index) {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";

    const fileName = `${crypto.randomUUID()}.${fileExtension}`;

    const filePath = `${user.id}/${productId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return {
      image_url: publicUrl,
      alt_text: `${name.trim()} image ${index + 1}`,
      sort_order: index,
      is_primary: index === 0,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user) {
      setError("You must be logged in.");
      return;
    }

    setLoading(true);

    let productId = null;
    let variantId = null;

    try {
      /*
       * 1. Create product
       */
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          seller_id: user.id,
          category_id: categoryId ? Number(categoryId) : null,
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          is_active: true,
        })
        .select()
        .single();

      if (productError) {
        throw new Error(productError.message);
      }

      productId = product.id;

      /*
       * 2. Create default variant
       */
      const skuBase = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30);

      const sku = `${skuBase || "PRODUCT"}-${productId}`;

      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .insert({
          product_id: productId,
          sku,
          name: "Default",
          price: Number(price),
          is_active: true,
        })
        .select()
        .single();

      if (variantError) {
        throw new Error(variantError.message);
      }

      variantId = variant.id;

      /*
       * 3. Create inventory
       */
      const { error: inventoryError } = await supabase
        .from("inventory")
        .insert({
          variant_id: variantId,
          quantity: Number(stock),
          reserved_quantity: 0,
        });

      if (inventoryError) {
        throw new Error(inventoryError.message);
      }

      /*
       * 4. Upload images
       */
      const uploadedImages = [];

      for (let i = 0; i < images.length; i++) {
        const uploaded = await uploadImage(images[i], productId, i);
        uploadedImages.push(uploaded);
      }

      /*
       * 5. Save image records
       */
      const imageRows = uploadedImages.map((image) => ({
        product_id: productId,
        image_url: image.image_url,
        alt_text: image.alt_text,
        sort_order: image.sort_order,
        is_primary: image.is_primary,
      }));

      const { error: imageError } = await supabase
        .from("product_images")
        .insert(imageRows);

      if (imageError) {
        throw new Error(imageError.message);
      }

      setSuccess("Product created successfully.");

      /*
       * 6. Redirect after successful creation
       */
      setTimeout(() => {
        navigate("/seller/products", { replace: true });
      }, 800);
    } catch (err) {
      console.error(err);

      setError(err.message || "Failed to create product.");

      /*
       * Cleanup partially-created database records.
       *
       * We intentionally do not attempt to delete the uploaded
       * Storage files here yet. We'll add proper transaction-like
       * cleanup through an Edge Function later.
       */
      if (productId) {
        await supabase
          .from("products")
          .delete()
          .eq("id", productId);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loadingCategories) {
    return (
      <div className="add-product-page">
        <div className="add-product-loading">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="add-product-page">
      <div className="add-product-container">

        <div className="add-product-header">
          <div>
            <p className="page-eyebrow">SELLER CENTER</p>

            <h1>Add Product</h1>

            <p>
              Create a product and publish it to your marketplace.
            </p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/seller/products")}
          >
            ← Products
          </button>
        </div>

        {error && (
          <div className="form-message error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="form-message success-message">
            {success}
          </div>
        )}

        <form
          className="add-product-form"
          onSubmit={handleSubmit}
        >
          <section className="form-card">
            <div className="form-card-header">
              <h2>Product information</h2>
              <p>Basic information about your product.</p>
            </div>

            <div className="form-group">
              <label htmlFor="product-name">
                Product name
              </label>

              <input
                id="product-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. iPhone 17"
                maxLength={150}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">
                  Category
                </label>

                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="price">
                  Price
                </label>

                <div className="input-with-prefix">
                  <span>$</span>

                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="799.00"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product..."
                rows={7}
                maxLength={5000}
              />
            </div>
          </section>

          <section className="form-card">
            <div className="form-card-header">
              <h2>Inventory</h2>
              <p>Set the quantity currently available for sale.</p>
            </div>

            <div className="form-group">
              <label htmlFor="stock">
                Stock quantity
              </label>

              <input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="20"
              />
            </div>
          </section>

          <section className="form-card">
            <div className="form-card-header">
              <h2>Product images</h2>
              <p>
                Add up to 8 images. The first image becomes the
                primary product image.
              </p>
            </div>

            <label
              htmlFor="product-images"
              className="image-upload-area"
            >
              <div className="upload-icon">
                +
              </div>

              <strong>
                Add product images
              </strong>

              <span>
                JPG, PNG or WebP
              </span>

              <input
                id="product-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
              />
            </label>

            {previews.length > 0 && (
              <div className="image-preview-grid">
                {previews.map((preview, index) => (
                  <div
                    className="image-preview"
                    key={`${preview.url}-${index}`}
                  >
                    <img
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                    />

                    {index === 0 && (
                      <span className="primary-badge">
                        Primary
                      </span>
                    )}

                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => removeImage(index)}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate("/seller/products")}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-product-button"
              disabled={loading}
            >
              {loading
                ? "Creating product..."
                : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProduct;