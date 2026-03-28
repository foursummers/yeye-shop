import { useState, useMemo } from "react";
import { PRODUCTS, CATEGORIES } from "../data/products";
import ProductCard from "./ProductCard";

export default function ProductList({ onDetail }) {
  const [cat, setCat] = useState("全部");
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      PRODUCTS.filter((p) => {
        if (cat !== "全部" && p.category !== cat) return false;
        if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [cat, q],
  );

  return (
    <div className="px-[18px] pt-4 pb-6">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索商品名称…"
        className="w-full px-0 py-2.5 border-0 border-b border-warm-border bg-transparent text-sm outline-none mb-[18px] tracking-wide text-primary box-border"
      />

      <div className="flex gap-5 overflow-x-auto mb-5 pb-0.5 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 bg-transparent border-none cursor-pointer text-xs tracking-[1px] py-1 transition-all duration-200 ${
              cat === c
                ? "text-primary font-semibold border-b-[1.5px] border-b-primary"
                : "text-muted/60 font-normal border-b-[1.5px] border-b-transparent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="text-[10px] text-muted/50 tracking-[1px] mb-4">
        {filtered.length} 件商品
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} onClick={() => onDetail(p)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted/50 text-xs tracking-widest">
          暂无相关商品
        </div>
      )}
    </div>
  );
}
