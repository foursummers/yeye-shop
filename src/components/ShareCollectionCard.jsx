import { forwardRef } from "react";
import { PRODUCTS } from "../data/products";
import { getSellingPrice } from "../utils/price";

const ShareCollectionCard = forwardRef(function ShareCollectionCard(
  { product },
  ref,
) {
  const catProds = PRODUCTS.filter((p) => p.category === product.category);

  return (
    <div
      ref={ref}
      style={{
        background: "#FFD600",
        borderRadius: 12,
        overflow: "hidden",
        border: "2px solid #111",
        padding: 12,
        width: "100%",
        fontFamily: "'Helvetica Neue', 'PingFang SC', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#111",
          margin: "-12px -12px 12px",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{ color: "#FFD600", fontWeight: 800, fontSize: 14 }}
        >
          YEYE · {product.category}合集
        </span>
        <span style={{ color: "#888", fontSize: 10 }}>全部包邮</span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
        }}
      >
        {catProds.slice(0, 9).map((p) => {
          const s = getSellingPrice(p);
          return (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: 6,
                overflow: "hidden",
                border: "1.5px solid #111",
              }}
            >
              <div
                style={{
                  aspectRatio: "1",
                  background: "#f0ede8",
                  overflow: "hidden",
                }}
              >
                {p.images?.[0] && (
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
              </div>
              <div style={{ padding: "5px 6px" }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "#333",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    marginBottom: 3,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{ fontSize: 11, fontWeight: 800, color: "#111" }}
                >
                  {p.cost === 0 ? "仅邮费" : s ? `¥${s}` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 10,
          color: "#888",
        }}
      >
        微信联系我下单 · 外贸清仓特惠
      </div>
    </div>
  );
});

export default ShareCollectionCard;
