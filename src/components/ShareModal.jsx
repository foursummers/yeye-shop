import { useState, useRef } from "react";
import ShareSingleCard from "./ShareSingleCard";
import ShareCollectionCard from "./ShareCollectionCard";
import { downloadAsImage } from "../utils/download";

export default function ShareModal({ product, onClose }) {
  const [mode, setMode] = useState("single");
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  async function handleDownload() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    const filename =
      mode === "single"
        ? `${product.name}.png`
        : `${product.category}合集.png`;
    const ok = await downloadAsImage(cardRef.current, filename);
    if (!ok) {
      alert("下载失败，请尝试截图保存");
    }
    setDownloading(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[200] flex items-end justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto px-4 pt-5 pb-8">
        {/* Drag handle */}
        <div className="w-9 h-[3px] bg-muted/30 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[15px] font-semibold tracking-wide">
            生成分享图
          </span>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-xl cursor-pointer text-muted p-1"
          >
            ×
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-5">
          {[
            ["single", "单品卡片"],
            ["cat", `${product.category}合集`],
          ].map(([k, v]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`flex-1 py-2.5 rounded border-none text-[13px] cursor-pointer tracking-wide transition-colors ${
                mode === k
                  ? "bg-primary text-accent font-bold"
                  : "bg-warm-dark text-muted/70 font-normal"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Card */}
        {mode === "single" ? (
          <ShareSingleCard ref={cardRef} product={product} />
        ) : (
          <ShareCollectionCard ref={cardRef} product={product} />
        )}

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`w-full mt-4 py-3.5 rounded-lg border-none text-xs tracking-[2px] cursor-pointer transition-colors ${
            downloading
              ? "bg-muted/30 text-muted"
              : "bg-primary text-accent font-bold"
          }`}
        >
          {downloading ? "生成中…" : "⬇ 下载图片"}
        </button>

        <p className="text-center text-[11px] text-muted mt-3">
          也可长按图片保存 / 截图后发送
        </p>
      </div>
    </div>
  );
}
