import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../service/supabase";
import "../styles/Home.css";

function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(4);

  useEffect(() => {
    loadHomeData();
  }, []);

  /*
    Responsive slider
  */
  useEffect(() => {
    function updateCardsVisible() {
      if (window.innerWidth <= 600) {
        setCardsVisible(2);
      } else if (window.innerWidth <= 900) {
        setCardsVisible(3);
      } else {
        setCardsVisible(4);
      }
    }

    updateCardsVisible();

    window.addEventListener("resize", updateCardsVisible);

    return () => {
      window.removeEventListener("resize", updateCardsVisible);
    };
  }, []);

  async function loadHomeData() {
    try {
      setLoading(true);

      /*
        PRODUCTS
      */
      const { data: productData, error: productError } =
        await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("id", { ascending: false });

      if (productError) {
        console.error("Product error:", productError);
        setProducts([]);
        return;
      }

      const loadedProducts = productData || [];

      /*
        PRODUCT IMAGES
      */
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

      /*
        ATTACH PRIMARY IMAGE
      */
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

      /*
        CATEGORIES
      */
      const { data: categoryData, error: categoryError } =
        await supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("name");

      if (categoryError) {
        console.error(
          "Category error:",
          categoryError
        );
        setCategories([]);
      } else {
        setCategories(categoryData || []);
      }
    } catch (error) {
      console.error("Home error:", error);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  /*
    SLIDER
  */
  const maxSlide = Math.max(
    0,
    products.length - cardsVisible
  );

  const totalSlides = maxSlide + 1;

  useEffect(() => {
    if (currentSlide > maxSlide) {
      setCurrentSlide(maxSlide);
    }
  }, [cardsVisible, maxSlide, currentSlide]);

  function nextSlide() {
    if (maxSlide <= 0) return;

    setCurrentSlide((current) =>
      current >= maxSlide ? 0 : current + 1
    );
  }

  function previousSlide() {
    if (maxSlide <= 0) return;

    setCurrentSlide((current) =>
      current <= 0 ? maxSlide : current - 1
    );
  }

  function goToSlide(index) {
    setCurrentSlide(
      Math.min(index, maxSlide)
    );
  }

  /*
    HOME DATA
  */

  // First 3 products
  const featuredProducts = products.slice(0, 3);

  // Product used for spotlight
  const spotlightProduct =
    products[3] || products[0];

  // New arrivals
  const newArrivals = products.slice(0, 10);

  // Hero product
  const heroProduct =
    products.find(
      (product) => product.display_image
    ) || products[0];

  /*
    CATEGORY LIMIT
  */
  const displayedCategories =
    categories.slice(0, 6);

  return (
    <div className="home">

      <Navbar />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="home-hero">

        <div className="home-hero-content">

          <p className="home-hero-small">
            WELCOME TO OUR MARKETPLACE
          </p>

          <h1>
            Find what
            <br />
            you need.
          </h1>

          <p className="home-hero-description">
            Discover quality products from different
            categories, all in one simple marketplace.
          </p>

          <Link
            to="/products"
            className="home-hero-button"
          >
            Explore Products
            <span>→</span>
          </Link>

        </div>


        {/* HERO PRODUCT */}

        {heroProduct && (
          <div className="home-hero-showcase">

            <Link
              to={`/products/${heroProduct.id}`}
              className="home-hero-product"
            >

              <div className="home-hero-image">

                {heroProduct.display_image ? (
                  <img
                    src={heroProduct.display_image}
                    alt={heroProduct.display_alt}
                  />
                ) : (
                  <div className="home-no-image">
                    No image
                  </div>
                )}

              </div>

              <div className="home-hero-product-info">

                <div>
                  <p>
                    {heroProduct.category ||
                      "Featured Product"}
                  </p>

                  <h2>
                    {heroProduct.name}
                  </h2>
                </div>

                <strong>
                  $
                  {Number(
                    heroProduct.price || 0
                  ).toFixed(2)}
                </strong>

              </div>

            </Link>

            <div className="home-decoration home-decoration-one" />
            <div className="home-decoration home-decoration-two" />

          </div>
        )}

      </section>


      {/* =====================================================
          CATEGORIES
      ===================================================== */}

      {!loading &&
        displayedCategories.length > 0 && (
          <section className="home-categories">

            <div className="home-section-heading">

              <div>
                <p className="home-section-label">
                  BROWSE
                </p>

                <h2>
                  Shop by Category
                </h2>
              </div>

              <Link
                to="/products"
                className="home-view-all"
              >
                All Categories →
              </Link>

            </div>


            <div className="home-category-list">

              {displayedCategories.map(
                (category) => (
                  <Link
                    key={category.id}
                    to="/products"
                    className="home-category-card"
                  >

                    <span>
                      {category.name}
                    </span>

                    <span className="home-category-arrow">
                      →
                    </span>

                  </Link>
                )
              )}

            </div>

          </section>
        )}


      {/* =====================================================
          FEATURED PRODUCTS
      ===================================================== */}

      <section className="home-featured">

        <div className="home-section-heading">

          <div>
            <p className="home-section-label">
              OUR COLLECTION
            </p>

            <h2>
              Featured Products
            </h2>
          </div>

          <Link
            to="/products"
            className="home-view-all"
          >
            View all →
          </Link>

        </div>


        {loading && (
          <div className="home-loading">
            Loading products...
          </div>
        )}


        {!loading &&
          featuredProducts.length === 0 && (
            <div className="home-empty">
              No products available.
            </div>
          )}


        {!loading &&
          featuredProducts.length > 0 && (
            <div className="home-featured-grid">

              {featuredProducts.map(
                (product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="home-product-card"
                  >

                    <div className="home-product-image">

                      {product.display_image ? (
                        <img
                          src={product.display_image}
                          alt={product.display_alt}
                          loading="lazy"
                        />
                      ) : (
                        <div className="home-no-image">
                          No image
                        </div>
                      )}

                    </div>


                    <div className="home-product-info">

                      <div>

                        <p className="home-product-category">
                          {product.category ||
                            "Product"}
                        </p>

                        <h3>
                          {product.name}
                        </h3>

                      </div>

                      <strong>
                        $
                        {Number(
                          product.price || 0
                        ).toFixed(2)}
                      </strong>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

      </section>


      {/* =====================================================
          PRODUCT SPOTLIGHT
      ===================================================== */}

      {!loading &&
        spotlightProduct && (
          <section className="home-spotlight">

            <div className="home-spotlight-image">

              {spotlightProduct.display_image ? (
                <img
                  src={
                    spotlightProduct.display_image
                  }
                  alt={
                    spotlightProduct.display_alt
                  }
                />
              ) : (
                <div className="home-no-image">
                  No image
                </div>
              )}

            </div>


            <div className="home-spotlight-content">

              <p className="home-spotlight-label">
                NEW ARRIVAL
              </p>

              <h2>
                {spotlightProduct.name}
              </h2>

              <p className="home-spotlight-description">
                Discover this product and explore
                more details, available options and
                pricing.
              </p>

              <div className="home-spotlight-price">
                $
                {Number(
                  spotlightProduct.price || 0
                ).toFixed(2)}
              </div>

              <Link
                to={`/products/${spotlightProduct.id}`}
                className="home-dark-button"
              >
                View Product
                <span>→</span>
              </Link>

            </div>

          </section>
        )}


      {/* =====================================================
          NEW ARRIVALS
      ===================================================== */}

      {!loading &&
        newArrivals.length > 0 && (
          <section className="home-arrivals">

            <div className="home-section-heading">

              <div>
                <p className="home-section-label">
                  JUST ADDED
                </p>

                <h2>
                  New Arrivals
                </h2>
              </div>

              <Link
                to="/products"
                className="home-view-all"
              >
                View all →
              </Link>

            </div>


            <div className="home-slider">

              {newArrivals.length > cardsVisible && (
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
                    "--cards-visible":
                      cardsVisible,
                  }}
                >

                  {newArrivals.map(
                    (product) => (
                      <div
                        className="home-slide"
                        key={product.id}
                      >

                        <Link
                          to={`/products/${product.id}`}
                          className="home-arrival-card"
                        >

                          <div className="home-arrival-image">

                            {product.display_image ? (
                              <img
                                src={
                                  product.display_image
                                }
                                alt={
                                  product.display_alt
                                }
                                loading="lazy"
                              />
                            ) : (
                              <div className="home-no-image">
                                No image
                              </div>
                            )}

                          </div>


                          <div className="home-arrival-info">

                            <p>
                              {product.category ||
                                "Product"}
                            </p>

                            <h3>
                              {product.name}
                            </h3>

                            <strong>
                              $
                              {Number(
                                product.price || 0
                              ).toFixed(2)}
                            </strong>

                          </div>

                        </Link>

                      </div>
                    )
                  )}

                </div>

              </div>


              {newArrivals.length > cardsVisible && (
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

          </section>
        )}


      {/* =====================================================
          EXPLORE CTA
      ===================================================== */}

      <section className="home-explore">

        <p>
          EVERYTHING IN ONE PLACE
        </p>

        <h2>
          Ready to find something
          <br />
          you like?
        </h2>

        <Link
          to="/products"
          className="home-explore-button"
        >
          Explore Products
          <span>→</span>
        </Link>

      </section>

    </div>
  );
}

export default Home;