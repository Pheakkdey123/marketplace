import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../service/supabase";
import "../styles/Home.css";

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);

      const { data: productData, error: productError } =
        await supabase
          .from("products")
          .select("*")
          .order("id");

      if (productError) {
        console.error("Product error:", productError);
        setProducts([]);
        return;
      }

      const loadedProducts = productData || [];

      const productIds = loadedProducts.map(
        (product) => product.id
      );

      let imageData = [];

      if (productIds.length > 0) {
        const { data, error: imageError } =
          await supabase
            .from("product_images")
            .select(`
              id,
              product_id,
              image_url,
              alt_text,
              sort_order,
              is_primary
            `)
            .in("product_id", productIds)
            .order("is_primary", {
              ascending: false,
            })
            .order("sort_order", {
              ascending: true,
            });

        if (imageError) {
          console.error("Image error:", imageError);
        } else {
          imageData = data || [];
        }
      }

      const finalProducts = loadedProducts.map(
        (product) => {
          const productImages = imageData.filter(
            (image) =>
              image.product_id === product.id
          );

          const primaryImage =
            productImages.find(
              (image) => image.is_primary === true
            ) || productImages[0];

          return {
            ...product,

            display_image:
              primaryImage?.image_url ||
              product.image_url ||
              "",

            display_alt:
              primaryImage?.alt_text ||
              product.name ||
              "Product",
          };
        }
      );

      setProducts(finalProducts);
      setCurrentSlide(0);
    } catch (error) {
      console.error("Home error:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  /*
    Slider
    Desktop / Tablet = 3 products
    Phone = 2 products
  */

  function getVisibleProducts() {
    return window.innerWidth <= 600 ? 2 : 3;
  }

  function getMaxSlide() {
    const visible = getVisibleProducts();

    return Math.max(
      0,
      products.length - visible
    );
  }

  useEffect(() => {
    if (products.length <= 3) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentSlide((current) => {
        const visible =
          window.innerWidth <= 600 ? 2 : 3;

        const maxSlide = Math.max(
          0,
          products.length - visible
        );

        if (current >= maxSlide) {
          return 0;
        }

        return current + 1;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [products.length]);

  function nextSlide() {
    const maxSlide = getMaxSlide();

    if (maxSlide <= 0) return;

    setCurrentSlide((current) => {
      if (current >= maxSlide) {
        return 0;
      }

      return current + 1;
    });
  }

  function previousSlide() {
    const maxSlide = getMaxSlide();

    if (maxSlide <= 0) return;

    setCurrentSlide((current) => {
      if (current <= 0) {
        return maxSlide;
      }

      return current - 1;
    });
  }

  function goToSlide(index) {
    const maxSlide = getMaxSlide();

    setCurrentSlide(
      Math.min(index, maxSlide)
    );
  }

  const visibleProducts =
    typeof window !== "undefined" &&
    window.innerWidth <= 600
      ? 2
      : 3;

  const totalSlides = Math.max(
    0,
    products.length - visibleProducts + 1
  );

  /*
    Use the first product with an image
    for the Hero showcase.
  */

  const heroProduct =
    products.find(
      (product) => product.display_image
    ) || products[0];

  return (
    <div className="home">

      <Navbar />

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero">

        <div className="hero-content">

          <p className="hero-small">
            WELCOME TO OUR MARKETPLACE
          </p>

          <h1>
            Find products
            <br />
            you love.
          </h1>

          <p className="hero-description">
            Discover great products at simple
            and affordable prices.
          </p>

          <Link
            to="/products"
            className="hero-button"
          >
            Shop Now
          </Link>

        </div>


        {/* =================================================
            HERO PRODUCT SHOWCASE
        ================================================= */}

        {heroProduct && (
          <div className="hero-showcase">

            <Link
              to={`/products/${heroProduct.id}`}
              className="hero-product-card"
            >

              <div className="hero-product-image-wrapper">

                {heroProduct.display_image ? (
                  <img
                    src={heroProduct.display_image}
                    alt={heroProduct.display_alt}
                    className="hero-product-image"
                  />
                ) : (
                  <div className="hero-no-image">
                    No image
                  </div>
                )}

              </div>


              <div className="hero-product-info">

                <div>
                  <p className="hero-product-category">
                    {heroProduct.category ||
                      "Featured Product"}
                  </p>

                  <h2>
                    {heroProduct.name}
                  </h2>
                </div>

                <div className="hero-product-price">
                  $
                  {Number(
                    heroProduct.price || 0
                  ).toFixed(2)}
                </div>

              </div>

            </Link>


            {/* Small decorative cards */}

            <div className="hero-decoration hero-decoration-one" />

            <div className="hero-decoration hero-decoration-two" />

          </div>
        )}

      </section>


      {/* =================================================
          FEATURED PRODUCTS
      ================================================= */}

      <section className="featured">

        <div className="section-header">

          <div>

            <p className="section-small">
              OUR COLLECTION
            </p>

            <h2>
              Featured Products
            </h2>

          </div>

          <Link
            to="/products"
            className="view-all"
          >
            View all →
          </Link>

        </div>


        {loading && (
          <div className="products-loading">
            Loading products...
          </div>
        )}


        {!loading &&
          products.length === 0 && (
            <div className="products-empty">
              No products available.
            </div>
          )}


        {!loading &&
          products.length > 0 && (
            <>

              <div className="home-slider">

                {products.length > 3 && (
                  <button
                    className="home-slider-button left"
                    onClick={previousSlide}
                    type="button"
                    aria-label="Previous products"
                  >
                    ‹
                  </button>
                )}


                <div className="home-slider-viewport">

                  <div
                    className="home-slider-track"
                    style={{
                      "--current-slide":
                        currentSlide,
                    }}
                  >

                    {products.map(
                      (product) => (
                        <div
                          className="home-slide"
                          key={product.id}
                        >

                          <div className="product-card">

                            <Link
                              to={`/products/${product.id}`}
                              className="product-image-link"
                            >

                              {product.display_image ? (
                                <img
                                  src={
                                    product.display_image
                                  }
                                  alt={
                                    product.display_alt
                                  }
                                  className="product-image"
                                />
                              ) : (
                                <div className="product-image no-image">
                                  No image available
                                </div>
                              )}

                            </Link>


                            <div className="product-info">

                              {product.category && (
                                <p className="product-category">
                                  {product.category}
                                </p>
                              )}

                              <h3
                                title={
                                  product.name
                                }
                              >
                                {product.name}
                              </h3>

                              <p className="product-price">
                                $
                                {Number(
                                  product.price || 0
                                ).toFixed(2)}
                              </p>

                              <Link
                                to={`/products/${product.id}`}
                                className="product-button"
                              >
                                View Product
                              </Link>

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                </div>


                {products.length > 3 && (
                  <button
                    className="home-slider-button right"
                    onClick={nextSlide}
                    type="button"
                    aria-label="Next products"
                  >
                    ›
                  </button>
                )}

              </div>


              {totalSlides > 1 && (
                <div className="home-slider-dots">

                  {Array.from(
                    { length: totalSlides },
                    (_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={
                          currentSlide === index
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          goToSlide(index)
                        }
                        aria-label={`Go to slide ${
                          index + 1
                        }`}
                      />
                    )
                  )}

                </div>
              )}

            </>
          )}

      </section>

    </div>
  );
}

export default Home;