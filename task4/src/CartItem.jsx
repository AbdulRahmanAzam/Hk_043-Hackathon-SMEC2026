import React from 'react';

export default function CartItem({ item, onRemove, onIncrease, onDecrease }) {
  return (
    <div className="cart-item">
      <img src={item.product.image} alt={item.product.title} />
      <div className="meta">
        <div className="name">{item.product.title}</div>
        <div>${item.product.price.toFixed(2)} each</div>
      </div>

      <div className="controls">
        <button className="btn secondary" onClick={onDecrease} aria-label="decrease">-</button>
        <div className="qty">{item.quantity}</div>
        <button className="btn" onClick={onIncrease} aria-label="increase">+</button>
        <button className="btn secondary" onClick={onRemove} style={{ marginLeft: 8 }}>Remove</button>
      </div>
    </div>
  );
}
