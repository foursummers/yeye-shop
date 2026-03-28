import ImageGallery from "./ImageGallery";
import {
  getSellingPrice,
  getDiscount,
  getDeliveryEstimate,
} from "../utils/price";

export default function ProductDetail({
  product,
  onBack,
  onAddCart,
  onShare,
  setPage,
}) {
  const sell = getSellingPrice(product);
  const disc = getDiscount(product);

  return (
    <div className="bg-warm min-h-[calc(100vh-84px)]">
      {/* Back */}
      <div className="px-[18px] py-3.5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="bg-transparent border-none cursor-pointer text-[11px] text-muted tracking-[1px] p-0 flex items-center gap-1.5"
        >
          <span className="text-sm">←</span> 返回
        </button>
      </div>

      {/* Gallery */}
      <ImageGallery images={product.images} name={product.name} />

      <div className="px-[18px] pt-5 pb-6">
        {/* Category */}
        <div className="text-[10px] text-muted tracking-[2px] mb-2 uppercase">
          {product.category}
        </div>

        {/* Title */}
        <h1 className="text-[17px] font-normal text-primary m-0 mb-3.5 leading-relaxed tracking-[0.3px]">
          {product.name}
        </h1>

        {/* Size */}
        <div className="text-xs text-muted mb-3 tracking-wide">
          尺寸：{product.size}
        </div>

        {/* Description */}
        {product.desc && (
          <p className="text-[13px] text-muted/80 m-0 mb-4 leading-[1.8] tracking-[0.3px]">
            {product.desc}
          </p>
        )}

        {/* Highlights */}
        {product.highlights?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {product.highlights.map((h) => (
              <span
                key={h}
                className="text-[10px] text-primary bg-accent/20 px-2.5 py-1 rounded-full tracking-wide"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Logistics */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="text-[10px] text-muted/80 bg-warm-dark px-2.5 py-1 tracking-wide">
            {product.location === "国内仓" ? "🟢" : "🟡"}{" "}
            {product.location} · {getDeliveryEstimate(product.location)}
          </span>
          {product.stock <= 15 && (
            <span className="text-[10px] text-red-700 bg-red-50 px-2.5 py-1 tracking-wide">
              仅剩 {product.stock} 件
            </span>
          )}
        </div>

        {/* Note */}
        {product.note && (
          <div className="border-l-2 border-accent py-2 px-3 bg-yellow-50/50 mb-4 text-[11px] text-muted/70 tracking-[0.3px]">
            ⚠️ {product.note}
          </div>
        )}

        {/* Price */}
        <div className="border-t border-b border-warm-border py-4 mb-5 flex items-center gap-3.5">
          {product.cost === 0 ? (
            <div>
              <div className="text-[11px] text-muted tracking-[1px] mb-0.5">
                价格
              </div>
              <div className="text-lg font-medium text-primary tracking-wide">
                仅需邮费
              </div>
              <div className="text-[10px] text-muted/50 mt-0.5">
                外贸清仓，商品免费
              </div>
            </div>
          ) : sell ? (
            <>
              <div>
                <div className="text-[11px] text-muted tracking-[1px] mb-0.5">
                  内购价
                </div>
                <div className="text-2xl font-medium text-primary">
                  ¥{sell}
                </div>
              </div>
              {product.taobaoPrice > 0 && (
                <div>
                  <div className="text-[10px] text-muted/50 tracking-wide">
                    淘宝同款
                  </div>
                  <div className="text-[13px] text-muted/40 line-through">
                    ¥{product.taobaoPrice}
                  </div>
                </div>
              )}
              {disc > 0 && (
                <div className="ml-auto bg-primary text-accent px-3 py-1.5 text-[13px] font-bold tracking-[1px]">
                  −{disc}%
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              onAddCart(product.id);
              setPage("cart");
            }}
            className="w-full py-3.5 bg-primary border-none text-warm text-xs tracking-[2px] cursor-pointer font-medium"
          >
            加入购物车并结算
          </button>
          <button
            onClick={() => onAddCart(product.id)}
            className="w-full py-3 bg-transparent border border-muted/30 text-muted/70 text-xs tracking-[2px] cursor-pointer"
          >
            加入购物车 · 继续逛
          </button>
          <button
            onClick={() => onShare(product)}
            className="w-full py-2.5 bg-transparent border-none text-muted text-[11px] tracking-[2px] cursor-pointer"
          >
            ↗ 生成分享图
          </button>
        </div>
      </div>
    </div>
  );
}
