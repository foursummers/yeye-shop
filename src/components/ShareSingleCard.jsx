import { forwardRef } from "react";
import { getSellingPrice, getDiscount } from "../utils/price";

const ShareSingleCard = forwardRef(function ShareSingleCard({ product }, ref) {
  const sell = getSellingPrice(product);
  const disc = getDiscount(product);

  return (
    <div
      ref={ref}
      style={{
        background: "#FFD600",
        borderRadius: 12,
        overflow: "hidden",
        border: "2px solid #111",
        width: "100%",
        fontFamily: "'Helvetica Neue', 'PingFang SC', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#111",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "#FFD600",
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 1,
          }}
        >
          YEYE 福利内购
        </span>
        <span style={{ color: "#FFD600", fontSize: 10, opacity: 0.7 }}>
          外贸清仓 · 全部包邮
        </span>
      </div>

      {/* Image */}
      <div
        style={{
          aspectRatio: "1",
          background: "#f0ede8",
          overflow: "hidden",
        }}
      >
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 14 }}>
        <div
          style={{
            display: "inline-block",
            background: "#111",
            color: "#FFD600",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 2,
            marginBottom: 8,
            letterSpacing: 1,
          }}
        >
          {product.category}
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#111",
            marginBottom: 4,
            lineHeight: 1.5,
          }}
        >
          {product.name}
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#666",
            marginBottom: 6,
            letterSpacing: 0.5,
          }}
        >
          尺寸：{product.size}
        </div>

        {product.desc && (
          <div
            style={{
              fontSize: 11,
              color: "#555",
              marginBottom: 10,
              lineHeight: 1.7,
            }}
          >
            {product.desc}
          </div>
        )}

        {/* Highlights */}
        {product.highlights?.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 10,
            }}
          >
            {product.highlights.map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 9,
                  color: "#111",
                  background: "rgba(0,0,0,0.08)",
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {product.note && (
          <div
            style={{
              fontSize: 10,
              color: "#333",
              background: "rgba(0,0,0,0.08)",
              padding: "4px 8px",
              borderRadius: 3,
              marginBottom: 10,
            }}
          >
            ⚠️ {product.note}
          </div>
        )}

        {/* Price */}
        <div
          style={{
            background: "#111",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {product.cost === 0 ? (
            <div>
              <div
                style={{ color: "#FFD600", fontSize: 18, fontWeight: 800 }}
              >
                🎁 仅需邮费
              </div>
              <div style={{ color: "#888", fontSize: 10 }}>
                商品免费 · 外贸清仓
              </div>
            </div>
          ) : sell ? (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#888", fontSize: 9, marginBottom: 2 }}>
                  YEYE 内购价
                </div>
                <div
                  style={{
                    color: "#FFD600",
                    fontSize: 26,
                    fontWeight: 800,
                  }}
                >
                  ¥{sell}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {product.taobaoPrice > 0 && (
                  <div
                    style={{
                      color: "#666",
                      fontSize: 11,
                      textDecoration: "line-through",
                    }}
                  >
                    淘宝 ¥{product.taobaoPrice}
                  </div>
                )}
                {disc > 0 && (
                  <div
                    style={{
                      color: "#FFD600",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    省 {disc}%
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 10,
            textAlign: "center",
            fontSize: 10,
            color: "#888",
          }}
        >
          微信联系我下单 · 数量有限先到先得
        </div>
      </div>
    </div>
  );
});

export default ShareSingleCard;
