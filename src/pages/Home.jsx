import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../service/supabase";
import "../styles/Home.css";

function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [heroIndex, setHeroIndex] = useState(0);
  const [arrivalStart, setArrivalStart] = useState(0);

  useEffect(() => {
    loadHome();
  }, []);

  async function loadHome() {
    try {
      setLoading(true);

      const [
        productsResult,
        categoriesResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("id", {
            ascending: false,
          }),

        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (productsResult.error) {
        console.error(
          "Products error:",
          productsResult.error
        );
      }

      if (categoriesResult.error) {
        console.error(
          "Categories error:",
          categoriesResult.error
        );
      }

      const loadedProducts =
        productsResult.data || [];

      const productIds = loadedProducts.map(
        (product) => product.id
      );

      let images = [];

      if (productIds.length > 0) {
        const { data, error } =
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
            .in(
              "product_id",
              productIds
            )
            .order("is_primary", {
              ascending: false,
            })
            .order("sort_order", {
              ascending: true,
            });

        if (error) {
          console.error(
            "Images error:",
            error
          );
        } else {
          images = data || [];
        }
      }

      const finalProducts =
        loadedProducts.map((product) => {
          const productImages =
            images.filter(
              (image) =>
                image.product_id ===
                product.id
            );

          const primary =
            productImages.find(
              (image) =>
                image.is_primary
            ) ||
            productImages[0];

          return {
            ...product,
            display_image:
              primary?.image_url ||
              product.image_url ||
              "",
            display_alt:
              primary?.alt_text ||
              product.name ||
              "Product",
          };
        });

      setProducts(finalProducts);
      setCategories(
        categoriesResult.data || []
      );
    } catch (error) {
      console.error(
        "Home error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /* HERO SLIDER */

  const heroProducts =
    products.slice(0, 5);

  useEffect(() => {
    if (heroProducts.length <= 1)
      return;

    const timer = setInterval(() => {
      setHeroIndex((current) =>
        current >=
        heroProducts.length - 1
          ? 0
          : current + 1
      );
    }, 4500);

    return () =>
      clearInterval(timer);
  }, [products]);

  const heroProduct =
    heroProducts[heroIndex];

  /* PRODUCTS */

  const newArrivals =
    products.slice(0, 10);

  const bestSellers =
    products.slice(3, 6);

  const categoryProducts =
    categories.map((category) => {
      const product =
        products.find(
          (item) =>
            item.category_id ===
            category.id
        );

      return {
        ...category,
        image:
          product?.display_image || "",
      };
    });

  function price(value) {
    return Number(value || 0).toFixed(2);
  }

  function nextArrivals() {
    if (newArrivals.length <= 4)
      return;

    setArrivalStart((current) =>
      current >= newArrivals.length - 4
        ? 0
        : current + 1
    );
  }

  function previousArrivals() {
    if (newArrivals.length <= 4)
      return;

    setArrivalStart((current) =>
      current <= 0
        ? newArrivals.length - 4
        : current - 1
    );
  }

  return (
    <div className="store-home">

      {/* =====================================
          PROMO BAR
      ===================================== */}

      <div className="store-promo-bar">
        <span>
          🚚 Free Worldwide Shipping Over $50
        </span>

        <span>|</span>

        <span>
          ☀️ Summer Sale Up To 70% Off
        </span>

        <span>|</span>

        <span>
          ⚡ Limited Time Flash Deals
        </span>
      </div>

      <Navbar />

      {/* =====================================
          HERO
      ===================================== */}

      <section className="store-hero">

        <div className="store-hero-content">

          <span className="store-orange-label">
            TRENDING NOW
          </span>

          <h1>
            Discover Products
            <br />
            You’ll Love
          </h1>

          <p>
            Shop the latest products
            curated for modern
            lifestyles.
          </p>

          <div className="store-hero-buttons">

            <Link
              to="/products"
              className="store-orange-button"
            >
              Shop Now
              <span>→</span>
            </Link>

            <Link
              to="/products"
              className="store-outline-button"
            >
              Explore Collection
            </Link>

          </div>

          <div className="store-customers">

            <div className="customer-avatars">
              <span>👨</span>
              <span>👩</span>
              <span>👨</span>
              <span>👩</span>
            </div>

            <small>
              Loved by shoppers worldwide
            </small>

          </div>
        </div>

        {/* HERO IMAGE */}

        <div className="store-hero-visual">

          <div className="hero-orange-shape" />

          {heroProduct && (
            <Link
              to={`/products/${heroProduct.id}`}
              className="hero-main-product"
              key={heroProduct.id}
            >
              {heroProduct.display_image ? (
                <img
                  src={
                    heroProduct.display_image
                  }
                  alt={
                    heroProduct.display_alt
                  }
                />
              ) : (
                <div>
                  No image
                </div>
              )}
            </Link>
          )}

          {heroProducts[0] && (
            <HeroFloatingCard
              product={heroProducts[0]}
              className="hero-card-one"
            />
          )}

          {heroProducts[1] && (
            <HeroFloatingCard
              product={heroProducts[1]}
              className="hero-card-two"
            />
          )}

          {heroProducts[2] && (
            <HeroFloatingCard
              product={heroProducts[2]}
              className="hero-card-three"
            />
          )}

          {heroProducts.length > 1 && (
            <div className="hero-dots">
              {heroProducts.map(
                (product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    className={
                      index === heroIndex
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setHeroIndex(index)
                    }
                  />
                )
              )}
            </div>
          )}

        </div>
      </section>

      {/* =====================================
          SERVICES
      ===================================== */}

      <section className="store-services">

        <Service
          icon="🚚"
          title="Free Shipping"
          text="On orders over $50"
        />

        <Service
          icon="🔒"
          title="Secure Payments"
          text="100% secure checkout"
        />

        <Service
          icon="↻"
          title="Easy Returns"
          text="30-day return policy"
        />

        <Service
          icon="♧"
          title="24/7 Support"
          text="Always here to help"
        />

      </section>

      {/* =====================================
          CATEGORIES
      ===================================== */}

      {categoryProducts.length > 0 && (
        <section className="store-section">

          <SectionTitle
            title="Shop by Categories"
            link="View All Categories"
          />

          <div className="category-grid">

            {categoryProducts
              .slice(0, 6)
              .map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  className="category-card"
                >

                  <div className="category-image">

                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                      />
                    ) : (
                      <div className="category-empty">
                        {category.name}
                      </div>
                    )}

                  </div>

                  <div className="category-overlay">
                    <strong>
                      {category.name}
                    </strong>

                    <span>
                      Shop Now →
                    </span>
                  </div>

                </Link>
              ))}
          </div>
        </section>
      )}

      {/* =====================================
          NEW ARRIVALS
      ===================================== */}

      <section className="store-section">

        <SectionTitle
          title="New Arrivals"
          link="View All New Arrivals"
        />

        <div className="products-slider">

          {newArrivals.length > 4 && (
            <button
              className="slider-arrow left"
              onClick={
                previousArrivals
              }
            >
              ‹
            </button>
          )}

          <div className="products-window">

            <div
              className="products-track"
              style={{
                transform: `translateX(-${
                  arrivalStart * 25
                }%)`,
              }}
            >

              {newArrivals.map(
                (product) => (
                  <div
                    className="product-slide"
                    key={product.id}
                  >
                    <ProductCard
                      product={product}
                    />
                  </div>
                )
              )}

            </div>

          </div>

          {newArrivals.length > 4 && (
            <button
              className="slider-arrow right"
              onClick={nextArrivals}
            >
              ›
            </button>
          )}

        </div>
      </section>

      {/* =====================================
          BEST SELLERS
      ===================================== */}

      {bestSellers.length > 0 && (
        <section className="store-section">

          <SectionTitle
            title="Best Sellers"
            link="View All Best Sellers"
          />

          <div className="best-seller-grid">

            {bestSellers.map(
              (product) => (
                <div
                  className="best-seller"
                  key={product.id}
                >

                  <div className="best-seller-image">

                    {product.display_image && (
                      <img
                        src={
                          product.display_image
                        }
                        alt={
                          product.display_alt
                        }
                      />
                    )}

                  </div>

                  <div className="best-seller-info">

                    <span className="seller-badge">
                      Bestseller
                    </span>

                    <h3>
                      {product.name}
                    </h3>

                    <strong>
                      ${price(product.price)}
                    </strong>

                    <div className="rating">
                      ★★★★★
                    </div>

                    <Link
                      to={`/products/${product.id}`}
                      className="quick-add"
                    >
                      View Product
                    </Link>

                  </div>

                </div>
              )
            )}

          </div>
        </section>
      )}

      {/* =====================================
          PROMO BANNERS
      ===================================== */}

      <section className="promo-grid">

        <div className="promo-banner orange">

          <div>
            <span>
              FLASH SALE
            </span>

            <h2>
              Up To 70% Off
            </h2>

            <p>
              Limited time offers
            </p>

            <Link to="/products">
              Shop Sale Now →
            </Link>
          </div>

          {products[0]?.display_image && (
            <img
              src={
                products[0].display_image
              }
              alt=""
            />
          )}

        </div>

        <div className="promo-banner dark">

          <div>
            <span>
              NEW COLLECTION
            </span>

            <h2>
              Fresh Products
            </h2>

            <p>
              Discover what's new
            </p>

            <Link to="/products">
              Shop Collection →
            </Link>
          </div>

          {products[1]?.display_image && (
            <img
              src={
                products[1].display_image
              }
              alt=""
            />
          )}

        </div>

      </section>

      {/* =====================================
          BOTTOM BENEFITS
      ===================================== */}

      <section className="bottom-services">

        <Service
          icon="♢"
          title="Premium Quality"
          text="Quality products"
        />

        <Service
          icon="🚚"
          title="Fast Delivery"
          text="Quick and reliable shipping"
        />

        <Service
          icon="🔒"
          title="Secure Checkout"
          text="Your data is protected"
        />

        <Service
          icon="♡"
          title="Customer Satisfaction"
          text="We're here for you"
        />

      </section>

    </div>
  );
}


/* =========================================
   COMPONENTS
========================================= */

function HeroFloatingCard({
  product,
  className,
}) {
  return (
    <Link
      to={`/products/${product.id}`}
      className={`hero-floating-card ${className}`}
    >
      <div className="floating-image">
        {product.display_image && (
          <img
            src={product.display_image}
            alt={product.display_alt}
          />
        )}
      </div>

      <div>
        <strong>
          {product.name}
        </strong>

        <span>
          $
          {Number(
            product.price || 0
          ).toFixed(2)}
        </span>
      </div>
    </Link>
  );
}


function Service({
  icon,
  title,
  text,
}) {
  return (
    <div className="service-item">
      <div className="service-icon">
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}


function SectionTitle({
  title,
  link,
}) {
  return (
    <div className="section-title">

      <h2>{title}</h2>

      <Link to="/products">
        {link}
        <span>→</span>
      </Link>

    </div>
  );
}


function ProductCard({
  product,
}) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="shop-product-card"
    >

      <div className="shop-product-image">

        <span className="product-tag">
          New
        </span>

        <button
          type="button"
          className="wishlist"
          onClick={(event) =>
            event.preventDefault()
          }
        >
          ♡
        </button>

        {product.display_image ? (
          <img
            src={product.display_image}
            alt={product.display_alt}
          />
        ) : (
          <div className="product-empty">
            No image
          </div>
        )}

        <span className="cart-mini">
          +
        </span>

      </div>

      <div className="shop-product-info">

        <span>
          {product.category ||
            "Product"}
        </span>

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
  );
}

export default Home;