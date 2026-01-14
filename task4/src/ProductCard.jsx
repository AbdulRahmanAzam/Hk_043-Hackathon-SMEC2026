import React from 'react';

export default function ProductCard({ product, onAdd }) {
  return (
    <div className="card">
      <img src={product.image} alt={product.title} />
      <div className="title" title={product.title}>
        {product.title}
      </div>
      <div className="price">${product.price.toFixed(2)}</div>
      <button className="btn" onClick={onAdd}>
        Add to Cart
      </button>
    </div>
  );
}
