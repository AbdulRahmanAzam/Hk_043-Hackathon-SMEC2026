import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products, onAdd }) {
  if (!products || products.length === 0) {
    return <div>Loading products...</div>;
  }

  return (
    <div>
      <h2>Products</h2>
      <div className="products">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={() => onAdd(p)} />
        ))}
      </div>
    </div>
  );
}
