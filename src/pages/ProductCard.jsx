import { Link } from "react-router-dom";

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`}>
        <img
          src={product.image_url}
          alt={product.name}
          className="product-image"
        />
      </Link>

      <div className="product-info">
        <p className="product-category">
          {product.category}
        </p>

        <h3>{product.name}</h3>

        <p className="product-description">
          {product.description}
        </p>

        <div className="product-bottom">
          <strong>
            ${Number(product.price).toFixed(2)}
          </strong>

          <Link
            to={`/products/${product.id}`}
            className="product-button"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;