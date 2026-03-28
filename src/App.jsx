import { useState, useRef, useCallback } from "react";
import Layout from "./components/Layout";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import Cart from "./components/Cart";
import ShareModal from "./components/ShareModal";
import Admin from "./components/Admin";
import { useCart } from "./hooks/useCart";
import { useOrders } from "./hooks/useOrders";

export default function App() {
  const [page, setPage] = useState("shop");
  const [detail, setDetail] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(0);

  const { cart, addToCart, updateQty, clearCart, cartCount, cartTotal } =
    useCart();
  const { orders, addOrder } = useOrders();

  const openDetail = useCallback((p) => {
    scrollRef.current = window.scrollY;
    setDetail(p);
    window.scrollTo(0, 0);
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
    requestAnimationFrame(() => window.scrollTo(0, scrollRef.current));
  }, []);

  function handleSubmitOrder(form) {
    addOrder(form, cart);
    clearCart();
  }

  return (
    <div className="font-sans min-h-screen bg-warm max-w-[480px] mx-auto relative">
      {/* Share modal */}
      {shareTarget && (
        <ShareModal
          product={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Nav */}
      <Layout
        page={page}
        setPage={setPage}
        cartCount={cartCount}
        setDetail={setDetail}
        setDone={setDone}
      />

      {/* Shop - Product list */}
      {page === "shop" && !detail && <ProductList onDetail={openDetail} />}

      {/* Shop - Product detail */}
      {page === "shop" && detail && (
        <ProductDetail
          product={detail}
          onBack={closeDetail}
          onAddCart={addToCart}
          onShare={setShareTarget}
          setPage={setPage}
        />
      )}

      {/* Cart */}
      {page === "cart" && (
        <Cart
          cart={cart}
          updateQty={updateQty}
          clearCart={clearCart}
          cartCount={cartCount}
          cartTotal={cartTotal}
          onSubmit={handleSubmitOrder}
          setPage={setPage}
        />
      )}

      {/* Admin */}
      {page === "admin" && <Admin orders={orders} setPage={setPage} />}

      {/* Floating cart bar */}
      {page === "shop" && cartCount > 0 && (
        <div
          onClick={() => {
            setPage("cart");
            setDetail(null);
          }}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-primary text-warm px-[18px] py-3.5 flex items-center justify-between z-50 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="bg-accent text-primary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
            <span className="text-xs tracking-wide">购物车</span>
          </div>
          <span className="text-sm font-medium tracking-wide">
            {cartTotal === 0 ? "仅付邮费" : `¥${cartTotal}`}
            <span className="text-[11px] font-normal text-warm/60 ml-1.5">
              去结算 →
            </span>
          </span>
        </div>
      )}

      {/* Bottom spacer for floating cart */}
      {page === "shop" && cartCount > 0 && <div className="h-14" />}
      <div className="h-8" />
    </div>
  );
}
