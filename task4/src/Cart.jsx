import React from 'react';
import CartItem from './CartItem';

export default function Cart({ items, onRemove, onIncrease, onDecrease, totalItems, totalPrice }) {
  return (
    <div>
      <h2>Cart</h2>

      <div className="summary">
        <div>Items: {totalItems}</div>
        <div>Total: ${totalPrice.toFixed(2)}</div>
      </div>

      <div className="cart-list">
        {items.length === 0 && <div>Your cart is empty</div>}
        {items.map((it) => (
          <CartItem
            key={it.id}
            item={it}
            onRemove={() => onRemove(it.id)}
            onIncrease={() => onIncrease(it.id)}
            onDecrease={() => onDecrease(it.id)}
          />
        ))}
      </div>
    </div>
  );
}
