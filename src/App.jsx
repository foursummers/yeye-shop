import { useState, useMemo, useRef, useCallback } from "react";
import { PRODUCTS as RAW_PRODUCTS } from "./data/products";

const MARGIN = 1.38;
const sp = p => p.cost > 0 ? Math.round(p.cost * MARGIN) : null;
const dc = p => { const s = sp(p); return s && p.tb > 0 ? Math.round((1 - s / p.tb) * 100) : null; };

const STATUS_CONFIG = {
  pending:   { label: "待确认", color: "#888", bg: "#f5f3f0" },
  paid:      { label: "已支付", color: "#185fa5", bg: "#e6f1fb" },
  ordering:  { label: "下单中", color: "#854f0b", bg: "#faeeda" },
  shipped:   { label: "已发货", color: "#3b6d11", bg: "#eaf3de" },
  delivered: { label: "已到货", color: "#0f6e56", bg: "#e1f5ee" },
  nostock:   { label: "无货",   color: "#a32d2d", bg: "#fcebeb" },
};
const STATUSES = Object.keys(STATUS_CONFIG);

const INIT_PRODUCTS = RAW_PRODUCTS.map(p => ({
  id: p.id,
  n: p.name,
  cat: p.category,
  cost: p.cost,
  tb: p.taobaoPrice,
  st: p.stock,
  loc: p.location,
  note: p.note,
  season: "Q1 2025",
  imgs: p.images && p.images.length > 0 ? p.images : [],
  desc: p.size ? `${p.desc}（${p.size}）` : p.desc,
  recommended: false,
  hidden: false,
}));

const INIT_ORDERS = [];

function useStorage(key, init) {
  const [val, setVal] = useState(() => {
    try {
      const s = window.localStorage?.getItem(key);
      return s ? JSON.parse(s) : init;
    } catch { return init; }
  });
  const set = useCallback(v => {
    setVal(v);
    try { window.localStorage?.setItem(key, JSON.stringify(v)); } catch {}
  }, [key]);
  return [val, set];
}

function ImgBox({ srcs, alt, style, onClick }) {
  const [i, setI] = useState(0);
  const [err, setErr] = useState(false);
  const src = srcs?.[i];
  if (!src || err) return (
    <div style={{ ...style, background: "#ebe8e3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.2 }}>
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="#111" strokeWidth="1.5"/>
        <circle cx="8" cy="10" r="2" stroke="#111" strokeWidth="1.5"/>
        <path d="M2 17l5-5 4 4 3-3 8 7" stroke="#111" strokeWidth="1.5"/>
      </svg>
      <div style={{ fontSize: 9, color: "#bbb", marginTop: 4, textAlign: "center", padding: "0 6px" }}>{alt}</div>
    </div>
  );
  return <img src={src} alt={alt} style={{ ...style, cursor: onClick ? "pointer" : "default" }} onError={() => { if (srcs?.[i+1]) setI(i+1); else setErr(true); }} onClick={onClick} loading="lazy" />;
}

function Tag({ children, color, bg }) {
  return <span style={{ fontSize: 9, padding: "2px 6px", background: bg||"#f0ede8", color: color||"#555", borderRadius: 2, whiteSpace: "nowrap" }}>{children}</span>;
}

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{ fontSize: 10, padding: "3px 9px", background: c.bg, color: c.color, borderRadius: 2, whiteSpace:"nowrap", fontWeight: 500 }}>
      {c.label}
    </span>
  );
}

// ── Share card ──────────────────────────────────────────────
function ShareModal({ prod, onClose, allProds }) {
  const [mode, setMode] = useState("single");
  const sell = sp(prod), disc = dc(prod);
  const catProds = allProds.filter(p => p.cat === prod.cat && !p.hidden);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"flex-end" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
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
              {prod.desc && <div style={{ fontSize:10, color:"#888", marginBottom:8, lineHeight:1.7 }}>{prod.desc}</div>}
              {prod.note && <div style={{ fontSize:9, color:"#999", marginBottom:8 }}>⚠ {prod.note}</div>}
              <div style={{ borderTop:"1px solid #e8e4de", paddingTop:10, display:"flex", alignItems:"center", gap:8 }}>
                {prod.cost===0 ? <span style={{ fontSize:15, fontWeight:600 }}>仅需邮费</span>
                  : sell ? <>
                    <span style={{ fontSize:20, fontWeight:700 }}>¥{sell}</span>
                    {prod.tb>0 && <span style={{ fontSize:10, color:"#ccc", textDecoration:"line-through" }}>¥{prod.tb}</span>}
                    {disc&&disc>0 && <span style={{ fontSize:9, background:"#111", color:"#fff", padding:"2px 5px" }}>省{disc}%</span>}
                  </> : null}
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
              {catProds.slice(0,9).map(p => {
                const s=sp(p), d=dc(p);
                return <div key={p.id}>
                  <div style={{ aspectRatio:"1", background:"#ebe8e3", overflow:"hidden", marginBottom:4 }}>
                    <ImgBox srcs={p.imgs} alt={p.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  </div>
                  <div style={{ fontSize:9, color:"#333", lineHeight:1.4, marginBottom:2, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.n}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                    {p.cost===0?<span style={{ fontSize:10, fontWeight:600 }}>仅邮费</span>:s?<span style={{ fontSize:11, fontWeight:700 }}>¥{s}</span>:null}
                    {d&&d>0&&<span style={{ fontSize:8, background:"#111", color:"#fff", padding:"1px 3px" }}>-{d}%</span>}
                  </div>
                </div>;
              })}
            </div>
            <div style={{ marginTop:10, textAlign:"center", fontSize:9, color:"#ccc" }}>微信联系我下单 · 数量有限</div>
          </div>
        )}
        <p style={{ textAlign:"center", fontSize:10, color:"#bbb", marginTop:10 }}>截图后发送至群里</p>
      </div>
    </div>
  );
}

// ── Add/Edit Product Modal ───────────────────────────────────
function ProductModal({ product, onSave, onClose }) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState(product || { id:"", n:"", cat:"", cost:0, tb:0, st:0, loc:"工厂", note:"", season:"Q2 2025", imgs:[], desc:"", recommended:false, hidden:false });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
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
            {["工厂","国内仓"].map(l=>(
              <button key={l} onClick={()=>f("loc",l)} style={{ flex:1, padding:"8px 0", border:"1px solid", borderColor:form.loc===l?"#111":"#e0ddd8", background:form.loc===l?"#111":"#fff", color:form.loc===l?"#fff":"#555", borderRadius:6, cursor:"pointer", fontSize:12 }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>封面图片（最多4张）</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
            {[0,1,2,3].map(i=>{
              const hasImg = form.imgs?.[i];
              return (
                <label key={i} style={{ aspectRatio:"1", background:hasImg?"#000":"#f0ede8", borderRadius:6, border:"1px dashed #ccc", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden", position:"relative" }}>
                  {hasImg ? (
                    <>
                      <img src={form.imgs[i]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>{e.target.style.display="none";}}/>
                      <button onClick={e=>{e.preventDefault();e.stopPropagation();const newImgs=[...form.imgs];newImgs.splice(i,1);f("imgs",newImgs);}} style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,0.6)", border:"none", color:"#fff", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity:0.3, marginBottom:4 }}>
                        <rect x="1" y="3" width="18" height="14" rx="2" stroke="#111" strokeWidth="1.5"/>
                        <circle cx="7" cy="9" r="2" stroke="#111" strokeWidth="1.5"/>
                        <path d="M1 15l5-5 4 4 3-3 6 5" stroke="#111" strokeWidth="1.5"/>
                      </svg>
                      <span style={{ fontSize:9, color:"#aaa" }}>图{i+1}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
                    const file=e.target.files?.[0];
                    if(!file) return;
                    const reader=new FileReader();
                    reader.onload=ev=>{
                      const newImgs=[...(form.imgs||[])];
                      newImgs[i]=ev.target.result;
                      f("imgs",newImgs);
                    };
                    reader.readAsDataURL(file);
                    e.target.value="";
                  }}/>
                </label>
              );
            })}
          </div>
          <div style={{ fontSize:9, color:"#bbb", marginBottom:6 }}>— 或者粘贴图片链接（每行一个）—</div>
          <textarea value={(form.imgs||[]).filter(s=>s&&!s.startsWith("data:")).join("\n")} onChange={e=>{
            const urls=e.target.value.split("\n").filter(Boolean);
            const b64s=(form.imgs||[]).filter(s=>s&&s.startsWith("data:"));
            f("imgs",[...b64s,...urls].slice(0,4));
          }} rows={2} placeholder="/images/10001.jpg" style={{ width:"100%", padding:"8px 10px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:11, boxSizing:"border-box", resize:"none", color:"#555" }}/>
        </div>
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <button onClick={()=>f("recommended",!form.recommended)} style={{ flex:1, padding:"9px 0", border:"1px solid", borderColor:form.recommended?"#854f0b":"#e0ddd8", background:form.recommended?"#faeeda":"#fff", color:form.recommended?"#854f0b":"#aaa", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:form.recommended?600:400 }}>
            {form.recommended?"★ 已推荐":"☆ 设为推荐"}
          </button>
          <button onClick={()=>f("hidden",!form.hidden)} style={{ flex:1, padding:"9px 0", border:"1px solid", borderColor:form.hidden?"#a32d2d":"#e0ddd8", background:form.hidden?"#fcebeb":"#fff", color:form.hidden?"#a32d2d":"#aaa", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:form.hidden?600:400 }}>
            {form.hidden?"已下架":"上架中"}
          </button>
        </div>
        <button onClick={()=>onSave(form)} style={{ width:"100%", padding:"13px 0", background:"#111", border:"none", color:"#faf9f7", fontSize:12, letterSpacing:1, borderRadius:6, cursor:"pointer" }}>
          {isEdit?"保存修改":"添加商品"}
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
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#faf9f7", borderRadius:12, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontWeight:600, fontSize:14 }}>{isEdit?"编辑订单":"新增订单"}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#aaa" }}>×</button>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>选择商品</div>
          <select value={form.prodId} onChange={e=>f("prodId",e.target.value)} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:12, background:"#fff" }}>
            <option value="">-- 请选择 --</option>
            {products.map(p=><option key={p.id} value={p.id}>{p.n}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>数量</div>
          <input type="number" min={1} value={form.qty} onChange={e=>f("qty",Number(e.target.value))} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/>
        </div>
        {[["微信号","wechat","text"],["收货人姓名","name","text"],["手机号","phone","tel"],["收货地址","addr","text"],["备注","note","text"]].map(([lbl,key,type])=>(
          <div key={key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>{lbl}</div>
            <input type={type} value={form[key]} onChange={e=>f(key,e.target.value)} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/>
          </div>
        ))}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>实收金额</div>
          <input type="number" value={form.paidAmt} onChange={e=>f("paidAmt",Number(e.target.value))} placeholder={String(total||"0")} style={{ width:"100%", padding:"9px 11px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff" }}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>订单状态</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {STATUSES.map(s=>(
              <button key={s} onClick={()=>f("status",s)} style={{ padding:"5px 12px", border:"1px solid", borderColor:form.status===s?"#111":"#e0ddd8", background:form.status===s?"#111":"#fff", color:form.status===s?"#fff":"#555", borderRadius:4, cursor:"pointer", fontSize:11 }}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>
        {prod && total>0 && <div style={{ background:"#f5f3f0", padding:"10px 12px", borderRadius:6, marginBottom:12, fontSize:12, color:"#555" }}>
          应收：¥{sp(prod)||0} × {form.qty} = <strong>¥{total}</strong>
        </div>}
        <button onClick={()=>onSave(form)} style={{ width:"100%", padding:"13px 0", background:"#111", border:"none", color:"#faf9f7", fontSize:12, letterSpacing:1, borderRadius:6, cursor:"pointer" }}>
          {isEdit?"保存修改":"提交订单"}
        </button>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useStorage("yeye_products_v2", INIT_PRODUCTS);
  const [orders, setOrders] = useStorage("yeye_orders", INIT_ORDERS);
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
  const scrollPos = useRef(0);

  const cats = ["全部", ...Array.from(new Set(products.map(p=>p.cat)))];
  const seasons = ["全部", ...Array.from(new Set(products.map(p=>p.season).filter(Boolean)))];

  const shopProds = useMemo(()=>{
    let list = products.filter(p=>{
      if(p.hidden) return false;
      if(catFilter!=="全部"&&p.cat!==catFilter) return false;
      if(seasonFilter!=="全部"&&p.season!==seasonFilter) return false;
      if(searchQ&&!p.n.toLowerCase().includes(searchQ.toLowerCase())&&!p.id.toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });
    list.sort((a,b)=>(b.recommended?1:0)-(a.recommended?1:0));
    return list;
  },[products,catFilter,seasonFilter,searchQ]);

  const adminProds = useMemo(()=>products.filter(p=>{
    if(catFilter!=="全部"&&p.cat!==catFilter) return false;
    if(seasonFilter!=="全部"&&p.season!==seasonFilter) return false;
    if(searchQ&&!p.n.toLowerCase().includes(searchQ.toLowerCase())&&!p.id.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }),[products,catFilter,seasonFilter,searchQ]);

  function cp(text,key){navigator.clipboard.writeText(text).catch(()=>{});setCopied(key);setTimeout(()=>setCopied(null),1800);}

  function saveProduct(form) {
    if(!form.id||!form.n) return alert("请填写编号和名称");
    if(editProduct==="new") setProducts(p=>[...p,form]);
    else setProducts(p=>p.map(x=>x.id===form.id?form:x));
    setEditProduct(null);
  }

  function deleteProduct(id) {
    if(!confirm("确认删除该商品？")) return;
    setProducts(p=>p.filter(x=>x.id!==id));
  }

  function toggleRecommend(id) {
    setProducts(p=>p.map(x=>x.id===id?{...x,recommended:!x.recommended}:x));
  }

  function toggleHidden(id) {
    setProducts(p=>p.map(x=>x.id===id?{...x,hidden:!x.hidden}:x));
  }

  function batchDelistSeason(season) {
    const count = products.filter(p=>p.season===season&&!p.hidden).length;
    if(!count) return alert("该季度没有可下架的商品");
    if(!confirm(`确认批量下架「${season}」的 ${count} 件在架商品？`)) return;
    setProducts(p=>p.map(x=>x.season===season?{...x,hidden:true}:x));
  }

  function batchRelistSeason(season) {
    const count = products.filter(p=>p.season===season&&p.hidden).length;
    if(!count) return alert("该季度没有已下架的商品");
    if(!confirm(`确认批量重新上架「${season}」的 ${count} 件商品？`)) return;
    setProducts(p=>p.map(x=>x.season===season?{...x,hidden:false}:x));
  }

  function saveOrder(form) {
    if(!form.prodId||!form.name||!form.addr) return alert("请填写商品、姓名和地址");
    const newO = { ...form, id: form.id||(Date.now().toString(36).slice(-5).toUpperCase()), date: form.date||new Date().toLocaleDateString("zh-CN"), time: form.time||new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}) };
    if(editOrder?.id) setOrders(o=>o.map(x=>x.id===newO.id?newO:x));
    else setOrders(o=>[newO,...o]);
    setEditOrder(null);
  }

  function deleteOrder(id){if(!confirm("确认删除？"))return;setOrders(o=>o.filter(x=>x.id!==id));}

  function updateStatus(id, status){setOrders(o=>o.map(x=>x.id===id?{...x,status}:x));}

  const openDetail = useCallback(p=>{scrollPos.current=window.scrollY||0;setDetail(p);window.scrollTo(0,0);},[]);
  const closeDetail = useCallback(()=>{setDetail(null);requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,scrollPos.current)));},[]);

  const kanbanCols = STATUSES.map(s=>({ status:s, items:orders.filter(o=>o.status===s) }));

  const dp = detail;
  const dSell = dp?sp(dp):0;
  const dDisc = dp?dc(dp):null;

  const S = { bg:"#faf9f7", border:"1px solid #e8e4de", input:{ width:"100%", padding:"10px 12px", border:"1px solid #e0ddd8", borderRadius:6, fontSize:13, boxSizing:"border-box", background:"#fff", outline:"none" }};

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif", minHeight:"100vh", background:S.bg, maxWidth:500, margin:"0 auto" }}>

      {shareTarget&&<ShareModal prod={shareTarget} onClose={()=>setShareTarget(null)} allProds={products}/>}
      {editProduct&&<ProductModal product={editProduct==="new"?null:editProduct} onSave={saveProduct} onClose={()=>setEditProduct(null)}/>}
      {editOrder&&<OrderModal order={editOrder==="new"?null:editOrder} products={products} onSave={saveOrder} onClose={()=>setEditOrder(null)}/>}

      {/* ── NAV ── */}
      <div style={{ position:"sticky", top:0, zIndex:90, background:S.bg, borderBottom:S.border }}>
        <div style={{ padding:"0 16px", height:50, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span onClick={()=>{setPage("shop");setDetail(null);}} style={{ fontWeight:300, fontSize:21, cursor:"pointer", letterSpacing:4 }}>Yeye</span>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <button onClick={()=>setPage("shop")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:page==="shop"?"#111":"#aaa", fontWeight:page==="shop"?600:400, letterSpacing:0.5 }}>商品</button>
            <button onClick={()=>setPage("admin")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:page==="admin"?"#111":"#aaa", fontWeight:page==="admin"?600:400, letterSpacing:0.5 }}>管理</button>
          </div>
        </div>
        <div style={{ background:"#111", color:"#e8e4de", fontSize:9, padding:"4px 0", textAlign:"center", letterSpacing:1.5 }}>
          全部包邮 · 外贸清仓 · 带插排需欧标转换头 · 家具高密度板需自行拼装
        </div>
      </div>

      {/* ════════ SHOP PAGE ════════ */}
      {page==="shop"&&!dp&&(
        <div style={{ padding:"16px" }}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="搜索商品名称或编号" style={{ ...S.input, marginBottom:14 }}/>
          <div style={{ display:"flex", gap:16, overflowX:"auto", marginBottom:6, scrollbarWidth:"none" }}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setCatFilter(c)} style={{ flexShrink:0, background:"none", border:"none", cursor:"pointer", fontSize:11, color:catFilter===c?"#111":"#bbb", borderBottom:catFilter===c?"1.5px solid #111":"1.5px solid transparent", padding:"5px 0", letterSpacing:0.5 }}>{c}</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, overflowX:"auto", marginBottom:14, scrollbarWidth:"none" }}>
            {seasons.map(s=>(
              <button key={s} onClick={()=>setSeasonFilter(s)} style={{ flexShrink:0, padding:"3px 10px", borderRadius:20, border:"1px solid", borderColor:seasonFilter===s?"#111":"#e0ddd8", background:seasonFilter===s?"#111":"transparent", color:seasonFilter===s?"#fff":"#aaa", fontSize:10, cursor:"pointer" }}>{s}</button>
            ))}
          </div>
          <div style={{ fontSize:9, color:"#ccc", letterSpacing:1.5, marginBottom:14 }}>{shopProds.length} ITEMS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px 12px" }}>
            {shopProds.map(p=>{
              const sell=sp(p),d=dc(p);
              return (
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
                    {p.cost===0?<span style={{ fontSize:11, color:"#555" }}>— 仅邮费</span>
                      :sell?<span style={{ fontSize:14, fontWeight:600 }}>¥{sell}</span>:null}
                    {p.tb>0&&sell&&<span style={{ fontSize:10, color:"#ccc", textDecoration:"line-through" }}>¥{p.tb}</span>}
                    {d&&d>0&&<span style={{ fontSize:9, background:"#111", color:"#fff", padding:"2px 4px" }}>-{d}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ DETAIL ════════ */}
      {page==="shop"&&dp&&(
        <div>
          <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={closeDetail} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#aaa", display:"flex", alignItems:"center", gap:5, padding:0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/></svg>
              返回
            </button>
          </div>
          <div style={{ aspectRatio:"1", background:"#ebe8e3", overflow:"hidden" }}>
            <ImgBox srcs={dp.imgs} alt={dp.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </div>
          {dp.imgs&&dp.imgs.length>1&&(
            <div style={{ display:"flex", gap:6, padding:"10px 16px", overflowX:"auto" }}>
              {dp.imgs.map((src,i)=>(
                <img key={i} src={src} alt="" style={{ width:56, height:56, objectFit:"cover", border:"1px solid #e8e4de", flexShrink:0 }} loading="lazy"/>
              ))}
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
              :dSell?<>
                <div><div style={{ fontSize:9, color:"#bbb", letterSpacing:1, marginBottom:2 }}>PRICE</div><div style={{ fontSize:26, fontWeight:600 }}>¥{dSell}</div></div>
                {dp.tb>0&&<div><div style={{ fontSize:9, color:"#ccc" }}>淘宝</div><div style={{ fontSize:12, color:"#ccc", textDecoration:"line-through" }}>¥{dp.tb}</div></div>}
                {dDisc&&dDisc>0&&<div style={{ marginLeft:"auto", background:"#111", color:"#fff", padding:"6px 11px", fontSize:12 }}>-{dDisc}%</div>}
              </>:null}
            </div>
            <button onClick={()=>setShareTarget(dp)} style={{ width:"100%", padding:"13px 0", background:"#111", border:"none", color:"#faf9f7", fontSize:11, letterSpacing:2, borderRadius:6, cursor:"pointer", marginBottom:8 }}>生成分享图</button>
          </div>
        </div>
      )}

      {/* ════════ ADMIN PAGE ════════ */}
      {page==="admin"&&(
        <div style={{ padding:"16px" }}>
          {!adminOk?(
            <div style={{ textAlign:"center", paddingTop:50 }}>
              <div style={{ fontSize:10, letterSpacing:3, color:"#aaa", marginBottom:20 }}>ADMIN</div>
              <input type="password" placeholder="输入密码" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pw==="admin888"&&setAdminOk(true)} style={{ ...S.input, width:"70%", textAlign:"center", marginBottom:12 }}/>
              <br/>
              <button onClick={()=>{if(pw==="admin888")setAdminOk(true);}} style={{ padding:"11px 28px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, letterSpacing:2, borderRadius:6, cursor:"pointer" }}>进入</button>
              <div style={{ fontSize:10, color:"#ccc", marginTop:10 }}>密码: admin888</div>
            </div>
          ):(
            <>
              <div style={{ display:"flex", borderBottom:S.border, marginBottom:18 }}>
                {[["kanban","看板"],["orders","订单"],["products","商品库"]].map(([k,v])=>(
                  <button key={k} onClick={()=>setAdminTab(k)} style={{ flex:1, background:"none", border:"none", padding:"10px 0", fontSize:11, cursor:"pointer", color:adminTab===k?"#111":"#bbb", borderBottom:adminTab===k?"2px solid #111":"2px solid transparent", marginBottom:-1 }}>{v}</button>
                ))}
              </div>

              {/* ── KANBAN ── */}
              {adminTab==="kanban"&&(
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:11, color:"#aaa", letterSpacing:1 }}>{orders.length} 笔订单</span>
                    <button onClick={()=>setEditOrder("new")} style={{ padding:"7px 14px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, borderRadius:6, cursor:"pointer" }}>+ 新增订单</button>
                  </div>
                  <div style={{ overflowX:"auto", paddingBottom:8 }}>
                    <div style={{ display:"flex", gap:10, minWidth:Math.max(500,STATUSES.length*150) }}>
                      {kanbanCols.map(col=>(
                        <div key={col.status} style={{ minWidth:148, flex:1 }}>
                          <div style={{ padding:"6px 8px", background:STATUS_CONFIG[col.status].bg, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center", borderRadius:4 }}>
                            <span style={{ fontSize:10, fontWeight:600, color:STATUS_CONFIG[col.status].color, letterSpacing:0.5 }}>{STATUS_CONFIG[col.status].label}</span>
                            <span style={{ fontSize:9, color:STATUS_CONFIG[col.status].color, opacity:0.7 }}>{col.items.length}</span>
                          </div>
                          {col.items.map(o=>{
                            const prod=products.find(p=>p.id===o.prodId);
                            return (
                              <div key={o.id} style={{ background:"#fff", border:S.border, padding:"9px 10px", marginBottom:7, borderRadius:4 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                                  <span style={{ fontSize:10, fontWeight:600, color:"#111" }}>{o.name}</span>
                                  <span style={{ fontSize:9, color:"#bbb" }}>{o.date}</span>
                                </div>
                                <div style={{ fontSize:10, color:"#555", marginBottom:5, lineHeight:1.5 }}>{prod?.n?.slice(0,20)||o.prodId} ×{o.qty}</div>
                                <div style={{ fontSize:10, color:"#aaa", marginBottom:6 }}>{o.wechat}</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:5 }}>
                                  {STATUSES.filter(s=>s!==o.status).map(s=>(
                                    <button key={s} onClick={()=>updateStatus(o.id,s)} style={{ fontSize:8, padding:"2px 5px", background:STATUS_CONFIG[s].bg, color:STATUS_CONFIG[s].color, border:"none", borderRadius:2, cursor:"pointer" }}>→{STATUS_CONFIG[s].label}</button>
                                  ))}
                                </div>
                                <div style={{ display:"flex", gap:4 }}>
                                  <button onClick={()=>setEditOrder(o)} style={{ flex:1, fontSize:9, padding:"4px 0", background:"#f5f3f0", border:"none", borderRadius:3, cursor:"pointer", color:"#555" }}>编辑</button>
                                  <button onClick={()=>deleteOrder(o.id)} style={{ fontSize:9, padding:"4px 7px", background:"#fcebeb", border:"none", borderRadius:3, cursor:"pointer", color:"#a32d2d" }}>删除</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ORDERS LIST ── */}
              {adminTab==="orders"&&(
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:11, color:"#aaa" }}>{orders.length} 笔</span>
                    <button onClick={()=>setEditOrder("new")} style={{ padding:"7px 14px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, borderRadius:6, cursor:"pointer" }}>+ 新增订单</button>
                  </div>
                  {orders.length===0&&<div style={{ textAlign:"center", padding:"40px 0", fontSize:11, color:"#ccc" }}>暂无订单</div>}
                  {orders.map(o=>{
                    const prod=products.find(p=>p.id===o.prodId);
                    return (
                      <div key={o.id} style={{ background:"#fff", border:S.border, padding:"13px", marginBottom:10, borderRadius:6 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                            <span style={{ fontSize:10, color:"#aaa" }}>{o.id}</span>
                            <StatusBadge status={o.status}/>
                          </div>
                          <span style={{ fontSize:13, fontWeight:600 }}>{o.paidAmt>0?`¥${o.paidAmt}`:(prod&&sp(prod)?`¥${(sp(prod)||0)*o.qty}`:"邮费")}</span>
                        </div>
                        <div style={{ fontSize:11, color:"#555", background:"#f8f7f5", padding:"8px 10px", marginBottom:9, lineHeight:1.7, borderRadius:4 }}>
                          {prod?.n||o.prodId} × {o.qty}件
                        </div>
                        {[["微信",o.wechat,o.id+"wx"],["姓名",o.name,o.id+"nm"],["电话",o.phone||"—",o.id+"ph"],["地址",o.addr,o.id+"ad"],...(o.note?[["备注",o.note,o.id+"nt"]]:[])]
                          .map(([l,v,k])=>(
                          <div key={l} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #f0ede8" }}>
                            <span style={{ fontSize:9, color:"#ccc", minWidth:24, letterSpacing:0.5 }}>{l}</span>
                            <span style={{ fontSize:12, flex:1, wordBreak:"break-all" }}>{v}</span>
                            <button onClick={()=>cp(v,k)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:9, color:copied===k?"#0f6e56":"#bbb", fontWeight:copied===k?600:400 }}>{copied===k?"✓":"复制"}</button>
                          </div>
                        ))}
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5, margin:"9px 0 8px" }}>
                          {STATUSES.map(s=>(
                            <button key={s} onClick={()=>updateStatus(o.id,s)} style={{ fontSize:9, padding:"3px 8px", border:"1px solid", borderColor:o.status===s?"#111":"#e0ddd8", background:o.status===s?"#111":"#fff", color:o.status===s?"#fff":"#777", borderRadius:3, cursor:"pointer" }}>
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                          {[["全部信息",`${o.name} ${o.phone||""}\n${o.addr}\n微信:${o.wechat}\n${prod?.n||o.prodId}×${o.qty}\n金额:${o.paidAmt||"邮费"}${o.note?"\n备注:"+o.note:""}`,o.id+"all"],["仅地址",o.addr,o.id+"a2"],["姓名+电话",`${o.name} ${o.phone}`,o.id+"np"]].map(([l,v,k])=>(
                            <button key={k} onClick={()=>cp(v,k)} style={{ padding:"7px 0", background:copied===k?"#111":"#f5f3f0", border:"none", fontSize:9, cursor:"pointer", color:copied===k?"#fff":"#777", borderRadius:4 }}>
                              {copied===k?"✓":l}
                            </button>
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <button onClick={()=>setEditOrder(o)} style={{ flex:1, padding:"7px 0", background:"#f5f3f0", border:"none", fontSize:10, cursor:"pointer", color:"#555", borderRadius:4 }}>编辑</button>
                          <button onClick={()=>deleteOrder(o.id)} style={{ padding:"7px 12px", background:"#fcebeb", border:"none", fontSize:10, cursor:"pointer", color:"#a32d2d", borderRadius:4 }}>删除</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── PRODUCTS ADMIN ── */}
              {adminTab==="products"&&(
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:11, color:"#aaa" }}>{products.length} 款商品（{products.filter(p=>!p.hidden).length} 在架 / {products.filter(p=>p.hidden).length} 已下架）</span>
                    <button onClick={()=>setEditProduct("new")} style={{ padding:"7px 14px", background:"#111", border:"none", color:"#faf9f7", fontSize:11, borderRadius:6, cursor:"pointer" }}>+ 添加商品</button>
                  </div>
                  <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:8, scrollbarWidth:"none" }}>
                    {seasons.map(s=>(
                      <button key={s} onClick={()=>setSeasonFilter(s)} style={{ flexShrink:0, padding:"3px 10px", borderRadius:20, border:"1px solid", borderColor:seasonFilter===s?"#111":"#e0ddd8", background:seasonFilter===s?"#111":"transparent", color:seasonFilter===s?"#fff":"#aaa", fontSize:10, cursor:"pointer" }}>{s}</button>
                    ))}
                  </div>
                  {seasonFilter!=="全部"&&(
                    <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                      <button onClick={()=>batchDelistSeason(seasonFilter)} style={{ flex:1, padding:"8px 0", background:"#fcebeb", border:"none", fontSize:10, cursor:"pointer", borderRadius:5, color:"#a32d2d", fontWeight:500 }}>
                        批量下架「{seasonFilter}」({products.filter(p=>p.season===seasonFilter&&!p.hidden).length} 件在架)
                      </button>
                      <button onClick={()=>batchRelistSeason(seasonFilter)} style={{ flex:1, padding:"8px 0", background:"#e1f5ee", border:"none", fontSize:10, cursor:"pointer", borderRadius:5, color:"#0f6e56", fontWeight:500 }}>
                        批量上架「{seasonFilter}」({products.filter(p=>p.season===seasonFilter&&p.hidden).length} 件已下架)
                      </button>
                    </div>
                  )}
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="搜索商品" style={{ ...S.input, marginBottom:12 }}/>
                  {adminProds.map(p=>{
                    const sell=sp(p),d=dc(p);
                    return (
                      <div key={p.id} style={{ background:p.hidden?"#f8f6f4":"#fff", border:S.border, padding:"11px 12px", marginBottom:9, borderRadius:6, display:"flex", gap:10, opacity:p.hidden?0.55:1 }}>
                        <div style={{ width:60, height:60, flexShrink:0, overflow:"hidden", background:"#ebe8e3", position:"relative" }}>
                          <ImgBox srcs={p.imgs} alt={p.n} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                          {p.recommended&&<div style={{ position:"absolute", top:0, left:0, background:"#111", padding:"1px 4px", fontSize:7, color:"#FFD600", fontWeight:700 }}>★</div>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", gap:4, marginBottom:4, flexWrap:"wrap" }}>
                            <Tag>{p.cat}</Tag>
                            {p.season&&<Tag>{p.season}</Tag>}
                            <Tag color={p.loc==="国内仓"?"#0f6e56":"#854f0b"} bg={p.loc==="国内仓"?"#e1f5ee":"#faeeda"}>{p.loc}</Tag>
                            {p.recommended&&<Tag color="#854f0b" bg="#faeeda">推荐</Tag>}
                            {p.hidden&&<Tag color="#a32d2d" bg="#fcebeb">已下架</Tag>}
                          </div>
                          <div style={{ fontSize:12, fontWeight:500, color:"#111", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.n}</div>
                          <div style={{ fontSize:10, color:"#aaa", marginBottom:4 }}>编号: {p.id} · 库存: {p.st}件</div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            {p.cost===0?<span style={{ fontSize:11, color:"#555" }}>仅邮费</span>
                              :sell?<span style={{ fontSize:13, fontWeight:600 }}>¥{sell}</span>:null}
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
                    );
                  })}
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
