export function getSellingPrice(product) {
  if (!product || product.cost <= 0) return null;
  return Math.round(product.cost * 1.38);
}

export function getDiscount(product) {
  const sell = getSellingPrice(product);
  if (!sell || !product.taobaoPrice || product.taobaoPrice <= 0) return null;
  return Math.round((1 - sell / product.taobaoPrice) * 100);
}

export function getDeliveryEstimate(location) {
  return location === "国内仓" ? "预计 1-2 周到货" : "预计 2-4 周到货";
}

export function formatPrice(product) {
  if (product.cost === 0) return "仅付邮费";
  const sell = getSellingPrice(product);
  return sell ? `¥${sell}` : "";
}
