import { useState, useMemo } from "react";
import { PRODUCTS } from "../data/products";
import { SafeImg } from "./ImageGallery";

export default function Admin({ orders, setPage }) {
  const [adminOk, setAdminOk] = useState(false);
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState("summary");
  const [copied, setCopied] = useState(null);

  function cp(text, key) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  const prodSummary = useMemo(() => {
    const map = {};
    orders.forEach((o) =>
      o.items.forEach((item) => {
        if (!map[item.id])
          map[item.id] = {
            ...PRODUCTS.find((p) => p.id === item.id),
            totalQty: 0,
            buyers: [],
          };
        map[item.id].totalQty += item.qty;
        map[item.id].buyers.push(o.name + "(" + item.qty + ")");
      }),
    );
    return map;
  }, [orders]);

  return (
    <div className="px-[18px] pt-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6">
        <button
          onClick={() => setPage("shop")}
          className="bg-transparent border-none cursor-pointer text-[11px] text-muted tracking-[1px] p-0"
        >
          ← 返回
        </button>
        <span className="text-xs tracking-[2px] text-primary">管理后台</span>
      </div>

      {!adminOk ? (
        <div className="text-center pt-10">
          <div className="text-[10px] tracking-[3px] text-muted mb-5">
            请输入密码
          </div>
          <input
            type="password"
            placeholder="密码"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && pw === "admin888" && setAdminOk(true)
            }
            className="w-[80%] py-3 px-4 border-0 border-b border-warm-border bg-transparent text-sm outline-none text-center tracking-[3px] block mx-auto mb-4"
          />
          <button
            onClick={() => pw === "admin888" && setAdminOk(true)}
            className="px-7 py-3 bg-primary border-none text-warm text-[11px] tracking-[2px] cursor-pointer"
          >
            进入
          </button>
          <div className="text-[10px] text-muted/30 mt-3">admin888</div>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="flex justify-between mb-5">
            <span className="text-[10px] text-muted tracking-[1px]">
              {new Date().toLocaleDateString("zh-CN")} · {orders.length} 单
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-5 border-b border-warm-border">
            {[
              ["summary", "商品汇总"],
              ["orders", "订单明细"],
            ].map(([k, v]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`bg-transparent border-none py-2 text-[11px] tracking-[1.5px] cursor-pointer -mb-px ${
                  tab === k
                    ? "text-primary border-b-[1.5px] border-b-primary"
                    : "text-muted/50 border-b-[1.5px] border-b-transparent"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {orders.length === 0 && (
            <div className="text-center py-10 text-[11px] text-muted/50 tracking-[2px]">
              暂无订单
            </div>
          )}

          {/* Summary tab */}
          {tab === "summary" && orders.length > 0 && (
            <>
              {Object.values(prodSummary)
                .sort((a, b) => b.totalQty - a.totalQty)
                .map((prod) => (
                  <div
                    key={prod.id}
                    className="flex gap-3 py-3.5 border-b border-warm-border items-center"
                  >
                    <div className="w-[52px] h-[52px] bg-warm-dark shrink-0 overflow-hidden">
                      <SafeImg
                        src={prod.images?.[0]}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-primary leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5">
                        {prod.buyers.join(" · ")}
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-primary shrink-0">
                      ×{prod.totalQty}
                    </div>
                  </div>
                ))}

              <button
                onClick={() =>
                  cp(
                    "【Yeye 今日汇总 " +
                      new Date().toLocaleDateString("zh-CN") +
                      "】\n" +
                      Object.values(prodSummary)
                        .map((p) => `· ${p.name} × ${p.totalQty}件`)
                        .join("\n"),
                    "sum",
                  )
                }
                className={`w-full mt-4 py-3 border-none text-[11px] tracking-[2px] cursor-pointer transition-colors ${
                  copied === "sum"
                    ? "bg-warm-dark text-primary"
                    : "bg-primary text-warm"
                }`}
              >
                {copied === "sum" ? "✓ 已复制" : "一键复制汇总"}
              </button>
            </>
          )}

          {/* Orders tab */}
          {tab === "orders" &&
            orders.length > 0 &&
            orders.map((o) => (
              <div key={o.id} className="py-4 border-b border-warm-border">
                {/* Order header */}
                <div className="flex justify-between mb-2.5">
                  <span className="text-[10px] text-muted tracking-[1px]">
                    {o.id} · {o.date} {o.time}
                  </span>
                  <span className="text-[13px] font-medium text-primary">
                    {o.total === 0 ? "邮费" : `¥${o.total}`}
                  </span>
                </div>

                {/* Items */}
                <div className="text-[11px] text-muted/80 mb-3 leading-[1.8] bg-warm-dark/50 p-2.5 whitespace-pre-line">
                  {o.items
                    .map((i) => i.name.slice(0, 18) + " ×" + i.qty)
                    .join("\n")}
                </div>

                {/* Info fields with copy */}
                {[
                  ["微信", o.wechat, o.id + "wx"],
                  ["姓名", o.name, o.id + "nm"],
                  ["电话", o.phone || "—", o.id + "ph"],
                  ["地址", o.addr, o.id + "ad"],
                  ...(o.note ? [["备注", o.note, o.id + "nt"]] : []),
                ].map(([lbl, val, key]) => (
                  <div
                    key={lbl}
                    className="flex items-center gap-2.5 py-2 border-b border-warm-dark"
                  >
                    <span className="text-[9px] text-muted/50 tracking-[1.5px] min-w-[28px] shrink-0 uppercase">
                      {lbl}
                    </span>
                    <span className="text-xs text-primary flex-1 break-all">
                      {val}
                    </span>
                    <button
                      onClick={() => cp(val, key)}
                      className={`bg-transparent border-none cursor-pointer text-[10px] tracking-[1px] shrink-0 ${
                        copied === key
                          ? "text-primary font-semibold"
                          : "text-muted/50"
                      }`}
                    >
                      {copied === key ? "✓" : "复制"}
                    </button>
                  </div>
                ))}

                {/* Quick copy buttons */}
                <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                  {[
                    [
                      "全部信息",
                      `${o.name} ${o.phone || ""}\n${o.addr}\n微信:${o.wechat}\n${o.items.map((i) => i.name.slice(0, 12) + "×" + i.qty).join("，")}\n合计:${o.total === 0 ? "仅邮费" : "¥" + o.total}${o.note ? "\n备注:" + o.note : ""}`,
                      o.id + "all",
                    ],
                    ["收货地址", o.addr, o.id + "a2"],
                    [
                      "姓名+电话",
                      o.name + " " + (o.phone || ""),
                      o.id + "np",
                    ],
                  ].map(([lbl, val, key]) => (
                    <button
                      key={key}
                      onClick={() => cp(val, key)}
                      className={`py-2 border-none text-[9px] cursor-pointer tracking-[1px] transition-colors ${
                        copied === key
                          ? "bg-primary text-warm"
                          : "bg-warm-dark text-muted/80"
                      }`}
                    >
                      {copied === key ? "✓" : lbl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
