// ===== Premium Beauty / FastFood — App (client + admin) =====
// Telegram WebApp optimized, Firestore realtime, enlarged typography

// FIREBASE (CDN modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, serverTimestamp,
  getDoc, updateDoc, onSnapshot, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// CONFIG (your project)
const firebaseConfig = {
  apiKey: "AIzaSyDVidcgjpUxkg88bxXfIFzmsFydv0rMMao",
  authDomain: "shahboz-5d0a3.firebaseapp.com",
  projectId: "shahboz-5d0a3",
  storageBucket: "shahboz-5d0a3.firebasestorage.app",
  messagingSenderId: "352024095535",
  appId: "1:352024095535:web:3f495ac74cdd40f5c54fda",
  measurementId: "G-J8KFW5ED77"
};

// INIT
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

// COLLECTIONS
const productsCol   = collection(db, "beauty_products");
const categoriesCol = collection(db, "beauty_categories");
const ordersCol     = collection(db, "orders");
const couriersCol   = collection(db, "couriers");

// CONSTANTS
const STORAGE_CUSTOMER        = "beauty_customer_info";
const STORAGE_LOCATION        = "beauty_customer_location";
const THEME_KEY               = "beauty_theme";
const CLIENT_ID_KEY           = "beauty_client_id";
const RAW_PREFIX              = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";
const LOCAL_ORDERS_BACKUP_KEY = "beauty_orders_history";

// STATE
let products       = [];
let remoteProducts = [];
let categories     = [];
let cart           = [];
let activeCategory = "all";
let currentSearch  = "";
let isAdmin        = false;

let editingProductId  = null;
let editingCategoryId = null;

let adminOrderFilter     = "all";
let clientId             = null;
let clientOrders         = [];
let adminOrders          = [];

// DETAIL STATE
let detailIndex              = null;
let detailImageIndex         = 0;
let detailQty                = 1;
let isImageFullscreen        = false;

// COURIER state (admin route block)
let courierSelectedOrderId = null;

// DOM
const productsGrid       = document.getElementById("productsGrid");
const filterBar          = document.getElementById("filterBar");
const cartCountTopEl     = document.getElementById("cartCountTop");
const cartTotalTopEl     = document.getElementById("cartTotalTop");
const toastEl            = document.getElementById("toast");
const cartSheet          = document.getElementById("cartSheet");
const cartSheetOverlay   = document.getElementById("cartSheetOverlay");
const cartItemsEl        = document.getElementById("cartItems");
const cartSheetTotalEl   = document.getElementById("cartSheetTotal");
const themeToggleBtn     = document.getElementById("themeToggleBtn");
const tabsEl             = document.getElementById("tabs");
const adminAccessBtn     = document.getElementById("adminAccessBtn");
const adminTabBtn        = document.getElementById("adminTabBtn");
const searchInput        = document.getElementById("searchInput");
const openCartBtn        = document.getElementById("openCartBtn");
const cartTopBtn         = document.getElementById("cartTopBtn");
const cartCloseBtn       = document.getElementById("cartCloseBtn");
const cartSendBtn        = document.getElementById("cartSendBtn");

const customerInfoTextEl = document.getElementById("customerInfoText");
const quickOrderBtn      = document.getElementById("quickOrderBtn");
const askLocationBtn     = document.getElementById("askLocationBtn");
const customerEditBtn    = document.getElementById("customerEditBtn");
const customerResetBtn   = document.getElementById("customerResetBtn");

// Detail
const productDetailOverlay = document.getElementById("productDetailOverlay");
const detailImageEl        = document.getElementById("detailImage");
const detailCategoryEl     = document.getElementById("detailCategory");
const detailNameEl         = document.getElementById("detailName");
const detailTagEl          = document.getElementById("detailTag");
const detailDescEl         = document.getElementById("detailDesc");
const detailPriceEl        = document.getElementById("detailPrice");
const detailOldPriceEl     = document.getElementById("detailOldPrice");
const detailAddBtn         = document.getElementById("detailAddBtn");
const detailBackBtn        = document.getElementById("detailBackBtn");
const detailPrevBtn        = document.getElementById("detailPrevBtn");
const detailNextBtn        = document.getElementById("detailNextBtn");
const detailImageIndexEl   = document.getElementById("detailImageIndex");
const detailQtyMinus       = document.getElementById("detailQtyMinus");
const detailQtyPlus        = document.getElementById("detailQtyPlus");
const detailQtyValue       = document.getElementById("detailQtyValue");
const detailCloseBtn       = document.getElementById("detailCloseBtn");

// Admin form DOM
const adminNameEl          = document.getElementById("adminName");
const adminCategoryEl      = document.getElementById("adminCategory");
const adminPriceBaseEl     = document.getElementById("adminPriceBase");
const adminHasDiscountEl   = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl           = document.getElementById("adminTag");
const adminDescriptionEl   = document.getElementById("adminDescription");
const adminImagesEl        = document.getElementById("adminImages");
const adminSaveProductBtn  = document.getElementById("adminSaveProductBtn");
const adminCustomListEl    = document.getElementById("adminCustomList");

// Admin category
const adminCatCodeEl      = document.getElementById("adminCatCode");
const adminCatLabelEl     = document.getElementById("adminCatLabel");
const adminCatEmojiEl     = document.getElementById("adminCatEmoji");
const adminSaveCategoryBtn= document.getElementById("adminSaveCategoryBtn");
const adminCategoryListEl = document.getElementById("adminCategoryList");

// Orders DOM
const clientOrdersListEl = document.getElementById("clientOrdersList");
const adminOrdersListEl  = document.getElementById("adminOrdersList");

// Courier in admin
const courierOrderSelect = document.getElementById("courierOrderSelect");
const courierMapFrame    = document.getElementById("courierMapFrame");
const courierInfoEl      = document.getElementById("courierInfo");
const adminMarkDeliveredBtn = document.getElementById("adminMarkDeliveredBtn");
const adminRejectBtn        = document.getElementById("adminRejectBtn");
const adminOpenRouteBtn     = document.getElementById("adminOpenRouteBtn");

// Helpers
function formatPrice(v){ return (Number(v)||0).toLocaleString("uz-UZ"); }

function showToast(message, duration = 1800){
  if(!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if(showToast._timer) clearTimeout(showToast._timer);
  showToast._timer = setTimeout(()=>toastEl.classList.remove("show"), duration);
}

// Lightweight beep without external audio
function sound(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 950; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime+0.01);
    o.start();
    setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.15); o.stop(ctx.currentTime+0.16); }, 120);
  }catch(e){}
}

// Telegram WebApp integration
(function initTG(){
  const tg = window.Telegram?.WebApp;
  if(!tg) return;
  tg.ready();
  const scheme = tg.colorScheme;
  if(scheme==="light"){
    document.body.classList.remove("theme-dark"); document.body.classList.add("theme-light");
  }else{
    document.body.classList.remove("theme-light"); document.body.classList.add("theme-dark");
  }
  tg.onEvent("themeChanged", ()=>{
    const s = tg.colorScheme;
    if(s==="light"){ document.body.classList.add("theme-light"); document.body.classList.remove("theme-dark"); }
    else{ document.body.classList.add("theme-dark"); document.body.classList.remove("theme-light"); }
  });
})();

/* THEME TOGGLE */
function applyTheme(theme){
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark",  theme !== "light");
  if(themeToggleBtn){ themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙"; }
}
function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || "dark";
  const next    = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
if(themeToggleBtn){ themeToggleBtn.addEventListener("click", toggleTheme); }
applyTheme(localStorage.getItem(THEME_KEY) || "dark");

/* CLIENT ID */
function getOrCreateClientId(){
  let cid = localStorage.getItem(CLIENT_ID_KEY);
  if(!cid){
    cid = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, cid);
  }
  return cid;
}
clientId = getOrCreateClientId();

/* CUSTOMER INFO */
function renderCustomerInfo(){
  if(!customerInfoTextEl) return;
  let info = null;
  try{ info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null"); }catch(e){}
  if(info && info.name && info.phone){
    customerInfoTextEl.textContent =
      "👤 " + info.name + " • 📱 " + info.phone + (info.address ? " • 📍 " + info.address : "");
  }else{
    customerInfoTextEl.textContent = "Mijoz ma’lumotlari saqlanmagan. Buyurtma berganingizda ism va telefon so‘raladi.";
  }
}
function promptNewCustomerInfo(){
  const name = prompt("👤 Ismingizni kiriting (masalan, Shahboz):");
  if(!name) return null;
  const phone = prompt("📱 Telefon raqamingizni kiriting (masalan, +99890 123 45 67):");
  if(!phone) return null;
  const address = prompt("📍 Asosiy manzil (shahar, tuman, ko‘cha, uy):");
  if(!address) return null;
  const landmark = prompt("🧭 Mo‘ljal (ixtiyoriy):") || "";
  const preferredTime = prompt("⏰ Qaysi vaqtda qabul qilasiz? (ixtiyoriy):") || "";
  const info = { name:name.trim(), phone:phone.trim(), address:address.trim(), landmark:landmark.trim(), preferredTime:preferredTime.trim() };
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(info));
  renderCustomerInfo();
  return info;
}
function askCustomerInfo(){
  let info = null;
  try{ info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null"); }catch(e){}
  if(info && info.name && info.phone && info.address){
    const ok = confirm("Oldingi ma’lumotlar saqlangan. Shu ma’lumotlar bilan yuborilsinmi?");
    if(ok) return info;
    return promptNewCustomerInfo();
  }
  return promptNewCustomerInfo();
}
function resetCustomerInfo(){
  localStorage.removeItem(STORAGE_CUSTOMER);
  renderCustomerInfo();
  showToast("👤 Mijoz ma’lumotlari o‘chirildi.");
}
if(customerEditBtn)  customerEditBtn.onclick  = promptNewCustomerInfo;
if(customerResetBtn) customerResetBtn.onclick = resetCustomerInfo;

renderCustomerInfo();

/* GEOLOCATION */
function loadSavedLocation(){
  try{ const raw = localStorage.getItem(STORAGE_LOCATION); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
function saveLocation(loc){ try{ localStorage.setItem(STORAGE_LOCATION, JSON.stringify(loc)); }catch(e){} }
function getBrowserLocation(timeoutMs = 7000){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){ reject(new Error("Geolocation yo‘q.")); return; }
    navigator.geolocation.getCurrentPosition(
      pos=>{ resolve({ lat:pos.coords.latitude, lng:pos.coords.longitude, accuracy:pos.coords.accuracy||null, ts:Date.now() }); },
      err=>reject(err),
      { enableHighAccuracy:true, timeout:timeoutMs }
    );
  });
}
async function getOrAskLocation(){
  let saved = loadSavedLocation();
  if(saved){
    const ok = confirm("Oldingi joylashuvingiz mavjud. Shu joydan foydalanamizmi?
Lat:"+saved.lat+"
Lng:"+saved.lng);
    if(ok) return saved;
    localStorage.removeItem(STORAGE_LOCATION);
  }
  const allow = confirm("📍 Joylashuvni aniqlashga ruxsat berasizmi?");
  if(!allow) return null;
  try{
    const loc = await getBrowserLocation(7000);
    saveLocation(loc);
    showToast("📍 Joylashuv aniqlandi.");
    return loc;
  }catch(e){
    console.warn("Joylashuv olinmadi:", e); showToast("⚠️ Joylashuv olinmadi. GPS va internetni tekshiring.", 3000);
    return null;
  }
}
if(askLocationBtn) askLocationBtn.onclick = getOrAskLocation;

/* SEARCH */
if(searchInput){
  searchInput.addEventListener("input", ()=>{
    currentSearch = searchInput.value.trim().toLowerCase();
    renderProducts();
  });
}

/* FILTER BAR */
function renderCategoryFilter(){
  if(!filterBar) return;
  let html = `<button class="chip ${activeCategory==="all"?"active":""}" data-category="all"><span>⭐</span><span>Barchasi</span></button>`;
  categories.forEach(cat=>{
    html += `<button class="chip ${activeCategory===cat.code?"active":""}" data-category="${cat.code}"><span>${cat.emoji}</span><span>${cat.label}</span></button>`;
  });
  filterBar.innerHTML = html;
}
if(filterBar){
  filterBar.addEventListener("click", e=>{
    const btn = e.target.closest(".chip"); if(!btn) return;
    document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    renderProducts();
  });
}

/* PRODUCTS */
function matchesSearch(p){
  if(!currentSearch) return true;
  const q = currentSearch;
  const name = (p.name || "").toLowerCase();
  const tag  = (p.tag || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const cat  = (p.category || "").toLowerCase();
  return name.includes(q) || tag.includes(q) || desc.includes(q) || cat.includes(q);
}
function normalizeImagesInput(raw){
  if(!raw) return [];
  return raw.split(",").map(s=>s.trim()).filter(Boolean).map(token=>{
    if(/^https?:\/\//i.test(token)) return token;
    const name = token.replace(/\.(png|jpg|jpeg)$/i,"");
    return "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/" + name + ".png";
  });
}
function imageHtmlFromUrl(url, altText){
  if(url.startsWith("https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/")){
    const base = url.replace(/\.(png|jpg|jpeg)$/i,"");
    return `<img src="${base}.png" alt="${altText}" onerror="this.onerror=null;this.src='${base}.jpg';">`;
  }
  return `<img src="${url}" alt="${altText}">`;
}
function rebuildProducts(){ products = [...remoteProducts]; renderProducts(); }
function renderProducts(){
  if(!productsGrid) return;
  productsGrid.innerHTML = "";
  const filtered = products.filter(p => (activeCategory === "all" ? true : p.category === activeCategory) && matchesSearch(p));
  if(!filtered.length){
    productsGrid.innerHTML = "<p class='cart-empty'>Hozircha mahsulot yo‘q.</p>";
    return;
  }
  filtered.forEach(p=>{
    const index    = products.indexOf(p);
    const discount = p.oldPrice && p.oldPrice > p.price ? (100 - Math.round(p.price*100/p.oldPrice)) : null;
    const tag        = p.tag || "Ommabop mahsulot";
    const firstImage = (p.images && p.images.length) ? p.images[0] : ("https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/" + "noimage" + ".png");
    const catLabel   = p.category || "Kategoriya yo‘q";
    productsGrid.innerHTML += `
      <article class="product-card" onclick="openProductDetail(${index})">
        <div class="product-img-wrap">
          ${imageHtmlFromUrl(firstImage, p.name)}
          <div class="product-img-tag"><span>Beauty</span><span>Pro</span></div>
          ${discount ? `<div class="product-sale">-${discount}%</div>` : ``}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">${catLabel} • ${tag}</div>
          <div class="tag-mini">💡 ${tag}</div>
          <div class="price-row">
            <div>
              <div class="price-main">${formatPrice(p.price)} so‘m</div>
              ${p.oldPrice ? `<div class="price-old">${formatPrice(p.oldPrice)} so‘m</div>` : ``}
            </div>
            <button class="btn-add" onclick="event.stopPropagation(); addToCart(${index});">➕ Savatga</button>
          </div>
        </div>
      </article>
    `;
  });
}

/* REALTIME Subscriptions */
function subscribeProductsRealtime(){
  onSnapshot(productsCol, snap=>{
    const list = [];
    snap.forEach(d=>{
      const data = d.data();
      list.push({
        id: d.id,
        name: data.name || "",
        price: Number(data.price || 0),
        oldPrice: data.oldPrice || null,
        category: data.category || "",
        tag: data.tag || "",
        description: data.description || "",
        images: Array.isArray(data.images) ? data.images : [],
        createdAt: data.createdAt || null
      });
    });
    remoteProducts = list;
    rebuildProducts();
    renderAdminCustomList();
  }, err=>{
    console.error("Mahsulot realtime xato:", err);
    showToast("⚠️ Mahsulotlarni o‘qishda xato.");
  });
}
function subscribeCategoriesRealtime(){
  onSnapshot(categoriesCol, snap=>{
    const list = [];
    snap.forEach(d=>{
      const data = d.data() || {};
      const code = (data.code || "").trim().toLowerCase();
      if(!code) return;
      const label = (data.label || code).trim();
      const emoji = (data.emoji || "💅").trim() || "💅";
      list.push({ id:d.id, code, label, emoji, order:data.order ?? 0 });
    });
    list.sort((a,b)=>(a.order||0)-(b.order||0));
    categories = list;
    // refresh select and chips
    updateAdminCategorySelect();
    renderCategoryFilter();
  },err=>{
    console.error("Kategoriya realtime xato:", err);
    showToast("⚠️ Kategoriyalarni o‘qishda xato.");
  });
}

/* CART */
function addToCart(index, qty=1){
  if(qty<=0) return;
  const found = cart.find(c=>c.index===index);
  if(found) found.qty += qty; else cart.push({index,qty});
  updateCartUI();
  showToast("Savatga qo‘shildi.");
}
function changeQty(index, delta){
  const item = cart.find(c=>c.index===index); if(!item) return;
  item.qty += delta; if(item.qty<=0){ cart = cart.filter(c=>c!==item); }
  updateCartUI();
}
function removeFromCart(index){ cart = cart.filter(c=>c.index!==index); updateCartUI(); }
function updateCartUI(){
  let totalCount=0,totalPrice=0;
  cart.forEach(c=>{
    const p = products[c.index]; if(!p) return;
    totalCount += c.qty; totalPrice += p.price*c.qty;
  });
  if(cartCountTopEl) cartCountTopEl.textContent = totalCount;
  if(cartTotalTopEl) cartTotalTopEl.textContent = formatPrice(totalPrice) + " so‘m";
  if(quickOrderBtn)  quickOrderBtn.classList.toggle("hidden", totalCount===0);
  if(cartSheet?.classList.contains("open")) renderCartItems();
  syncTelegramMainButton();
}
function renderCartItems(){
  if(!cartItemsEl) return;
  if(cart.length===0){
    cartItemsEl.innerHTML = "<p class='cart-empty'>Savat hozircha bo‘sh 🙂</p>";
    cartSheetTotalEl.textContent = "0 so‘m"; return;
  }
  let html="",total=0;
  cart.forEach(c=>{
    const p = products[c.index]; if(!p) return;
    const lineTotal = p.price*c.qty; total += lineTotal;
    html += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">${formatPrice(p.price)} so‘m</div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button onclick="changeQty(${c.index},-1)">−</button>
            <span>${c.qty}</span>
            <button onclick="changeQty(${c.index},+1)">+</button>
          </div>
          <div class="cart-item-total">${formatPrice(lineTotal)} so‘m</div>
          <button class="cart-remove" onclick="removeFromCart(${c.index})">O‘chirish</button>
        </div>
      </div>
    `;
  });
  cartItemsEl.innerHTML = html;
  cartSheetTotalEl.textContent = formatPrice(total) + " so‘m";
}
function toggleCartSheet(force){
  const isOpen = cartSheet.classList.contains("open");
  const next   = typeof force==="boolean" ? force : !isOpen;
  cartSheet.classList.toggle("open", next);
  cartSheetOverlay.classList.toggle("show", next);
  if(next) renderCartItems();
}
if(openCartBtn) openCartBtn.onclick = ()=>toggleCartSheet(true);
if(cartTopBtn)  cartTopBtn.onclick  = ()=>toggleCartSheet(true);
if(cartCloseBtn) cartCloseBtn.onclick = ()=>toggleCartSheet(false);
if(cartSheetOverlay) cartSheetOverlay.onclick = ()=>toggleCartSheet(false);

/* DETAIL MODAL */
window.openProductDetail = function(i){
  detailIndex = i; detailImageIndex = 0; detailQty = 1;
  const p = products[i]; if(!p) return;
  detailCategoryEl.textContent = p.category || "";
  detailNameEl.textContent = p.name || "";
  detailDescEl.textContent = p.description || "";
  detailTagEl.textContent = p.tag ? "🏷 " + p.tag : "";
  detailPriceEl.textContent = formatPrice(p.price) + " so‘m";
  detailOldPriceEl.textContent = p.oldPrice ? (formatPrice(p.oldPrice) + " so‘m") : "";
  detailQtyValue.textContent = detailQty;
  setDetailImage();
  productDetailOverlay.classList.remove("hidden");
}
function setDetailImage(){
  const p = products[detailIndex]; const list = Array.isArray(p?.images) && p.images.length ? p.images : ["https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/"+"noimage"+".png"];
  const url = list[detailImageIndex];
  if(url.startsWith("https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/")){
    const base = url.replace(/\.(png|jpg|jpeg)$/i,"");
    detailImageEl.onerror = function(){ this.onerror=null; this.src = base + ".jpg"; };
    detailImageEl.src = base + ".png";
  }else{
    detailImageEl.onerror = null; detailImageEl.src = url;
  }
  detailImageIndexEl.textContent = (detailImageIndex+1)+"/"+list.length;
}
detailPrevBtn.onclick = ()=>{ const p=products[detailIndex]; if(!p) return; const l=p.images?.length||1; detailImageIndex=(detailImageIndex-1+l)%l; setDetailImage(); };
detailNextBtn.onclick = ()=>{ const p=products[detailIndex]; if(!p) return; const l=p.images?.length||1; detailImageIndex=(detailImageIndex+1)%l; setDetailImage(); };
detailQtyMinus.onclick = ()=>{ if(detailQty>1){ detailQty--; detailQtyValue.textContent = detailQty; } };
detailQtyPlus.onclick  = ()=>{ detailQty++; detailQtyValue.textContent = detailQty; };
detailAddBtn.onclick   = ()=>{ addToCart(detailIndex, detailQty); showToast("Savatga qo‘shildi."); };
detailBackBtn.onclick  = ()=>{ productDetailOverlay.classList.add("hidden"); };
document.getElementById("detailCloseBtn")?.addEventListener("click", ()=>productDetailOverlay.classList.add("hidden"));
detailImageEl?.addEventListener("click", ()=>{
  const card = document.querySelector(".detail-card");
  card.classList.toggle("image-fullscreen");
});

/* ORDERS (CLIENT + ADMIN) */
function orderProgress(status){
  const statuses = ["pending","confirmed","courier","delivered"];
  const idx = Math.max(0, statuses.indexOf(status));
  const pct = Math.round((idx/(statuses.length-1))*100);
  return { idx, pct };
}
function renderOrderCard(o, isAdminView){
  const total = (o.items||[]).reduce((s,it)=>s+Number(it.price||0)*Number(it.qty||1),0);
  const prog = orderProgress(o.status||"pending");
  return `
    <article class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">#${o.id}</div>
          <div class="order-customer">👤 ${(o.customer?.name||"")} • 📱 ${(o.customer?.phone||"")}</div>
          <div class="order-date">${new Date(o.createdAt?.seconds? o.createdAt.seconds*1000 : Date.now()).toLocaleString()}</div>
        </div>
        <div class="order-total">${formatPrice(total)} so‘m</div>
      </div>

      <div class="order-items">
        <ul>${(o.items||[]).map(it=>`<li>${it.name} × ${it.qty}</li>`).join("")}</ul>
      </div>

      <div class="order-status-row">
        <span class="status-pill status-${o.status||"pending"}">${(o.status||"pending").toUpperCase()}</span>
      </div>

      <div class="progress-wrap">
        <div class="progress-label">Jarayon: ${prog.pct}%</div>
        <div class="progress-line"><div class="progress-fill" style="width:${prog.pct}%"></div></div>
        <div class="progress-steps"><span class="progress-step ${prog.idx>=0?"active":""}">Kutilmoqda</span><span class="progress-step ${prog.idx>=1?"active":""}">Tasdiq</span><span class="progress-step ${prog.idx>=2?"active":""}">Kuryer</span><span class="progress-step ${prog.idx>=3?"active":""}">Yetkazildi</span></div>
      </div>

      ${isAdminView ? `
      <div class="admin-order-actions">
        <button class="btn-xs btn-xs-primary" data-oa="confirm"  data-id="${o.id}">Tasdiqlash</button>
        <button class="btn-xs btn-xs-secondary" data-oa="courier"  data-id="${o.id}">Kuryerga berish</button>
        <button class="btn-xs btn-xs-primary" data-oa="delivered" data-id="${o.id}">Yetkazildi</button>
        <button class="btn-xs btn-xs-danger"   data-oa="reject"    data-id="${o.id}">Bekor</button>
      </div>` : ``}
    </article>
  `;
}
function renderClientOrders(){
  if(!clientOrdersListEl) return;
  if(!clientOrders.length){ clientOrdersListEl.innerHTML = "<p class='cart-empty'>Sizda hali buyurtmalar yo‘q.</p>"; return; }
  clientOrdersListEl.innerHTML = clientOrders.map(o=>renderOrderCard(o,false)).join("");
}
function renderAdminOrders(){
  if(!adminOrdersListEl) return;
  let list = adminOrders;
  if(adminOrderFilter!=="all") list = adminOrders.filter(o=>(o.status||"pending")===adminOrderFilter);
  adminOrdersListEl.innerHTML = list.map(o=>renderOrderCard(o,true)).join("");
}
function subscribeOrdersRealtime(){
  onSnapshot(query(ordersCol, orderBy("createdAt","desc")), snap=>{
    const all = []; const mine = [];
    snap.forEach(d=>{
      const o = { id:d.id, ...d.data() };
      all.push(o);
      if(o.clientId===clientId) mine.push(o);
    });
    adminOrders = all; clientOrders = mine;
    renderClientOrders(); renderAdminOrders();
    rebuildCourierSelect();
  });
}

/* ADMIN: Category select + list */
function updateAdminCategorySelect(){
  if(!adminCategoryEl) return;
  adminCategoryEl.innerHTML = `<option value="">— Tanlang —</option>` + categories.map(c=>`<option value="${c.code}">${c.emoji} ${c.label}</option>`).join("");
}
function renderCategoryAdminList(){
  if(!adminCategoryListEl) return;
  adminCategoryListEl.innerHTML = categories.map(c=>`
    <div class="admin-product-row">
      <div>${c.emoji} <b>${c.label}</b> <small>(${c.code})</small></div>
      <div>
        <button class="admin-edit-btn" data-edit-cat="${c.id}">✏️</button>
        <button class="admin-delete-btn" data-del-cat="${c.id}">🗑</button>
      </div>
    </div>
  `).join("");
}
function renderAdminCustomList(){
  if(!adminCustomListEl) return;
  adminCustomListEl.innerHTML = products.map(p=>`
    <div class="admin-product-row">
      <div><b>${p.name}</b> — ${formatPrice(p.price)} so‘m</div>
      <div>
        <button class="admin-edit-btn" data-edit="${p.id||""}">✏️</button>
        <button class="admin-delete-btn" data-del="${p.id||""}">🗑</button>
      </div>
    </div>
  `).join("");
}

/* ADMIN: save product */
async function saveProduct(){
  const name = adminNameEl.value.trim();
  const cat  = adminCategoryEl.value.trim();
  const priceBase = Number(adminPriceBaseEl.value||0);
  const hasDisc   = adminHasDiscountEl.checked;
  const priceDisc = Number(adminPriceDiscountEl.value||0);
  const tag  = adminTagEl.value.trim();
  const description = adminDescriptionEl.value.trim();
  const images = normalizeImagesInput(adminImagesEl.value.trim());
  const price = hasDisc && priceDisc>0 ? priceDisc : priceBase;
  if(!name || !cat || price<=0){ showToast("Nom, kategoriya va narx to‘ldirilishi shart."); return; }
  await addDoc(productsCol, { name, category:cat, price, oldPrice:hasDisc?priceBase:null, tag, description, images, createdAt: serverTimestamp() });
  showToast("Mahsulot saqlandi.");
  adminNameEl.value = adminPriceBaseEl.value = adminPriceDiscountEl.value = adminTagEl.value = adminDescriptionEl.value = adminImagesEl.value = "";
  adminHasDiscountEl.checked = false; adminCategoryEl.value = "";
}
if(adminSaveProductBtn) adminSaveProductBtn.onclick = saveProduct;

/* ADMIN: save category */
async function saveCategory(){
  const code  = adminCatCodeEl.value.trim().toLowerCase();
  const label = adminCatLabelEl.value.trim();
  const emoji = adminCatEmojiEl.value.trim() || "💅";
  if(!code || !label){ showToast("Kod va yorliq kiritilsin."); return; }
  await addDoc(categoriesCol, { code, label, emoji, order: 0, createdAt: serverTimestamp() });
  adminCatCodeEl.value = adminCatLabelEl.value = adminCatEmojiEl.value = "";
  showToast("Kategoriya saqlandi.");
}
if(adminSaveCategoryBtn) adminSaveCategoryBtn.onclick = saveCategory;

/* ORDERS: create */
async function quickOrder(){
  if(cart.length===0){ showToast("Savat bo‘sh."); return; }
  const info = askCustomerInfo(); if(!info) return;
  const loc  = await getOrAskLocation(); // may be null

  const items = cart.map(c=>{
    const p = products[c.index];
    return { id:p.id||null, name:p.name, price:p.price, qty:c.qty };
  });
  const total = items.reduce((s,it)=>s+it.price*it.qty,0);

  const newOrder = {
    clientId, status:"pending", createdAt: serverTimestamp(),
    customer: info, items, total, location: loc || null
  };
  await addDoc(ordersCol, newOrder);
  showToast("Buyurtmangiz yuborildi.");
  cart = []; updateCartUI(); toggleCartSheet(false);
}
if(quickOrderBtn) quickOrderBtn.onclick = quickOrder;
if(cartSendBtn)  cartSendBtn.onclick  = quickOrder;

/* ADMIN: order actions */
adminOrdersListEl?.addEventListener("click", async (e)=>{
  const btn  = e.target.closest("[data-oa]"); if(!btn) return;
  const act  = btn.dataset.oa; const id = btn.dataset.id;
  const ref  = doc(db,"orders",id);
  if(act==="confirm"){ await updateDoc(ref,{status:"confirmed"}); showToast("Tasdiqlandi."); }
  if(act==="courier"){ await updateDoc(ref,{status:"courier"}); showToast("Kuryerga berildi."); }
  if(act==="delivered"){ await updateDoc(ref,{status:"delivered"}); showToast("Yetkazildi."); }
  if(act==="reject"){ await updateDoc(ref,{status:"rejected"}); showToast("Bekor qilindi."); }
});

/* ADMIN: courier route */
function rebuildCourierSelect(){
  if(!courierOrderSelect) return;
  courierOrderSelect.innerHTML = `<option value="">— Buyurtma tanlang —</option>` + adminOrders.map(o=>`<option value="${o.id}">#${o.id} — ${(o.customer?.name||"")} (${formatPrice(o.total||0)} so‘m)</option>`).join("");
}
courierOrderSelect?.addEventListener("change", ()=>{
  courierSelectedOrderId = courierOrderSelect.value || null;
  const o = adminOrders.find(x=>x.id===courierSelectedOrderId);
  if(!o){ courierMapFrame.src = ""; courierInfoEl.textContent = ""; adminOpenRouteBtn.removeAttribute("href"); return; }
  const addr = o.customer?.address || "";
  const lat = o.location?.lat; const lng = o.location?.lng;
  courierInfoEl.textContent = `📍 ${addr}`;
  let mapUrl = "";
  if(lat && lng){
    mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;
    adminOpenRouteBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }else if(addr){
    mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=14&output=embed`;
    adminOpenRouteBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
  }else{
    mapUrl = "";
    adminOpenRouteBtn.removeAttribute("href");
  }
  if(mapUrl) courierMapFrame.src = mapUrl;
});
adminMarkDeliveredBtn?.addEventListener("click", async ()=>{
  if(!courierSelectedOrderId) return;
  await updateDoc(doc(db,"orders",courierSelectedOrderId), { status:"delivered" });
  showToast("Yetkazildi.");
});
adminRejectBtn?.addEventListener("click", async ()=>{
  if(!courierSelectedOrderId) return;
  await updateDoc(doc(db,"orders",courierSelectedOrderId), { status:"rejected" });
  showToast("Bekor qilindi.");
});

/* TABS (shop / orders / admin) */
tabsEl?.addEventListener("click", (e)=>{
  const btn = e.target.closest(".tab-btn"); if(!btn) return;
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  const tab = btn.dataset.tab;
  document.getElementById("shopPage")  .classList.toggle("hidden", tab!=="shop");
  document.getElementById("ordersPage").classList.toggle("hidden", tab!=="orders");
  document.getElementById("adminPage") .classList.toggle("hidden", tab!=="admin");
});

/* ADMIN ACCESS (simple prompt) */
adminAccessBtn?.addEventListener("click", ()=>{
  const pass = prompt("Admin parolini kiriting:");
  if(pass && pass.trim()==="777"){ // simple
    isAdmin = true; showToast("Admin rejimi yoqildi."); document.getElementById("adminTabBtn")?.classList.add("admin-active");
  }else{
    isAdmin = false; showToast("Parol xato.");
  }
});

/* TELEGRAM MAIN BUTTON SYNC */
function syncTelegramMainButton(){
  const tg = window.Telegram?.WebApp;
  if(!tg) return;
  const count = cart.reduce((s,i)=>s+i.qty,0);
  if(count>0){
    tg.MainButton.setText(`🛒 Yuborish (${count})`);
    tg.MainButton.show();
    tg.MainButton.onClick(()=>quickOrder());
  }else{
    tg.MainButton.hide();
  }
}

/* INIT */
subscribeProductsRealtime();
subscribeCategoriesRealtime();
subscribeOrdersRealtime();
renderCategoryFilter();
renderProducts();
updateCartUI();

// Export some functions for inline onclick handlers used in generated HTML
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.quickOrder  = quickOrder;
