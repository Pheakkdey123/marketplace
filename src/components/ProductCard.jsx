import { Link } from "react-router-dom";
import "../styles/ProductCard.css";
import "../styles/Home.css";
import "../styles/Products.css";

function ProductCard({ product }) {
  const price = Number(product.price);

  return (
    <article className="market-product-card">
      <Link
        to={`/products/${product.id}`}
        className="market-product-image-link"
      >
        <img
          src={product.image_url}
          alt={product.name}
          className="market-product-image"
        />
      </Link>

      <div className="market-product-info">
        <p className="market-product-category">
          {product.category}
        </p>

        <h3 className="market-product-name">
          {product.name}
        </h3>

        {product.description && (
          <p className="market-product-description">
            {product.description}
          </p>
        )}

        <div className="market-product-bottom">
          <strong className="market-product-price">
            ${price.toFixed(2)}
          </strong>

          <Link
            to={`/products/${product.id}`}
            className="market-product-button"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;