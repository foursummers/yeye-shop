import { useState } from "react";
import { PRODUCTS } from "../data/products";
import { getSellingPrice } from "../utils/price";
import { SafeImg } from "./ImageGallery";

export default function Cart({
  cart,
  updateQty,
  clearCart,
  cartCount,
  cartTotal,
  onSubmit,
  setPage,
}) {
  const [form, setForm] = useState({
    wechat: "",
    name: "",
    phone: "",
    addr: "",
    note: "",
  });
  const [done, setDone] = useState(false);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.wechat && form.name && form.addr;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(form);
    setForm({ wechat: "", name: "", phone: "", addr: "", note: "" });
    setDone(true);
  }

  return (
    <div className="px-[18px] pt-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6">
        <button
          onClick={() => setPage("shop")}
          className="bg-transparent border-none cursor-pointer text-[11px] text-muted tracking-[1px] p-0 flex items-center gap-1.5"
        >
          <span className="text-sm">←</span> 继续购物
        </button>
        <span className="text-sm tracking-[2px] text-primary">
          购物车{cartCount > 0 ? ` (${cartCount})` : ""}
        </span>
      </div>

      {done ? (
        <div className="text-center py-16">
          <div className="text-[11px] tracking-[3px] text-muted mb-4">
            提交成功
          </div>
          <div className="text-lg font-light text-primary mb-2 tracking-[1px]">
            下单成功
          </div>
          <p className="text-xs text-muted leading-[1.8] tracking-wide">
            我们会在24小时内通过微信确认订单
          </p>
          <button
            onClick={() => {
              setPage("shop");
              setDone(false);
            }}
            className="mt-5 px-7 py-3 bg-primary border-none text-warm text-[11px] tracking-[2px] cursor-pointer"
          >
            继续购物
          </button>
        </div>
      ) : cartCount === 0 ? (
        <div className="text-center py-16 text-muted/50">
          <div className="text-[11px] tracking-[3px] mb-4">购物车为空</div>
          <button
            onClick={() => setPage("shop")}
            className="px-7 py-3 bg-primary border-none text-warm text-[11px] tracking-[2px] cursor-pointer"
          >
            去逛逛
          </button>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="flex flex-col mb-6">
            {Object.entries(cart).map(([id, qty]) => {
              const p = PRODUCTS.find((x) => x.id === id);
              if (!p) return null;
              const sell = getSellingPrice(p);
              return (
                <div
                  key={id}
                  className="flex gap-3 py-4 border-b border-warm-border"
                >
                  <div className="w-[70px] h-[70px] bg-warm-dark shrink-0 overflow-hidden">
                    <SafeImg
                      src={p.images?.[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted tracking-[1px] mb-0.5">
                      {p.category}
                    </div>
                    <div className="text-xs text-primary leading-relaxed mb-1.5 line-clamp-2">
                      {p.name}
                    </div>
                    <div className="text-[13px] text-primary">
                      {p.cost === 0 ? "仅邮费" : sell ? `¥${sell}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => updateQty(id, 0)}
                      className="bg-transparent border-none text-base text-muted/40 cursor-pointer leading-none"
                    >
                      ×
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(id, qty - 1)}
                        className="bg-transparent border-none text-base text-primary cursor-pointer px-0.5"
                      >
                        −
                      </button>
                      <span className="text-[13px] min-w-[16px] text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => updateQty(id, qty + 1)}
                        className="bg-transparent border-none text-base text-primary cursor-pointer px-0.5"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shipping form */}
          <div className="mb-5">
            <div className="text-[10px] tracking-[2px] text-muted mb-4">
              收货信息
            </div>
            {[
              ["wechat", "微信号（必填）"],
              ["name", "收货人姓名（必填）"],
              ["phone", "手机号码"],
              ["addr", "省 / 市 / 区 / 详细地址（必填）"],
              ["note", "备注"],
            ].map(([k, ph]) => (
              <div key={k} className="border-b border-warm-border">
                <input
                  type="text"
                  placeholder={ph}
                  value={form[k]}
                  onChange={(e) => setField(k, e.target.value)}
                  className="w-full py-3.5 px-0 border-none bg-transparent text-[13px] outline-none tracking-[0.3px] text-primary box-border"
                />
              </div>
            ))}
          </div>

          {/* Total + Submit */}
          <div className="flex justify-between items-center py-4 border-t border-b border-warm-border mb-4">
            <span className="text-[11px] tracking-[1px] text-muted">
              合计 (不含运费)
            </span>
            <span className="text-lg font-medium text-primary">
              {cartTotal === 0 ? "仅付邮费" : `¥${cartTotal}`}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-4 border-none text-warm text-[11px] tracking-[3px] ${
              canSubmit
                ? "bg-primary cursor-pointer"
                : "bg-muted/40 cursor-not-allowed"
            }`}
          >
            提交订单
          </button>
        </>
      )}
    </div>
  );
}
