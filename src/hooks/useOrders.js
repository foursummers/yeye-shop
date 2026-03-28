import { useState, useCallback } from "react";
import { PRODUCTS } from "../data/products";
import { getSellingPrice } from "../utils/price";

const KEY = "yeye_orders";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function useOrders() {
  const [orders, setOrders] = useState(load);

  const addOrder = useCallback((form, cart) => {
    const items = Object.entries(cart).map(([id, qty]) => {
      const p = PRODUCTS.find((x) => x.id === id);
      const price = getSellingPrice(p) || 0;
      return {
        id,
        name: p.name,
        category: p.category,
        qty,
        price,
        subtotal: price * qty,
      };
    });
    const total = items.reduce((a, b) => a + b.subtotal, 0);
    const order = {
      id: "YY" + (Date.now() % 100000).toString().padStart(5, "0"),
      date: new Date().toLocaleDateString("zh-CN"),
      time: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ...form,
      items,
      total,
    };
    setOrders((prev) => {
      const next = [...prev, order];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
    return order;
  }, []);

  return { orders, addOrder };
}
