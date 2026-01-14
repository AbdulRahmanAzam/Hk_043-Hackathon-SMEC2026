import React, { useEffect, useState } from 'react';
import './App.css';
import ProductList from './ProductList';
import Cart from './Cart';

function App() {
  const [products, setProducts] = useState([]);

  const [showCart, setShowCart] = useState(false);

  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    fetch('https://fakestoreapi.com/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error('Failed to fetch products', err));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  }, [cart]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, { id: product.id, product, quantity: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((it) => it.id !== id));
  }

  function increaseQuantity(id) {
    setCart((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: it.quantity + 1 } : it))
    );
  }

  function decreaseQuantity(id) {
    setCart((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, quantity: it.quantity - 1 } : it))
        .filter((it) => it.quantity > 0)
    );
  }

  const totalItems = cart.reduce((s, it) => s + it.quantity, 0);
  const totalPrice = cart.reduce((s, it) => s + it.quantity * it.product.price, 0);

  return (
    <div className={"App-root" + (showCart ? ' cart-open' : '')}>
      <header className="App-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h1>Smart Shopping Cart</h1>
            <p className="sub">A small React app demonstrating cart functionality</p>
          </div>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button
            className="btn"
            onClick={() => setShowCart((v) => !v)}
            aria-expanded={showCart}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {showCart ? 'Hide Cart' : 'View Cart'}
          </button>
        </div>
      </header>

      <main className="App-main">
        <section className="products">
          <ProductList products={products} onAdd={addToCart} />
        </section>

        <aside className="cart" aria-hidden={!showCart}>
          <Cart
            items={cart}
            onRemove={removeFromCart}
            onIncrease={increaseQuantity}
            onDecrease={decreaseQuantity}
            totalItems={totalItems}
            totalPrice={totalPrice}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
