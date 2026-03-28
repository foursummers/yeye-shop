import { SafeImg } from "./ImageGallery";
import { getSellingPrice, getDiscount } from "../utils/price";

export default function ProductCard({ product, onClick }) {
  const sell = getSellingPrice(product);
  const disc = getDiscount(product);
  const cover = product.images?.[0];

  return (
    <div onClick={onClick} className="cursor-pointer group">
      <div className="aspect-[3/4] bg-warm-dark overflow-hidden mb-2.5 relative">
        <SafeImg
          src={cover}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.03]"
        />
        {product.cost === 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-primary/75 px-2 py-1 text-[9px] text-accent tracking-[1px] font-semibold">
            FREE — 仅付邮费
          </div>
        )}
        {product.stock <= 15 && (
          <div className="absolute top-2 right-2 bg-white text-[8px] text-primary px-1.5 py-0.5 tracking-[1px]">
            库存紧张
          </div>
        )}
      </div>

      <div className="text-[10px] text-muted tracking-[1px] mb-0.5 uppercase">
        {product.category}
      </div>
      <div className="text-xs text-primary leading-relaxed mb-1 tracking-[0.3px] line-clamp-2">
        {product.name}
      </div>
      <div className="text-[10px] text-muted/70 mb-1.5">{product.size}</div>
      <div className="flex items-center gap-1.5">
        {product.cost === 0 ? (
          <span className="text-xs text-primary tracking-wide">— 仅邮费</span>
        ) : sell ? (
          <span className="text-sm font-semibold text-primary">¥{sell}</span>
        ) : null}
        {product.taobaoPrice > 0 && sell && (
          <span className="text-[10px] text-muted/50 line-through">
            ¥{product.taobaoPrice}
          </span>
        )}
        {disc > 0 && (
          <span className="text-[9px] text-white bg-primary px-1.5 py-[1px] tracking-wide">
            −{disc}%
          </span>
        )}
      </div>
    </div>
  );
}
