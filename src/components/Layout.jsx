export default function Layout({
  page,
  setPage,
  cartCount,
  setDetail,
  setDone,
}) {
  return (
    <div className="sticky top-0 z-90 bg-warm border-b border-warm-border">
      <div className="px-[18px] h-[52px] flex items-center justify-between">
        <span
          onClick={() => {
            setPage("shop");
            setDetail(null);
            setDone?.(false);
          }}
          className="font-light text-xl cursor-pointer text-primary tracking-[3px] uppercase select-none"
        >
          Yeye
        </span>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => {
              setPage("cart");
              setDetail(null);
            }}
            className="relative bg-transparent border-none cursor-pointer text-[13px] text-primary py-1 tracking-wide"
          >
            购物车
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-primary text-warm rounded-full w-[15px] h-[15px] text-[9px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setPage("admin");
              setDetail(null);
            }}
            className="bg-transparent border-none cursor-pointer text-[11px] text-muted py-1 tracking-wide"
          >
            管理
          </button>
        </div>
      </div>
      <div className="bg-primary text-warm-dark text-[10px] py-[5px] text-center tracking-[1.5px]">
        全部包邮 · 外贸清仓 · 带插排商品需欧标转换头 · 家具为高密度板需自行拼装
      </div>
    </div>
  );
}
