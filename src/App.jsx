import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { PRODUCTS as SEED_PRODUCTS } from "./data/products";
import { supabase, uploadImage } from "./lib/supabase";

const MARGIN = 1.38;
const ADMIN_HASH = "19dcc6013b6683a7b8d74a07bceaa774860032470eb978c49fd323050707cad9";
async function sha256(msg){const d=new TextEncoder().encode(msg);const h=await crypto.subtle.digest("SHA-256",d);return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");};
const sp = p => p.cost > 0 ? Math.round(p.cost * MARGIN) : null;
const dc = p => { const s = sp(p); return s && p.tb > 0 ? Math.round((1 - s / p.tb) * 100) : null; };

const STATUS_CONFIG = {
  pending:   { label: "待确认", color: "#888", bg: "#f5f3f0" },
  paid:      { label: "已支付", color: "#185fa5", bg: "#e6f1fb" },
  ordering:  { label: "下单中", color: "#854f0b", bg: "#faeeda" },
  shipped:   { label: "已发货", color: "#3b6d11", bg: "#eaf3de" },
  delivered: { label: "已到货", color: "#0f6e56", bg: "#e1f5ee" },
  nostock:   { label: "无货",   color: "#a32d2d", bg: "#fcebeb" },
  cancelled: { label: "已取消", color: "#999", bg: "#f0f0f0" },
};
const STATUSES = Object.keys(STATUS_CONFIG);

// ── DB ↔ Frontend field mapping ─────────────────────────────
function dbToProduct(r) {
  return { id:r.id, n:r.name, cat:r.category, cost:Number(r.cost), tb:Number(r.taobao_price), st:r.stock, loc:r.location, note:r.note||"", season:r.season||"", imgs:r.images||[], desc:r.description||"", recommended:!!r.recommended, hidden:!!r.hidden };
}
function productToDb(p) {
  return { id:p.id, name:p.n, category:p.cat, cost:p.cost, taobao_price:p.tb, stock:p.st, location:p.loc, note:p.note, season:p.season, images:p.imgs, description:p.desc, recommended:p.recommended, hidden:p.hidden };
}
function dbToOrder(r) {
  return { id:r.id, prodId:r.product_id, qty:r.quantity, wechat:r.wechat||"", name:r.customer_name||"", phone:r.phone||"", addr:r.address||"", note:r.note||"", status:r.status||"pending", paidAmt:Number(r.paid_amount)||0, date:r.order_date||"", time:r.order_time||"", groupId:r.group_id||r.id };
}
function orderToDb(o) {
  return { id:o.id, product_id:o.prodId, quantity:o.qty, wechat:o.wechat, customer_name:o.name, phone:o.phone, address:o.addr, note:o.note, status:o.status, paid_amount:o.paidAmt, order_date:o.date, order_time:o.time, group_id:o.groupId||o.id };
}

// SEED_PRODUCTS imported directly from ./data/products (already in frontend format)

// ── localStorage fallback ────────────────────────────────────
function lsGet(k, d) { try { const s=localStorage.getItem(k); return s?JSON.parse(s):d; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ── UI Components ────────────────────────────────────────────
function ImgBox({ srcs, alt, style, onClick }) {
  const [i, setI] = useState(0);
  const [err, setErr] = useState(false);
  const src = srcs?.[i];
  if (!src || err) return (
    <div style={{ ...style, background:"#ebe8e3", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:onClick?"pointer":"default" }} onClick={onClick}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity:0.2 }}><rect x="2" y="4" width="20" height="16" rx="2" stroke="#111" strokeWidth="1.5"/><circle cx="8" cy="10" r="2" stroke="#111" strokeWidth="1.5"/><path d="M2 17l5-5 4 4 3-3 8 7" stroke="#111" strokeWidth="1.5"/></svg>
      <div style={{ fontSize:9, color:"#bbb", marginTop:4, textAlign:"center", padding:"0 6px" }}>{alt}</div>
    </div>
  );
  return <img src={src} alt={alt} style={{ ...style, cursor:onClick?"pointer":"default" }} onError={()=>{ if(srcs?.[i+1]) setI(i+1); else setErr(true); }} onClick={onClick} loading="lazy" />;
}

function Tag({ children, color, bg }) {
  return <span style={{ fontSize:9, padding:"2px 6px", background:bg||"#f0ede8", color:color||"#555", borderRadius:2, whiteSpace:"nowrap" }}>{children}</span>;
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span style={{ fontSize:10, padding:"3px 9px", background:c.bg, color:c.color, borderRadius:2, whiteSpace:"nowrap", fontWeight:500 }}>{c.label}</span>;
}

// ── Share card ──────────────────────────────────────────────
function ShareModal({ prod, onClose, allProds }) {
  const [mode, setMode] = useState("single");
  const sell = sp(prod), disc = dc(prod);
  const catProds = allProds.filter(p => p.cat === prod.cat && !p.hidden);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"flex-end" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#faf9f7", borderRadius:"14px 14px 0 0", width:"100%", maxWidth:480, maxHeight:"92vh", overflowY:"auto", padding:"20px 18px 40px", margin:"0 auto" }}>
        <div style={{ width:32, height:2, background:"#ccc", margin:"0 auto 18px" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontSize:12, letterSpacing:1 }}>分享图</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#aaa" }}>×</button>
        </div>
        <div style={{ display:"flex", borderBottom:"1px solid #e8e4de", marginBottom:18 }}>
          {[["single","单品卡片"],["cat",prod.cat+"合集"]].map(([k,v])=>(
            <button key={k} onClick={()=>setMode(k)} style={{ flex:1, background:"none", border:"none", padding:"9px 0", fontSize:11, cursor:"pointer", color:mode===k?"#111":"#bbb", borderBottom:mode===k?"1.5px solid #111":"1.5px solid transparent", marginBottom:-1 }}>{v}</button>
          ))}
        </div>
        {mode==="single" && (
          <div style={{ background:"#fff", border:"1px solid #e0ddd8" }}>
            <div style={{ padding:"10px 14px 0", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:13, fontWeight:600, letterSpacing:2 }}>YEYE</span>
              <span style={{ fontSize:9, color:"#aaa", letterSpacing:1 }}>外贸清仓 · 包邮</span>
            </div>
            <div style={{ aspectRatio:"1", background:"#ebe8e3", margin:"10px 14px", overflow:"hidden" }}>
              <ImgBox srcs={prod.imgs} alt={prod.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            </div>
            <div style={{ padding:"0 14px 14px" }}>
              <Tag>{prod.cat}</Tag>
              <div style={{ fontSize:13, fontWeight:500, color:"#111", margin:"7px 0 5px", lineHeight:1.5 }}>{prod.n}</div>
              {prod.desc&&<div style={{ fontSize:10, color:"#888", marginBottom:8, lineHeight:1.7 }}>{prod.desc}</div>}
              {prod.note&&<div style={{ fontSize:9, color:"#999", marginBottom:8 }}>⚠ {prod.note}</div>}
              <div style={{ borderTop:"1px solid #e8e4de", paddingTop:10, display:"flex", alignItems:"center", gap:8 }}>
                {prod.cost===0?<span style={{ fontSize:15, fontWeight:600 }}>仅需邮费</span>
                  :sell?<><span style={{ fontSize:20, fontWeight:700 }}>¥{sell}</span>{prod.tb>0&&<span style={{ fontSize:10, color:"#ccc", textDecoration:"line-through" }}>¥{prod.tb}</span>}{disc&&disc>0&&<span style={{ fontSize:9, background:"#111", color:"#fff", padding:"2px 5px" }}>省{disc}%</span>}</>:null}
                <span style={{ marginLeft:"auto", fontSize:9, color:"#aaa" }}>{prod.loc==="国内仓"?"1-2周到":"2-3周到"}</span>
              </div>
              <div style={{ marginTop:8, textAlign:"center", fontSize:9, color:"#ccc", letterSpacing:1 }}>微信联系我下单</div>
            </div>
          </div>
        )}
        {mode==="cat" && (
          <div style={{ background:"#fff", border:"1px solid #e0ddd8", padding:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, paddingBottom:8, borderBottom:"1px solid #eee" }}>
              <span style={{ fontSize:12, fontWeight:600, letterSpacing:1 }}>YEYE · {prod.cat}</span>
              <span style={{ fontSize:9, color:"#aaa" }}>外贸清仓 · 包邮</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7 }}>
              {catProds.slice(0,9).map(p=>{const s=sp(p),d=dc(p);return <div key={p.id}><div style={{ aspectRatio:"1", background:"#ebe8e3", overflow:"hidden", marginBottom:4 }}><ImgBox srcs={p.imgs} alt={p.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div><div style={{ fontSize:9, color:"#333", lineHeight:1.4, marginBottom:2, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.n}</div><div style={{ display:"flex", alignItems:"center", gap:3 }}>{p.cost===0?<span style={{ fontSize:10, fontWeight:600 }}>仅邮费</span>:s?<span style={{ fontSize:11, fontWeight:700 }}>¥{s}</span>:null}{d&&d>0&&<span style={{ fontSize:8, background:"#111", color:"#fff", padding:"1px 3px" }}>-{d}%</span>}</div></div>;})}
            </div>
            <div style={{ marginTop:10, textAlign:"center", fontSize:9, color:"#ccc" }}>微信联系我下单 · 数量有限</div>
          </div>
        )}
        <p style={{ textAlign:"center", fontSize:10, color:"#bbb", marginTop:10 }}>截图后发送至群里</p>
      </div>
    </div>
  );
}

// ── Product Modal (with image upload) ────────────────────────
function ProductModal({ product, onSave, onClose }) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState(product || { id:"", n:"", cat:"", cost:0, tb:0, st:0, loc:"工厂", note:"", season:"Q2 2025", imgs:[], desc:"", recommended:false, hidden:false });
  const [uploading, setUploading] = useState(false);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  async function handleFileUpload(file, idx) {
    if (!file) return;
    setUploading(true);
    try {
      if (supabase) {
        try {
          const url = await uploadImage(file);
          const newImgs = [...(form.imgs||[])];
          newImgs[idx] = url;
          f("imgs", newImgs);
          setUploading(false);
          return;
        } catch (_) { /* Storage full or failed, fall through to base64 */ }
      }
      const reader = new FileReader();
      reader.onload = ev => {
        const newImgs = [...(form.imgs||[])];
        newImgs[idx] = ev.target.result;
        f("imgs", newImgs);
        setUploading(false);
      };
      reader.readAsDataURL(file);
      return;
    } catch (e) {
      alert("上传失败: " + e.message);
    }
    setUploading(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#faf9f7", borderRadius:12, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontWeight:600, fontSize:14 }}>{isEdit?"编辑商品":"添加商品"}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#aaa" }}>×</button>
        </div>
        {[["商品编号","id","text"],["商品名称","n","text"],["品类","cat","text"],["尺寸/描述","desc","text"],["内购价（0=仅邮费）","cost","number"],["淘宝参考价","tb","number"],["库存数量","st","number"],["注意事项","note","text"],["所属季度","season","text"]].map(([lbl,key,type])=>(
          <div key={key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>{lbl}</div>
            <input type={type} value={form[key]} onChange={e=>f(key,type==="number"?Number(e.target.value):e.target.value)} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/>
          </div>
        ))}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>库存地</div>
          <div style={{ display:"flex", gap:8 }}>
            {["工厂","国内仓"].map(l=>(<button key={l} onClick={()=>f("loc",l)} style={{ flex:1, padding:"8px 0", border:"1px solid", borderColor:form.loc===l?"#111":"#e0ddd8", background:form.loc===l?"#111":"#fff", color:form.loc===l?"#fff":"#555", borderRadius:6, cursor:"pointer", fontSize:12 }}>{l}</button>))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>
            商品图片（最多4张）
            {supabase&&<span style={{ color:"#0f6e56", marginLeft:6 }}>· 自动上传图床</span>}
            {uploading&&<span style={{ color:"#854f0b", marginLeft:6 }}>上传中...</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            {[0,1,2,3].map(i=>{
              const hasImg = form.imgs?.[i];
              return (
                <label key={i} style={{ aspectRatio:"1", background:hasImg?"#000":"#f0ede8", borderRadius:6, border:"1px dashed #ccc", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:uploading?"wait":"pointer", overflow:"hidden", position:"relative" }}>
                  {hasImg ? (
                    <>
                      <img src={form.imgs[i]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{e.target.style.display="none";}}/>
                      <button onClick={e=>{e.preventDefault();e.stopPropagation();const ni=[...form.imgs];ni.splice(i,1);f("imgs",ni);}} style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,0.6)", border:"none", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity:0.3, marginBottom:4 }}><rect x="1" y="3" width="18" height="14" rx="2" stroke="#111" strokeWidth="1.5"/><circle cx="7" cy="9" r="2" stroke="#111" strokeWidth="1.5"/><path d="M1 15l5-5 4 4 3-3 6 5" stroke="#111" strokeWidth="1.5"/></svg>
                      <span style={{ fontSize:9, color:"#aaa" }}>{uploading?"上传中...":"点击上传"}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" disabled={uploading} style={{ display:"none" }} onChange={e=>{
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, i);
                    e.target.value = "";
                  }}/>
                </label>
              );
            })}
          </div>
          <div style={{ fontSize:9, color:"#bbb", marginBottom:6 }}>— 或者粘贴图片链接（每行一个）—</div>
          <textarea value={(form.imgs||[]).filter(s=>s&&!s.startsWith("data:")).join("\n")} onChange={e=>{
            const urls=e.target.value.split("\n").filter(Boolean);
            f("imgs",urls.slice(0,4));
          }} rows={2} placeholder="/images/10001.jpg 或 https://..." style={{ width:"100%", padding:"8px 10px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:11, boxSizing:"border-box", resize:"none", color:"#555" }}/>
        </div>
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <button onClick={()=>f("recommended",!form.recommended)} style={{ flex:1, padding:"9px 0", border:"1px solid", borderColor:form.recommended?"#854f0b":"#e0ddd8", background:form.recommended?"#faeeda":"#fff", color:form.recommended?"#854f0b":"#aaa", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:form.recommended?600:400 }}>{form.recommended?"★ 已推荐":"☆ 设为推荐"}</button>
          <button onClick={()=>f("hidden",!form.hidden)} style={{ flex:1, padding:"9px 0", border:"1px solid", borderColor:form.hidden?"#a32d2d":"#e0ddd8", background:form.hidden?"#fcebeb":"#fff", color:form.hidden?"#a32d2d":"#aaa", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:form.hidden?600:400 }}>{form.hidden?"已下架":"上架中"}</button>
        </div>
        <button disabled={uploading} onClick={()=>onSave(form)} style={{ width:"100%", padding:"13px 0", background:uploading?"#999":"#111", border:"none", color:"#faf9f7", fontSize:12, letterSpacing:1, borderRadius:6, cursor:uploading?"wait":"pointer" }}>
          {uploading?"图片上传中...":(isEdit?"保存修改":"添加商品")}
        </button>
      </div>
    </div>
  );
}

// ── Order Modal ──────────────────────────────────────────────
function OrderModal({ order, products, onSave, onClose }) {
  const isEdit = !!order?.id;
  const [form, setForm] = useState(order || { id:"", prodId:"", qty:1, wechat:"", name:"", phone:"", addr:"", note:"", status:"pending", paidAmt:0 });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const prod = products.find(p=>p.id===form.prodId);
  const total = prod ? (sp(prod)||0)*form.qty : 0;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#faf9f7", borderRadius:12, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontWeight:600, fontSize:14 }}>{isEdit?"编辑订单":"新增订单"}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#aaa" }}>×</button>
        </div>
        <div style={{ marginBottom:10 }}><div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>选择商品</div>
          <select value={form.prodId} onChange={e=>f("prodId",e.target.value)} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:12, background:"#fff" }}><option value="">-- 请选择 --</option>{products.map(p=><option key={p.id} value={p.id}>{p.n}</option>)}</select>
        </div>
        <div style={{ marginBottom:10 }}><div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>数量</div>
          <input type="number" min={1} value={form.qty} onChange={e=>f("qty",Number(e.target.value))} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/>
        </div>
        {[["微信号","wechat","text"],["收货人姓名","name","text"],["手机号","phone","tel"],["收货地址","addr","text"],["备注","note","text"]].map(([lbl,key,type])=>(
          <div key={key} style={{ marginBottom:10 }}><div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>{lbl}</div>
            <input type={type} value={form[key]} onChange={e=>f(key,e.target.value)} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/></div>
        ))}
        <div style={{ marginBottom:10 }}><div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>实收金额</div>
          <input type="number" value={form.paidAmt} onChange={e=>f("paidAmt",Number(e.target.value))} placeholder={String(total||"0")} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/>
        </div>
        <div style={{ marginBottom:14 }}><div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>订单状态</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{STATUSES.map(s=>(<button key={s} onClick={()=>f("status",s)} style={{ padding:"5px 12px", border:"1px solid", borderColor:form.status===s?"#111":"#e0ddd8", background:form.status===s?"#111":"#fff", color:form.status===s?"#fff":"#555", borderRadius:4, cursor:"pointer", fontSize:11 }}>{STATUS_CONFIG[s].label}</button>))}</div>
        </div>
        {prod&&total>0&&<div style={{ background:"#f5f3f0", padding:"10px 12px", borderRadius:6, marginBottom:12, fontSize:12, color:"#555" }}>应收：¥{sp(prod)||0} × {form.qty} = <strong>¥{total}</strong></div>}
        <button onClick={()=>onSave(form)} style={{ width:"100%", padding:"13px 0", background:"#111", border:"none", color:"#faf9f7", fontSize:12, letterSpacing:1, borderRadius:6, cursor:"pointer" }}>{isEdit?"保存修改":"提交订单"}</button>
      </div>
    </div>
  );
}

// ── Checkout Modal (batch) ────────────────────────────────────
function CheckoutModal({ cart, products, onSubmit, onClose }) {
  const [form, setForm] = useState({ wechat:lsGet("yeye_mywx",""), name:"", phone:"", addr:"", note:"" });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const cartItems = cart.map(item=>{const prod=products.find(p=>p.id===item.prodId);return prod?{...item,prod,price:sp(prod)||0}:null;}).filter(Boolean);
  const total = cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const hasFree = cartItems.some(i=>i.prod.cost===0);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#faf9f7", borderRadius:12, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontWeight:600, fontSize:14 }}>确认订单</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#aaa" }}>×</button>
        </div>
        <div style={{ background:"#f5f3f0", borderRadius:8, padding:12, marginBottom:16 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:8, letterSpacing:1 }}>订单商品（{cartItems.length}件）</div>
          {cartItems.map(item=>(
            <div key={item.prodId} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #e8e4de", fontSize:12 }}>
              <span style={{ flex:1, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginRight:8 }}>{item.prod.n}</span>
              <span style={{ color:"#aaa", marginRight:8, flexShrink:0 }}>×{item.qty}</span>
              <span style={{ fontWeight:600, flexShrink:0 }}>{item.prod.cost===0?"邮费":"¥"+(item.price*item.qty)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, fontSize:14, fontWeight:600 }}>
            <span>合计</span><span>¥{total}{hasFree?" + 部分邮费":""}</span>
          </div>
        </div>
        {[["微信号 *","wechat","text"],["收货人姓名 *","name","text"],["手机号","phone","tel"],["收货地址 *","addr","text"],["备注","note","text"]].map(([lbl,key,type])=>(
          <div key={key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>{lbl}</div>
            <input type={type} value={form[key]} onChange={e=>f(key,e.target.value)} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/>
          </div>
        ))}
        <button onClick={()=>onSubmit(form)} style={{ width:"100%", padding:"13px 0", background:"#111", border:"none", color:"#faf9f7", fontSize:12, letterSpacing:1, borderRadius:6, cursor:"pointer", marginTop:4 }}>提交订单</button>
        <div style={{ textAlign:"center", fontSize:9, color:"#bbb", marginTop:8 }}>提交后请在微信群内确认付款</div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState(false);
  const [connError, setConnError] = useState(null);

  const [page, setPage] = useState("shop");
  const [adminTab, setAdminTab] = useState("kanban");
  const [adminOk, setAdminOk] = useState(false);
  const [pw, setPw] = useState("");
  const [catFilter, setCatFilter] = useState("全部");
  const [seasonFilter, setSeasonFilter] = useState("全部");
  const [searchQ, setSearchQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [copied, setCopied] = useState(null);
  const [cart, setCart] = useState(()=>lsGet("yeye_cart",[]));
  const [showCheckout, setShowCheckout] = useState(false);
  const [myWechat, setMyWechat] = useState(()=>lsGet("yeye_mywx",""));
  const [detailQty, setDetailQty] = useState(1);
  const [addedTip, setAddedTip] = useState(false);
  const [orderWxFilter, setOrderWxFilter] = useState("");
  const [orderProdFilter, setOrderProdFilter] = useState("");
  const scrollPos = useRef(0);

  async function loadFromSupabase() {
    if (!supabase) {
      setProducts(lsGet("yeye_p3", SEED_PRODUCTS));
      setOrders(lsGet("yeye_o", []));
      setLoading(false);
      setConnError("env");
      return;
    }
    setConnError(null);
    let pOk = false, oOk = false, errMsg = "";
    try {
      const { data: pRows, error: pErr } = await supabase.from("products").select("*").order("created_at");
      if (pErr) throw pErr;
      if (pRows.length === 0) {
        const seedDb = SEED_PRODUCTS.map(productToDb);
        const { error: seedErr } = await supabase.from("products").upsert(seedDb, { onConflict: "id" });
        if (seedErr) console.warn("[yeye] seed:", seedErr.message);
        const { data: refetch } = await supabase.from("products").select("*").order("created_at");
        setProducts((refetch||[]).map(dbToProduct));
      } else {
        setProducts(pRows.map(dbToProduct));
      }
      pOk = true;
    } catch (e) {
      errMsg += "商品: " + e.message + "; ";
      setProducts(lsGet("yeye_p3", SEED_PRODUCTS));
    }
    try {
      const { data: oRows, error: oErr } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (oErr) throw oErr;
      setOrders(oRows.map(dbToOrder));
      oOk = true;
    } catch (e) {
      errMsg += "订单: " + e.message;
      setOrders(lsGet("yeye_o", []));
    }
    setDbMode(pOk || oOk);
    if (!pOk && !oOk) setConnError(errMsg || "unknown");
    setLoading(false);
  }

  // ── Load data on mount ───────────────────────────────────
  useEffect(() => { loadFromSupabase(); }, []);

  // ── Sync to localStorage when not using DB ────────────────
  useEffect(() => { if (!dbMode && !loading) { lsSet("yeye_p3", products); } }, [products, dbMode, loading]);
  useEffect(() => { if (!dbMode && !loading) { lsSet("yeye_o", orders); } }, [orders, dbMode, loading]);
  useEffect(() => { lsSet("yeye_cart", cart); }, [cart]);

  // ── Derived data ──────────────────────────────────────────
  const cats = ["全部", ...Array.from(new Set(products.map(p=>p.cat)))];
  const seasons = ["全部", ...Array.from(new Set(products.map(p=>p.season).filter(Boolean)))];

  const shopProds = useMemo(()=>{
    let list = products.filter(p=>{ if(p.hidden) return false; if(catFilter!=="全部"&&p.cat!==catFilter) return false; if(seasonFilter!=="全部"&&p.season!==seasonFilter) return false; if(searchQ&&!p.n.toLowerCase().includes(searchQ.toLowerCase())&&!p.id.toLowerCase().includes(searchQ.toLowerCase())) return false; return true; });
    list.sort((a,b)=>(b.recommended?1:0)-(a.recommended?1:0));
    return list;
  },[products,catFilter,seasonFilter,searchQ]);

  const adminProds = useMemo(()=>products.filter(p=>{ if(catFilter!=="全部"&&p.cat!==catFilter) return false; if(seasonFilter!=="全部"&&p.season!==seasonFilter) return false; if(searchQ&&!p.n.toLowerCase().includes(searchQ.toLowerCase())&&!p.id.toLowerCase().includes(searchQ.toLowerCase())) return false; return true; }),[products,catFilter,seasonFilter,searchQ]);

  function cp(text,key){navigator.clipboard.writeText(text).catch(()=>{});setCopied(key);setTimeout(()=>setCopied(null),1800);}

  // ── Cart ────────────────────────────────────────────────────
  function addToCart(prodId, qty=1) {
    setCart(c=>{const ex=c.find(x=>x.prodId===prodId);if(ex)return c.map(x=>x.prodId===prodId?{...x,qty:x.qty+qty}:x);return[...c,{prodId,qty}];});
    setAddedTip(true); setTimeout(()=>setAddedTip(false),1500);
  }
  function removeFromCart(prodId){setCart(c=>c.filter(x=>x.prodId!==prodId));}
  function updateCartQty(prodId,qty){setCart(c=>c.map(x=>x.prodId===prodId?{...x,qty:Math.max(1,qty)}:x));}

  async function batchCheckout(info) {
    if(!info.wechat||!info.name||!info.addr)return alert("请填写微信号、姓名和地址");
    if(cart.length===0)return alert("购物车为空");
    const gid=Date.now().toString(36).toUpperCase();
    const now=new Date(),date=now.toLocaleDateString("zh-CN"),time=now.toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
    const newOrders=cart.map((item,i)=>({id:gid+"-"+(i+1),prodId:item.prodId,qty:item.qty,wechat:info.wechat,name:info.name,phone:info.phone||"",addr:info.addr,note:info.note||"",status:"pending",paidAmt:0,date,time,groupId:gid}));
    setOrders(o=>[...newOrders,...o]);
    if(db){const{error}=await db.from("orders").insert(newOrders.map(orderToDb));if(error)alert("订单提交失败: "+error.message);}
    setMyWechat(info.wechat);lsSet("yeye_mywx",info.wechat);
    setCart([]);setShowCheckout(false);setPage("myorders");
  }

  async function cancelGroup(groupId) {
    if(!confirm("确认取消该订单？"))return;
    setOrders(o=>o.map(x=>x.groupId===groupId?{...x,status:"cancelled"}:x));
    if(db) await db.from("orders").update({status:"cancelled"}).eq("group_id",groupId);
  }

  async function markGroupShipped(groupId) {
    setOrders(o=>o.map(x=>x.groupId===groupId&&x.status==="paid"?{...x,status:"shipped"}:x));
    if(db) await db.from("orders").update({status:"shipped"}).eq("group_id",groupId).eq("status","paid");
  }

  const db = supabase;

  // ── Product CRUD ──────────────────────────────────────────
  async function saveProduct(form) {
    if(!form.id||!form.n) return alert("请填写编号和名称");
    if(editProduct==="new") {
      setProducts(p=>[...p,form]);
      if(db){
        const{error}=await db.from("products").insert(productToDb(form));
        if(error){ console.error("[yeye] 写入失败:",error); alert("写入失败: "+error.message+"\n\n如持续出现请检查 Supabase API key 配置"); }
        else if(!dbMode) setDbMode(true);
      }
    } else {
      setProducts(p=>p.map(x=>x.id===form.id?form:x));
      if(db){
        const{error}=await db.from("products").update(productToDb(form)).eq("id",form.id);
        if(error){ console.error("[yeye] 更新失败:",error); alert("更新失败: "+error.message+"\n\n如持续出现请检查 Supabase API key 配置"); }
        else if(!dbMode) setDbMode(true);
      }
    }
    setEditProduct(null);
  }

  async function deleteProduct(id) {
    if(!confirm("确认删除该商品？")) return;
    setProducts(p=>p.filter(x=>x.id!==id));
    if(db) await db.from("products").delete().eq("id",id);
  }

  async function toggleRecommend(id) {
    const prod = products.find(p=>p.id===id);
    if(!prod) return;
    const next = !prod.recommended;
    setProducts(p=>p.map(x=>x.id===id?{...x,recommended:next}:x));
    if(db) await db.from("products").update({recommended:next}).eq("id",id);
  }

  async function toggleHidden(id) {
    const prod = products.find(p=>p.id===id);
    if(!prod) return;
    const next = !prod.hidden;
    setProducts(p=>p.map(x=>x.id===id?{...x,hidden:next}:x));
    if(db) await db.from("products").update({hidden:next}).eq("id",id);
  }

  async function batchDelistSeason(season) {
    const ids = products.filter(p=>p.season===season&&!p.hidden).map(p=>p.id);
    if(!ids.length) return alert("该季度没有可下架的商品");
    if(!confirm(`确认批量下架「${season}」的 ${ids.length} 件在架商品？`)) return;
    setProducts(p=>p.map(x=>x.season===season?{...x,hidden:true}:x));
    if(db) await db.from("products").update({hidden:true}).in("id",ids);
  }

  async function batchRelistSeason(season) {
    const ids = products.filter(p=>p.season===season&&p.hidden).map(p=>p.id);
    if(!ids.length) return alert("该季度没有已下架的商品");
    if(!confirm(`确认批量重新上架「${season}」的 ${ids.length} 件商品？`)) return;
    setProducts(p=>p.map(x=>x.season===season?{...x,hidden:false}:x));
    if(db) await db.from("products").update({hidden:false}).in("id",ids);
  }

  // ── Order CRUD ────────────────────────────────────────────
  async function saveOrder(form) {
    if(!form.prodId||!form.name||!form.addr) return alert("请填写商品、姓名和地址");
    const newO = { ...form, id:form.id||(Date.now().toString(36).slice(-5).toUpperCase()), date:form.date||new Date().toLocaleDateString("zh-CN"), time:form.time||new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}) };
    if(editOrder?.id) {
      setOrders(o=>o.map(x=>x.id===newO.id?newO:x));
      if(db) await db.from("orders").update(orderToDb(newO)).eq("id",newO.id);
    } else {
      setOrders(o=>[newO,...o]);
      if(db) await db.from("orders").insert(orderToDb(newO));
    }
    setEditOrder(null);
  }

  async function deleteOrder(id) {
    if(!confirm("确认删除？")) return;
    setOrders(o=>o.filter(x=>x.id!==id));
    if(db) await db.from("orders").delete().eq("id",id);
  }

  async function updateStatus(id, status) {
    setOrders(o=>o.map(x=>x.id===id?{...x,status}:x));
    if(db) await db.from("orders").update({status}).eq("id",id);
  }

  const openDetail = useCallback(p=>{scrollPos.current=window.scrollY||0;setDetail(p);setDetailQty(1);window.scrollTo(0,0);},[]);
  const closeDetail = useCallback(()=>{setDetail(null);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,scrollPos.current)));},[]);

  const kanbanCols = STATUSES.map(s=>({ status:s, items:orders.filter(o=>o.status===s) }));
  const dp = detail;
  const dSell = dp?sp(dp):0;
  const dDisc = dp?dc(dp):null;

  const S = { bg:"#faf9f7", border:"1px solid #e8e4de", input:{ width:"100%", padding:"10px 12px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff", outline:"none" }};

  if (loading) return (
    <div style={{ fontFamily:"system-ui,sans-serif", minHeight:"100vh", background:"#faf9f7", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:21, fontWeight:300, letterSpacing:4, marginBottom:12 }}>Yeye</div>
        <div style={{ fontSize:11, color:"#aaa" }}>加载中...</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif", minHeight:"100vh", background:S.bg, maxWidth:500, margin:"0 auto" }}>

      {connError&&!loading&&(
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:400, background:"#fcebeb", borderBottom:"2px solid #f5c6cb", padding:"10px 16px", maxWidth:500, margin:"0 auto" }}>
          <div style={{ fontSize:11, color:"#a32d2d", fontWeight:600, marginBottom:4 }}>⚠ 数据库连接失败（数据仅保存在本地）</div>
          {connError==="env"?(
            <div style={{ fontSize:10, color:"#854f0b" }}>VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 未配置</div>
          ):(
            <div style={{ fontSize:10, color:"#666", wordBreak:"break-all" }}>错误: {connError}</div>
          )}
          <div style={{ display:"flex", gap:6, marginTop:6 }}>
            <button onClick={()=>{setLoading(true);setConnError(null);loadFromSupabase();}} style={{ fontSize:10, padding:"4px 10px", background:"#a32d2d", color:"#fff", border:"none", borderRadius:3, cursor:"pointer" }}>重试连接</button>
            <button onClick={()=>setConnError(null)} style={{ fontSize:10, padding:"4px 10px", background:"#fff", color:"#999", border:"1px solid #ddd", borderRadius:3, cursor:"pointer" }}>忽略</button>
          </div>
        </div>
      )}

      {shareTarget&&<ShareModal prod={shareTarget} onClose={()=>setShareTarget(null)} allProds={products}/>}
      {editProduct&&<ProductModal product={editProduct==="new"?null:editProduct} onSave={saveProduct} onClose={()=>setEditProduct(null)}/>}
      {editOrder&&<OrderModal order={editOrder==="new"?null:editOrder} products={products} onSave={saveOrder} onClose={()=>setEditOrder(null)}/>}
      {showCheckout&&<CheckoutModal cart={cart} products={products} onSubmit={batchCheckout} onClose={()=>setShowCheckout(false)}/>}

      {/* NAV */}
      <div style={{ position:"sticky", top:0, zIndex:90, background:S.bg, borderBottom:S.border }}>
        <div style={{ padding:"0 16px", height:50, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span onClick={()=>{setPage("shop");setDetail(null);}} style={{ fontWeight:300, fontSize:21, cursor:"pointer", letterSpacing:4 }}>Yeye</span>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button onClick={()=>setPage("shop")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:page==="shop"?"#111":"#aaa", fontWeight:page==="shop"?600:400 }}>商品</button>
            <button onClick={()=>setPage("cart")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:page==="cart"?"#111":"#aaa", fontWeight:page==="cart"?600:400, position:"relative" }}>
              购物车{cart.length>0&&<span style={{ position:"absolute", top:-4, right:-10, background:"#111", color:"#fff", fontSize:8, width:16, height:16, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>{cart.reduce((s,i)=>s+i.qty,0)}</span>}
            </button>
            <button onClick={()=>setPage("myorders")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:page==="myorders"?"#111":"#aaa", fontWeight:page==="myorders"?600:400 }}>我的</button>
            <button onClick={()=>setPage("admin")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:page==="admin"?"#111":"#aaa", fontWeight:page==="admin"?600:400 }}>管理</button>
          </div>
        </div>
        <div style={{ background:"#111", color:"#e8e4de", fontSize:9, padding:"4px 0", textAlign:"center", letterSpacing:1.5 }}>
          全部包邮 · 外贸清仓 · 带插排需欧标转换头 · 家具高密度板需自行拼装
        </div>
      </div>

      {/* ════════ SHOP ════════ */}
      {page==="shop"&&!dp&&(
        <div style={{ padding:"16px" }}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="搜索商品名称或编号" style={{ ...S.input, marginBottom:14 }}/>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 14px", marginBottom:6 }}>
            {cats.map(c=>(<button key={c} onClick={()=>setCatFilter(c)} style={{ flexShrink:0, background:"none", border:"none", cursor:"pointer", fontSize:11, color:catFilter===c?"#111":"#bbb", borderBottom:catFilter===c?"1.5px solid #111":"1.5px solid transparent", padding:"5px 0" }}>{c}</button>))}
          </div>
          <div style={{ display:"flex", gap:10, overflowX:"auto", marginBottom:14, scrollbarWidth:"none" }}>
            {seasons.map(s=>(<button key={s} onClick={()=>setSeasonFilter(s)} style={{ flexShrink:0, padding:"3px 10px", borderRadius:20, border:"1px solid", borderColor:seasonFilter===s?"#111":"#e0ddd8", background:seasonFilter===s?"#111":"transparent", color:seasonFilter===s?"#fff":"#aaa", fontSize:10, cursor:"pointer" }}>{s}</button>))}
          </div>
          <div style={{ fontSize:9, color:"#ccc", letterSpacing:1.5, marginBottom:14 }}>{shopProds.length} ITEMS{dbMode&&<span style={{ marginLeft:8, color:"#0f6e56" }}>· 云端同步</span>}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px 12px" }}>
            {shopProds.map(p=>{const sell=sp(p),d=dc(p);return(
              <div key={p.id} onClick={()=>openDetail(p)} style={{ cursor:"pointer" }}>
                <div style={{ aspectRatio:"3/4", background:"#ebe8e3", overflow:"hidden", marginBottom:9, position:"relative" }}>
                  <ImgBox srcs={p.imgs} alt={p.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  {p.recommended&&<div style={{ position:"absolute", top:6, left:6, background:"#111", padding:"2px 6px", fontSize:8, color:"#FFD600", letterSpacing:0.5, fontWeight:600 }}>推荐</div>}
                  {p.cost===0&&<div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(17,17,17,0.7)", padding:"4px 8px", fontSize:9, color:"#fff", letterSpacing:1 }}>仅付邮费</div>}
                  {p.st>0&&p.st<=10&&<div style={{ position:"absolute", top:6, right:6, background:"#fff", fontSize:8, padding:"2px 5px" }}>库存不足</div>}
                </div>
                <div style={{ fontSize:9, color:"#bbb", letterSpacing:1, marginBottom:3 }}>{p.cat}</div>
                <div style={{ fontSize:12, color:"#111", lineHeight:1.5, marginBottom:5 }}>{p.n}</div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  {p.cost===0?<span style={{ fontSize:11, color:"#555" }}>— 仅邮费</span>:sell?<span style={{ fontSize:14, fontWeight:600 }}>¥{sell}</span>:null}
                  {p.tb>0&&sell&&<span style={{ fontSize:10, color:"#ccc", textDecoration:"line-through" }}>¥{p.tb}</span>}
                  {d&&d>0&&<span style={{ fontSize:9, background:"#111", color:"#fff", padding:"2px 4px" }}>-{d}%</span>}
                </div>
              </div>
            );})}
          </div>
        </div>
      )}

      {/* ════════ DETAIL ════════ */}
      {page==="shop"&&dp&&(
        <div>
          <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={closeDetail} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#aaa", display:"flex", alignItems:"center", gap:5, padding:0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/></svg>返回
            </button>
          </div>
          <div style={{ aspectRatio:"1", background:"#ebe8e3", overflow:"hidden" }}>
            <ImgBox srcs={dp.imgs} alt={dp.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </div>
          {dp.imgs&&dp.imgs.length>1&&(
            <div style={{ display:"flex", gap:6, padding:"10px 16px", overflowX:"auto" }}>
              {dp.imgs.map((src,i)=>(<img key={i} src={src} alt="" style={{ width:56, height:56, objectFit:"cover", border:"1px solid #e8e4de", flexShrink:0 }} loading="lazy"/>))}
            </div>
          )}
          <div style={{ padding:"18px 16px" }}>
            <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
              <Tag>{dp.cat}</Tag>
              <Tag color={dp.loc==="国内仓"?"#0f6e56":"#854f0b"} bg={dp.loc==="国内仓"?"#e1f5ee":"#faeeda"}>{dp.loc==="国内仓"?"国内仓·1-2周":"工厂·2-3周"}</Tag>
              {dp.season&&<Tag>{dp.season}</Tag>}
              {dp.recommended&&<Tag color="#854f0b" bg="#faeeda">推荐</Tag>}
              {dp.st>0&&dp.st<=10&&<Tag color="#a32d2d" bg="#fcebeb">库存仅{dp.st}件</Tag>}
            </div>
            <h1 style={{ fontSize:17, fontWeight:400, margin:"0 0 10px", lineHeight:1.5 }}>{dp.n}</h1>
            {dp.desc&&<p style={{ fontSize:13, color:"#777", margin:"0 0 14px", lineHeight:1.8 }}>{dp.desc}</p>}
            {dp.note&&<div style={{ borderLeft:"2px solid #ccc", padding:"7px 11px", background:"#f5f3f0", marginBottom:14, fontSize:11, color:"#777" }}>⚠ {dp.note}</div>}
            <div style={{ borderTop:S.border, borderBottom:S.border, padding:"14px 0", marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
              {dp.cost===0?<div><div style={{ fontSize:9, color:"#bbb", letterSpacing:1, marginBottom:2 }}>PRICE</div><div style={{ fontSize:18, fontWeight:500 }}>仅需邮费</div></div>
              :dSell?<><div><div style={{ fontSize:9, color:"#bbb", letterSpacing:1, marginBottom:2 }}>PRICE</div><div style={{ fontSize:26, fontWeight:600 }}>¥{dSell}</div></div>{dp.tb>0&&<div><div style={{ fontSize:9, color:"#ccc" }}>淘宝</div><div style={{ fontSize:12, color:"#ccc", textDecoration:"line-through" }}>¥{dp.tb}</div></div>}{dDisc&&dDisc>0&&<div style={{ marginLeft:"auto", background:"#111", color:"#fff", padding:"6px 11px", fontSize:12 }}>-{dDisc}%</div>}</>:null}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontSize:11, color:"#aaa" }}>数量</span>
              <button onClick={()=>setDetailQty(q=>Math.max(1,q-1))} style={{ width:32, height:32, border:"1px solid #e0ddd8", background:"#fff", borderRadius:6, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
              <span style={{ fontSize:15, fontWeight:500, minWidth:24, textAlign:"center" }}>{detailQty}</span>
              <button onClick={()=>setDetailQty(q=>q+1)} style={{ width:32, height:32, border:"1px solid #e0ddd8", background:"#fff", borderRadius:6, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
              {dSell>0&&<span style={{ marginLeft:"auto", fontSize:13, fontWeight:600 }}>¥{dSell*detailQty}</span>}
            </div>
            <button onClick={()=>addToCart(dp.id,detailQty)} style={{ width:"100%", padding:"13px 0", background:addedTip?"#0f6e56":"#111", border:"none", color:"#faf9f7", fontSize:12, letterSpacing:2, borderRadius:6, cursor:"pointer", marginBottom:8, transition:"background 0.3s" }}>{addedTip?"✓ 已加入购物车":"加入购物车"}</button>
            <button onClick={()=>setShareTarget(dp)} style={{ width:"100%", padding:"11px 0", background:"none", border:"1px solid #e0ddd8", color:"#777", fontSize:11, letterSpacing:1, borderRadius:6, cursor:"pointer" }}>生成分享图</button>
          </div>
        </div>
      )}

      {/* ════════ CART ════════ */}
      {page==="cart"&&(
        <div style={{ padding:"16px" }}>
          <div style={{ fontSize:10, letterSpacing:2, color:"#aaa", marginBottom:16 }}>购物车 · {cart.reduce((s,i)=>s+i.qty,0)} 件</div>
          {cart.length===0&&(
            <div style={{ textAlign:"center", padding:"60px 0" }}>
              <div style={{ fontSize:12, color:"#ccc", marginBottom:12 }}>购物车是空的</div>
              <button onClick={()=>setPage("shop")} style={{ background:"none", border:"1px solid #e0ddd8", padding:"8px 20px", borderRadius:6, cursor:"pointer", fontSize:11, color:"#555" }}>去逛逛</button>
            </div>
          )}
          {cart.map(item=>{const prod=products.find(p=>p.id===item.prodId);if(!prod)return null;const sell=sp(prod);return(
            <div key={item.prodId} style={{ display:"flex", gap:12, padding:"14px 0", borderBottom:"1px solid #e8e4de" }}>
              <div onClick={()=>openDetail(prod)} style={{ width:80, height:80, flexShrink:0, overflow:"hidden", background:"#ebe8e3", borderRadius:6, cursor:"pointer" }}>
                <ImgBox srcs={prod.imgs} alt={prod.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:"#111", marginBottom:3, lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prod.n}</div>
                <div style={{ fontSize:11, color:prod.cost===0?"#0f6e56":"#111", fontWeight:500, marginBottom:8 }}>{prod.cost===0?"仅付邮费":sell?"¥"+sell:""}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <button onClick={()=>updateCartQty(item.prodId,item.qty-1)} style={{ width:28, height:28, border:"1px solid #e0ddd8", background:"#fff", borderRadius:4, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <span style={{ fontSize:13, minWidth:20, textAlign:"center" }}>{item.qty}</span>
                  <button onClick={()=>updateCartQty(item.prodId,item.qty+1)} style={{ width:28, height:28, border:"1px solid #e0ddd8", background:"#fff", borderRadius:4, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  {sell>0&&<span style={{ fontSize:12, color:"#555", marginLeft:4 }}>¥{sell*item.qty}</span>}
                  <button onClick={()=>removeFromCart(item.prodId)} style={{ marginLeft:"auto", background:"none", border:"none", fontSize:10, color:"#a32d2d", cursor:"pointer" }}>移除</button>
                </div>
              </div>
            </div>
          );})}
          {cart.length>0&&(
            <div style={{ position:"sticky", bottom:0, background:"#faf9f7", borderTop:"1px solid #e8e4de", padding:"14px 0", marginTop:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:12, color:"#555" }}>{cart.reduce((s,i)=>s+i.qty,0)} 件商品</span>
                <span style={{ fontSize:17, fontWeight:600 }}>¥{cart.reduce((s,item)=>{const p=products.find(x=>x.id===item.prodId);return s+(p?(sp(p)||0)*item.qty:0);},0)}</span>
              </div>
              <button onClick={()=>setShowCheckout(true)} style={{ width:"100%", padding:"13px 0", background:"#111", border:"none", color:"#faf9f7", fontSize:12, letterSpacing:2, borderRadius:6, cursor:"pointer" }}>去结算</button>
            </div>
          )}
        </div>
      )}

      {/* ════════ MY ORDERS ════════ */}
      {page==="myorders"&&(
        <div style={{ padding:"16px" }}>
          <div style={{ fontSize:10, letterSpacing:2, color:"#aaa", marginBottom:14 }}>我的订单</div>
          <input value={myWechat} onChange={e=>{setMyWechat(e.target.value);lsSet("yeye_mywx",e.target.value);}} placeholder="输入微信号查询订单" style={{ ...S.input, marginBottom:16 }}/>
          {(()=>{
            if(!myWechat) return <div style={{ textAlign:"center", padding:"40px 0", fontSize:12, color:"#ccc" }}>输入微信号查看订单</div>;
            const myOrders=orders.filter(o=>o.wechat===myWechat);
            if(myOrders.length===0) return <div style={{ textAlign:"center", padding:"40px 0", fontSize:12, color:"#ccc" }}>暂无订单记录</div>;
            const groups={};myOrders.forEach(o=>{const g=o.groupId||o.id;if(!groups[g])groups[g]=[];groups[g].push(o);});
            return Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0])).map(([gid,items])=>{
              const canCancel=items.every(i=>["pending","paid","ordering"].includes(i.status));
              const total=items.reduce((s,o)=>{const p=products.find(x=>x.id===o.prodId);return s+(p?(sp(p)||0)*o.qty:0);},0);
              return(
                <div key={gid} style={{ background:"#fff", border:S.border, borderRadius:8, marginBottom:12, overflow:"hidden" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8f7f5", borderBottom:S.border }}>
                    <span style={{ fontSize:10, color:"#aaa" }}>{items[0].date} {items[0].time}</span>
                    <StatusBadge status={items[0].status}/>
                  </div>
                  {items.map(o=>{const prod=products.find(p=>p.id===o.prodId);return(
                    <div key={o.id} style={{ display:"flex", gap:10, padding:"10px 14px", borderBottom:"1px solid #f0ede8" }}>
                      <div style={{ width:50, height:50, flexShrink:0, background:"#ebe8e3", overflow:"hidden", borderRadius:4 }}>
                        <ImgBox srcs={prod?.imgs} alt={prod?.n||o.prodId} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, color:"#333", marginBottom:2 }}>{prod?.n||o.prodId}</div>
                        <div style={{ fontSize:11, color:"#aaa" }}>×{o.qty} {prod?.cost===0?"邮费":"¥"+((sp(prod)||0)*o.qty)}</div>
                      </div>
                      <StatusBadge status={o.status}/>
                    </div>
                  );})}
                  <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{total>0?"合计 ¥"+total:"仅付邮费"}</span>
                    {canCancel&&<button onClick={()=>cancelGroup(gid)} style={{ padding:"6px 14px", background:"#fcebeb", border:"none", fontSize:10, color:"#a32d2d", borderRadius:4, cursor:"pointer" }}>取消订单</button>}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ════════ ADMIN ════════ */}
      {page==="admin"&&(
        <div style={{ padding:"16px" }}>
          {!adminOk?(
            <div style={{ textAlign:"center", paddingTop:50 }}>
              <div style={{ fontSize:10, letterSpacing:3, color:"#aaa", marginBottom:20 }}>ADMIN</div>
              <input type="password" placeholder="输入密码" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={async e=>{if(e.key==="Enter"&&await sha256(pw)===ADMIN_HASH)setAdminOk(true);}} style={{ ...S.input, width:"70%", textAlign:"center", marginBottom:12 }}/>
              <br/><button onClick={async()=>{if(await sha256(pw)===ADMIN_HASH)setAdminOk(true);}} style={{ padding:"11px 28px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, letterSpacing:2, borderRadius:6, cursor:"pointer" }}>进入</button>
            </div>
          ):(
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ display:"flex", borderBottom:S.border, flex:1 }}>
                  {[["kanban","看板"],["orders","订单"],["products","商品库"]].map(([k,v])=>(
                    <button key={k} onClick={()=>setAdminTab(k)} style={{ flex:1, background:"none", border:"none", padding:"10px 0", fontSize:11, cursor:"pointer", color:adminTab===k?"#111":"#bbb", borderBottom:adminTab===k?"2px solid #111":"2px solid transparent", marginBottom:-1 }}>{v}</button>
                  ))}
                </div>
              </div>
              {dbMode&&<div style={{ fontSize:9, color:"#0f6e56", marginBottom:12, padding:"4px 8px", background:"#e1f5ee", borderRadius:4, display:"inline-block" }}>✓ 已连接 Supabase · 数据实时同步 · 商品{products.length}件</div>}
              {!dbMode&&db&&<div style={{ fontSize:9, color:"#854f0b", marginBottom:12, padding:"4px 8px", background:"#faeeda", borderRadius:4, display:"inline-flex", alignItems:"center", gap:8 }}>⚠ Supabase 已配置但连接异常 <button onClick={async()=>{try{const{data,error}=await db.from("products").select("id",{count:"exact",head:true});alert(error?"诊断结果: "+error.message+"\n\ncode: "+error.code+"\nhint: "+(error.hint||"无")+"\n\n请检查 Supabase API key 是否正确":"连接正常! 请刷新页面重试")}catch(e){alert("网络错误: "+e.message)}}} style={{ background:"#854f0b", color:"#fff", border:"none", borderRadius:3, fontSize:9, padding:"2px 6px", cursor:"pointer" }}>诊断连接</button></div>}
              {!db&&<div style={{ fontSize:9, color:"#a32d2d", marginBottom:12, padding:"4px 8px", background:"#fcebeb", borderRadius:4, display:"inline-block" }}>✗ 离线模式 · 请配置 .env 环境变量</div>}

              {/* FILTER BAR (shared by kanban & orders) */}
              {(adminTab==="kanban"||adminTab==="orders")&&(
                <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                  <input value={orderWxFilter} onChange={e=>setOrderWxFilter(e.target.value)} placeholder="按微信号过滤" style={{ flex:1, minWidth:100, padding:"7px 10px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:11, background:"#fff", boxSizing:"border-box" }}/>
                  <select value={orderProdFilter} onChange={e=>setOrderProdFilter(e.target.value)} style={{ flex:1, minWidth:100, padding:"7px 10px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:11, background:"#fff" }}>
                    <option value="">全部商品</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.n}</option>)}
                  </select>
                </div>
              )}

              {/* KANBAN */}
              {adminTab==="kanban"&&(()=>{
                const fo=orders.filter(o=>{if(orderWxFilter&&!o.wechat.includes(orderWxFilter))return false;if(orderProdFilter&&o.prodId!==orderProdFilter)return false;return true;});
                const cols=STATUSES.map(s=>({status:s,items:fo.filter(o=>o.status===s)}));
                return(
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:11, color:"#aaa", letterSpacing:1 }}>{fo.length} 笔订单</span>
                    <button onClick={()=>setEditOrder("new")} style={{ padding:"7px 14px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, borderRadius:6, cursor:"pointer" }}>+ 新增订单</button>
                  </div>
                  <div style={{ overflowX:"auto", paddingBottom:8 }}>
                    <div style={{ display:"flex", gap:10, minWidth:Math.max(500,STATUSES.length*140) }}>
                      {cols.map(col=>(
                        <div key={col.status} style={{ minWidth:140, flex:1 }}>
                          <div style={{ padding:"6px 8px", background:STATUS_CONFIG[col.status].bg, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", borderRadius:4 }}>
                            <span style={{ fontSize:10, fontWeight:600, color:STATUS_CONFIG[col.status].color }}>{STATUS_CONFIG[col.status].label}</span>
                            <span style={{ fontSize:9, color:STATUS_CONFIG[col.status].color, opacity:0.7 }}>{col.items.length}</span>
                          </div>
                          {col.items.map(o=>{const prod=products.find(p=>p.id===o.prodId);return(
                            <div key={o.id} style={{ background:"#fff", border:S.border, padding:"9px 10px", marginBottom:7, borderRadius:4 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                                <span style={{ fontSize:10, fontWeight:600, color:"#111" }}>{o.name}</span>
                                <span style={{ fontSize:9, color:"#bbb" }}>{o.date}</span>
                              </div>
                              <div style={{ fontSize:10, color:"#555", marginBottom:4, lineHeight:1.5 }}>{prod?.n?.slice(0,20)||o.prodId} ×{o.qty}</div>
                              <div style={{ fontSize:9, color:"#aaa", marginBottom:4 }}>{o.wechat}{o.groupId&&<span style={{ marginLeft:4, color:"#ccc" }}>#{o.groupId}</span>}</div>
                              <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:5 }}>
                                {STATUSES.filter(s=>s!==o.status).map(s=>(<button key={s} onClick={()=>updateStatus(o.id,s)} style={{ fontSize:8, padding:"2px 5px", background:STATUS_CONFIG[s].bg, color:STATUS_CONFIG[s].color, border:"none", borderRadius:2, cursor:"pointer" }}>→{STATUS_CONFIG[s].label}</button>))}
                              </div>
                              <div style={{ display:"flex", gap:4 }}>
                                <button onClick={()=>setEditOrder(o)} style={{ flex:1, fontSize:9, padding:"4px 0", background:"#f5f3f0", border:"none", borderRadius:3, cursor:"pointer", color:"#555" }}>编辑</button>
                                <button onClick={()=>deleteOrder(o.id)} style={{ fontSize:9, padding:"4px 7px", background:"#fcebeb", border:"none", borderRadius:3, cursor:"pointer", color:"#a32d2d" }}>删除</button>
                              </div>
                            </div>
                          );})}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>);
              })()}

              {/* ORDERS (grouped) */}
              {adminTab==="orders"&&(()=>{
                const fo=orders.filter(o=>{if(orderWxFilter&&!o.wechat.includes(orderWxFilter))return false;if(orderProdFilter&&o.prodId!==orderProdFilter)return false;return true;});
                const groups={};fo.forEach(o=>{const g=o.groupId||o.id;if(!groups[g])groups[g]=[];groups[g].push(o);});
                const groupList=Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]));
                return(
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:11, color:"#aaa" }}>{fo.length} 笔 · {groupList.length} 单</span>
                    <button onClick={()=>setEditOrder("new")} style={{ padding:"7px 14px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, borderRadius:6, cursor:"pointer" }}>+ 新增订单</button>
                  </div>
                  {groupList.length===0&&<div style={{ textAlign:"center", padding:"40px 0", fontSize:11, color:"#ccc" }}>暂无订单</div>}
                  {groupList.map(([gid,items])=>{
                    const allPending=items.every(i=>i.status==="pending");
                    const hasPaid=items.some(i=>i.status==="paid");
                    const total=items.reduce((s,o)=>{const p=products.find(x=>x.id===o.prodId);return s+(p?(sp(p)||0)*o.qty:0);},0);
                    const info=items[0];
                    return(
                    <div key={gid} style={{ background:"#fff", border:S.border, borderRadius:8, marginBottom:12, overflow:"hidden" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8f7f5", borderBottom:S.border }}>
                        <div><span style={{ fontSize:10, color:"#aaa" }}>#{gid}</span><span style={{ fontSize:10, color:"#555", marginLeft:8 }}>{info.date} {info.time}</span></div>
                        <StatusBadge status={info.status}/>
                      </div>
                      <div style={{ padding:"8px 14px", borderBottom:"1px solid #f0ede8" }}>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, fontSize:11, color:"#555" }}>
                          <span style={{ cursor:"pointer" }} onClick={()=>cp(info.wechat,gid+"wx")}>{copied===gid+"wx"?"✓ 已复制":"微信: "+info.wechat}</span>
                          <span>|</span><span>{info.name} {info.phone}</span>
                        </div>
                        <div style={{ fontSize:11, color:"#777", marginTop:4, wordBreak:"break-all" }}>{info.addr}</div>
                        {info.note&&<div style={{ fontSize:10, color:"#aaa", marginTop:3 }}>备注: {info.note}</div>}
                      </div>
                      {items.map(o=>{const prod=products.find(p=>p.id===o.prodId);return(
                        <div key={o.id} style={{ display:"flex", gap:10, padding:"9px 14px", borderBottom:"1px solid #f0ede8", alignItems:"center" }}>
                          <div style={{ width:40, height:40, flexShrink:0, background:"#ebe8e3", overflow:"hidden", borderRadius:4 }}>
                            <ImgBox srcs={prod?.imgs} alt={prod?.n||o.prodId} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:11, color:"#333" }}>{prod?.n||o.prodId}</div>
                            <div style={{ fontSize:10, color:"#aaa" }}>×{o.qty} {prod?.cost===0?"邮费":"¥"+((sp(prod)||0)*o.qty)}</div>
                          </div>
                          <StatusBadge status={o.status}/>
                          <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                            {STATUSES.filter(s=>s!==o.status&&s!=="cancelled").slice(0,3).map(s=>(<button key={s} onClick={()=>updateStatus(o.id,s)} style={{ fontSize:8, padding:"2px 5px", background:STATUS_CONFIG[s].bg, color:STATUS_CONFIG[s].color, border:"none", borderRadius:2, cursor:"pointer" }}>→{STATUS_CONFIG[s].label}</button>))}
                          </div>
                        </div>
                      );})}
                      <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
                        <span style={{ fontSize:12, fontWeight:600 }}>{total>0?"合计 ¥"+total:"仅付邮费"}</span>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>{const txt=`${info.name} ${info.phone||""}\n${info.addr}\n微信:${info.wechat}\n${items.map(o=>{const p=products.find(x=>x.id===o.prodId);return(p?.n||o.prodId)+"×"+o.qty;}).join("、")}\n合计:¥${total||"邮费"}`;cp(txt,gid+"all");}} style={{ padding:"5px 10px", background:copied===gid+"all"?"#111":"#f5f3f0", border:"none", fontSize:9, cursor:"pointer", color:copied===gid+"all"?"#fff":"#555", borderRadius:4 }}>{copied===gid+"all"?"✓":"复制全部"}</button>
                          <button onClick={()=>cp(info.addr,gid+"ad")} style={{ padding:"5px 10px", background:copied===gid+"ad"?"#111":"#f5f3f0", border:"none", fontSize:9, cursor:"pointer", color:copied===gid+"ad"?"#fff":"#555", borderRadius:4 }}>{copied===gid+"ad"?"✓":"复制地址"}</button>
                          {hasPaid&&<button onClick={()=>markGroupShipped(gid)} style={{ padding:"5px 10px", background:"#eaf3de", border:"none", fontSize:9, cursor:"pointer", color:"#3b6d11", borderRadius:4, fontWeight:600 }}>已支付→发货</button>}
                          {allPending&&<button onClick={()=>cancelGroup(gid)} style={{ padding:"5px 10px", background:"#fcebeb", border:"none", fontSize:9, cursor:"pointer", color:"#a32d2d", borderRadius:4 }}>取消订单</button>}
                        </div>
                      </div>
                    </div>);
                  })}
                </div>);
              })()}

              {/* PRODUCTS */}
              {adminTab==="products"&&(
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:11, color:"#aaa" }}>{products.length} 款（{products.filter(p=>!p.hidden).length} 在架 / {products.filter(p=>p.hidden).length} 已下架）</span>
                    <button onClick={()=>setEditProduct("new")} style={{ padding:"7px 14px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, borderRadius:6, cursor:"pointer" }}>+ 添加商品</button>
                  </div>
                  <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:8, scrollbarWidth:"none" }}>
                    {seasons.map(s=>(<button key={s} onClick={()=>setSeasonFilter(s)} style={{ flexShrink:0, padding:"3px 10px", borderRadius:20, border:"1px solid", borderColor:seasonFilter===s?"#111":"#e0ddd8", background:seasonFilter===s?"#111":"transparent", color:seasonFilter===s?"#fff":"#aaa", fontSize:10, cursor:"pointer" }}>{s}</button>))}
                  </div>
                  {seasonFilter!=="全部"&&(
                    <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                      <button onClick={()=>batchDelistSeason(seasonFilter)} style={{ flex:1, padding:"8px 0", background:"#fcebeb", border:"none", fontSize:10, cursor:"pointer", borderRadius:5, color:"#a32d2d", fontWeight:500 }}>批量下架「{seasonFilter}」({products.filter(p=>p.season===seasonFilter&&!p.hidden).length})</button>
                      <button onClick={()=>batchRelistSeason(seasonFilter)} style={{ flex:1, padding:"8px 0", background:"#e1f5ee", border:"none", fontSize:10, cursor:"pointer", borderRadius:5, color:"#0f6e56", fontWeight:500 }}>批量上架「{seasonFilter}」({products.filter(p=>p.season===seasonFilter&&p.hidden).length})</button>
                    </div>
                  )}
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="搜索商品" style={{ ...S.input, marginBottom:12 }}/>
                  {adminProds.map(p=>{const sell=sp(p),d=dc(p);return(
                    <div key={p.id} style={{ background:p.hidden?"#f8f6f4":"#fff", border:S.border, padding:"11px 12px", marginBottom:9, borderRadius:6, display:"flex", gap:10, opacity:p.hidden?0.55:1 }}>
                      <div style={{ width:60, height:60, flexShrink:0, overflow:"hidden", background:"#ebe8e3", position:"relative" }}>
                        <ImgBox srcs={p.imgs} alt={p.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        {p.recommended&&<div style={{ position:"absolute", top:0, left:0, background:"#111", padding:"1px 4px", fontSize:7, color:"#FFD600", fontWeight:700 }}>★</div>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:4, marginBottom:4, flexWrap:"wrap" }}>
                          <Tag>{p.cat}</Tag>{p.season&&<Tag>{p.season}</Tag>}<Tag color={p.loc==="国内仓"?"#0f6e56":"#854f0b"} bg={p.loc==="国内仓"?"#e1f5ee":"#faeeda"}>{p.loc}</Tag>
                          {p.recommended&&<Tag color="#854f0b" bg="#faeeda">推荐</Tag>}
                          {p.hidden&&<Tag color="#a32d2d" bg="#fcebeb">已下架</Tag>}
                        </div>
                        <div style={{ fontSize:12, fontWeight:500, color:"#111", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.n}</div>
                        <div style={{ fontSize:10, color:"#aaa", marginBottom:4 }}>编号: {p.id} · 库存: {p.st}件</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          {p.cost===0?<span style={{ fontSize:11, color:"#555" }}>仅邮费</span>:sell?<span style={{ fontSize:13, fontWeight:600 }}>¥{sell}</span>:null}
                          {p.tb>0&&sell&&<span style={{ fontSize:10, color:"#ccc", textDecoration:"line-through" }}>¥{p.tb}</span>}
                          {d&&d>0&&<span style={{ fontSize:9, background:"#111", color:"#fff", padding:"1px 4px" }}>-{d}%</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                        <button onClick={()=>toggleRecommend(p.id)} style={{ padding:"4px 8px", background:p.recommended?"#faeeda":"#f5f3f0", border:"none", fontSize:9, cursor:"pointer", borderRadius:4, color:p.recommended?"#854f0b":"#aaa", fontWeight:p.recommended?600:400 }}>{p.recommended?"★推荐":"☆推荐"}</button>
                        <button onClick={()=>toggleHidden(p.id)} style={{ padding:"4px 8px", background:p.hidden?"#e1f5ee":"#f5f3f0", border:"none", fontSize:9, cursor:"pointer", borderRadius:4, color:p.hidden?"#0f6e56":"#555" }}>{p.hidden?"上架":"下架"}</button>
                        <button onClick={()=>setEditProduct(p)} style={{ padding:"4px 8px", background:"#f5f3f0", border:"none", fontSize:9, cursor:"pointer", borderRadius:4, color:"#555" }}>编辑</button>
                        <button onClick={()=>setShareTarget(p)} style={{ padding:"4px 8px", background:"#f5f3f0", border:"none", fontSize:9, cursor:"pointer", borderRadius:4, color:"#555" }}>分享</button>
                        <button onClick={()=>deleteProduct(p.id)} style={{ padding:"4px 8px", background:"#fcebeb", border:"none", fontSize:9, cursor:"pointer", borderRadius:4, color:"#a32d2d" }}>删除</button>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </>
          )}
        </div>
      )}
      <div style={{ height:40 }}/>
    </div>
  );
}
