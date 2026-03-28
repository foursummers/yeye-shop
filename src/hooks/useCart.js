import { useState, useCallback, useMemo } from "react";
import { PRODUCTS } from "../data/products";
import { getSellingPrice } from "../utils/price";

const KEY = "yeye_cart";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function persist(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function useCart() {
  const [cart, setCart] = useState(load);

  const addToCart = useCallback((id) => {
    setCart((prev) => {
      const next = { ...prev, [id]: (prev[id] || 0) + 1 };
      persist(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((id, qty) => {
    setCart((prev) => {
      const next = { ...prev };
      const n = parseInt(qty) || 0;
      if (n <= 0) delete next[id];
      else next[id] = n;
      persist(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({});
    localStorage.removeItem(KEY);
  }, []);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart],
  );

  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce((total, [id, qty]) => {
        const p = PRODUCTS.find((x) => x.id === id);
        return total + (getSellingPrice(p) || 0) * qty;
      }, 0),
    [cart],
  );

  return { cart, addToCart, updateQty, clearCart, cartCount, cartTotal };
}
