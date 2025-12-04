// FIREBASE MODULLARI CDN ORQALI
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// SENING KONFIGING
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

// CONSTANTS
const STORAGE_CUSTOMER = "beauty_customer_info";
const THEME_KEY        = "beauty_theme";
const CLIENT_ID_KEY    = "beauty_client_id";
const RAW_PREFIX       = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";

// CATEGORY DICTS
const categoryEmoji = { default: "💅" };
const categoryLabel = {};

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

// YANGI HOLATLAR
let adminOrderFilter     = "all"; // "all" yoki "delivered"
let clientOrderStatusMap = {};    // mijoz buyurtmalarining eski statuslari

// DETAIL STATE
let detailIndex              = null;
let detailImageIndex         = 0;
let detailQty                = 1;
let detailCountdownTimer     = null;
let detailCountdownRemaining = 0;

// CLIENT ORDER STATE
let clientId       = null;
let clientOrders   = [];
let adminOrders    = [];

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
const customerInfoTextEl = document.getElementById("customerInfoText");

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

const detailPrevBtn      = document.getElementById("detailPrevBtn");
const detailNextBtn      = document.getElementById("detailNextBtn");
const detailImageIndexEl = document.getElementById("detailImageIndex");

const detailQtyMinus = document.getElementById("detailQtyMinus");
const detailQtyPlus  = document.getElementById("detailQtyPlus");
const detailQtyValue = document.getElementById("detailQtyValue");

// ADMIN FORM DOM
const adminNameEl          = document.getElementById("adminName");
const adminCategoryEl      = document.getElementById("adminCategory");
const adminPriceBaseEl     = document.getElementById("adminPriceBase");
const adminHasDiscountEl   = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl           = document.getElementById("adminTag");
const adminDescriptionEl   = document.getElementById("adminDescription");
const adminImagesEl        = document.getElementById("adminImages");

// ADMIN CATEGORY FORM
const adminCatCodeEl      = document.getElementById("adminCatCode");
const adminCatLabelEl     = document.getElementById("adminCatLabel");
const adminCatEmojiEl     = document.getElementById("adminCatEmoji");
const adminCategoryListEl = document.getElementById("adminCategoryList");

// ORDERS DOM
const clientOrdersListEl = document.getElementById("clientOrdersList");
const adminOrdersListEl  = document.getElementById("adminOrdersList");

// SOUND (ding.mp3 index bilan bir papkada)
const notifySoundEl = document.getElementById("notifySound");

/* HELPERS */
function formatPrice(v){ return (v || 0).toLocaleString("uz-UZ"); }

// universal toast (duration parametrli)
function showToast(message, duration = 1800){
  if(!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");

  if(showToast._timer){
    clearTimeout(showToast._timer);
  }
  showToast._timer = setTimeout(()=>{
    toastEl.classList.remove("show");
  }, duration);
}

function normalizeImagesInput(raw){
  if(!raw) return [];
  return raw
    .split(",")
    .map(s=>s.trim())
    .filter(Boolean)
    .map(token=>{
      if(/^https?:\/\//i.test(token)) return token;
      const name = token.replace(/\.(png|jpg|jpeg)$/i,"");
      return RAW_PREFIX + name + ".png";
    });
}

function setImageWithPngJpgFallback(imgElement,url){
  if(!imgElement) return;
  if(!url){
    imgElement.onerror = null;
    imgElement.src = RAW_PREFIX + "noimage.png";
    return;
  }
  if(url.startsWith(RAW_PREFIX)){
    const base = url.replace(/\.(png|jpg|jpeg)$/i,"");
    imgElement.onerror = function(){
      this.onerror=null;
      this.src = base + ".jpg";
    };
    imgElement.src = base + ".png";
  }else{
    imgElement.onerror = null;
    imgElement.src = url;
  }
}

function matchesSearch(p){
  if(!currentSearch) return true;
  const q    = currentSearch;
  const name = (p.name || "").toLowerCase();
  const tag  = (p.tag || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  const cat  = (p.category || "").toLowerCase();
  return name.includes(q) || tag.includes(q) || desc.includes(q) || cat.includes(q);
}

/* CLIENT ID */
function getOrCreateClientId(){
  let cid = localStorage.getItem(CLIENT_ID_KEY);
  if(!cid){
    cid = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(CLIENT_ID_KEY, cid);
  }
  return cid;
}

/* CUSTOMER INFO */
function renderCustomerInfo(){
  if(!customerInfoTextEl) return;
  let info = null;
  try{
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  }catch(e){ info = null; }
  if(info && info.name && info.phone){
    customerInfoTextEl.textContent =
      "👤 " + info.name +
      " • 📱 " + info.phone +
      (info.address ? " • 📍 " + info.address : "");
  }else{
    customerInfoTextEl.textContent =
      "Mijoz ma’lumotlari saqlanmagan. Buyurtma berganingizda ism va telefon so‘raladi.";
  }
}

function promptNewCustomerInfo(){
  const name = prompt("👤 Ismingizni kiriting (masalan, Shahboz):");
  if(!name) return null;
  const phone = prompt("📱 Telefon raqamingizni kiriting (masalan, +99890 123 45 67):");
  if(!phone) return null;
  const address = prompt("📍 Manzilingizni kiriting (shahar, tuman, ko‘cha, uy):");
  if(!address) return null;

  const info = {
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim()
  };
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(info));
  renderCustomerInfo();
  return info;
}

function askCustomerInfo(){
  let info = null;
  try{
    info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER) || "null");
  }catch(e){ info = null; }

  if(info && info.name && info.phone && info.address){
    const ok = confirm(
      "📦 Oldingi buyurtma ma’lumotlari:\n\n" +
      "👤 Ism: " + info.name + "\n" +
      "📱 Telefon: " + info.phone + "\n" +
      "📍 Manzil: " + info.address + "\n\n" +
      "Shu ma’lumotlar bilan yuborilsinmi?"
    );
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

function editCustomerInfo(){
  promptNewCustomerInfo();
}

/* THEME */
function applyTheme(theme){
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme === "dark");
  if(themeToggleBtn){
    themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}
function toggleTheme(){
  const current = localStorage.getItem(THEME_KEY) || "dark";
  const next    = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
if(themeToggleBtn){
  themeToggleBtn.addEventListener("click", toggleTheme);
}

/* PRODUCTS REAL-TIME */
function rebuildProducts(){
  products = [...remoteProducts];
  renderProducts();
}
function renderProducts(){
  productsGrid.innerHTML = "";
  const filtered = products.filter(p =>
    (activeCategory === "all" ? true : p.category === activeCategory) &&
    matchesSearch(p)
  );
  if(!filtered.length){
    productsGrid.innerHTML = "<p class='cart-empty'>Hozircha mahsulot qo‘shilmagan.</p>";
    return;
  }
  filtered.forEach(p=>{
    const index    = products.indexOf(p);
    const discount = p.oldPrice && p.oldPrice > p.price
      ? (100 - Math.round(p.price*100/p.oldPrice))
      : null;
    const tag        = p.tag || "Ommabop mahsulot";
    const firstImage = (p.images && p.images.length) ? p.images[0] : RAW_PREFIX + "noimage.png";
    let imgHtml;
    if(firstImage.startsWith(RAW_PREFIX)){
      const base = firstImage.replace(/\.(png|jpg|jpeg)$/i,"");
      imgHtml = `<img src="${base}.png" alt="${p.name}" onerror="this.onerror=null;this.src='${base}.jpg';">`;
    }else{
      imgHtml = `<img src="${firstImage}" alt="${p.name}">`;
    }
    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";

    productsGrid.innerHTML += `
      <article class="product-card" onclick="openProductDetail(${index})">
        <div class="product-img-wrap">
          ${imgHtml}
          <div class="product-img-tag">
            <span>Beauty</span><span>Pro</span>
          </div>
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
            <button class="btn-add" onclick="event.stopPropagation(); addToCart(${index});">
              ➕ Savatga
            </button>
          </div>
        </div>
      </article>
    `;
  });
}

function subscribeProductsRealtime(){
  onSnapshot(productsCol, snap=>{
    const list = [];
    snap.forEach(d=>{
      const data = d.data();
      list.push({
        id: d.id,
        fromFirebase: true,
        name: data.name || "",
        price: data.price || 0,
        oldPrice: data.oldPrice || null,
        category: data.category || "",
        emoji: data.emoji || categoryEmoji[data.category] || categoryEmoji.default,
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

/* CATEGORIES */
function renderCategoryFilter(){
  if(!filterBar) return;
  let html = "";
  html += `<button class="chip ${activeCategory==="all"?"active":""}" data-category="all">⭐ Barchasi</button>`;
  categories.forEach(cat=>{
    html += `
      <button class="chip ${activeCategory===cat.code?"active":""}" data-category="${cat.code}">
        ${cat.emoji} ${cat.label}
      </button>
    `;
  });
  filterBar.innerHTML = html;
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
      list.push({
        id:d.id,
        code,
        label,
        emoji,
        order:data.order ?? 0
      });
      categoryEmoji[code] = emoji;
      categoryLabel[code] = label;
    });
    list.sort((a,b)=>(a.order||0)-(b.order||0));
    categories = list;
    renderCategoryFilter();
    updateAdminCategorySelect();
    renderCategoryAdminList();
  },err=>{
    console.error("Kategoriya realtime xato:", err);
    showToast("⚠️ Kategoriyalarni o‘qishda xato.");
  });
}

if(filterBar){
  filterBar.addEventListener("click", e=>{
    const btn = e.target.closest(".chip");
    if(!btn) return;
    document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.category;
    renderProducts();
  });
}

/* SEARCH */
if(searchInput){
  searchInput.addEventListener("input", ()=>{
    currentSearch = searchInput.value.trim().toLowerCase();
    renderProducts();
  });
}

/* CART */
function addToCart(index, qty=1){
  if(qty<=0) return;
  const found = cart.find(c=>c.index===index);
  if(found) found.qty += qty;
  else cart.push({index,qty});
  updateCartUI();
  showToast("Savatga qo‘shildi.");
}
function updateCartUI(){
  let totalCount=0,totalPrice=0;
  cart.forEach(c=>{
    const p = products[c.index];
    if(!p) return;
    totalCount += c.qty;
    totalPrice += p.price*c.qty;
  });
  cartCountTopEl.textContent = totalCount;
  cartTotalTopEl.textContent = formatPrice(totalPrice)+" so‘m";
  if(cartSheet.classList.contains("open")) renderCartItems();
}
function toggleCartSheet(force){
  const isOpen = cartSheet.classList.contains("open");
  const next   = typeof force==="boolean" ? force : !isOpen;
  cartSheet.classList.toggle("open", next);
  cartSheetOverlay.classList.toggle("show", next);
  if(next) renderCartItems();
}
function renderCartItems(){
  if(cart.length===0){
    cartItemsEl.innerHTML = "<p class='cart-empty'>Savat hozircha bo‘sh 🙂</p>";
    cartSheetTotalEl.textContent = "0 so‘m";
    return;
  }
  let html="",total=0;
  cart.forEach(c=>{
    const p = products[c.index];
    if(!p) return;
    const lineTotal = p.price*c.qty;
    total += lineTotal;
    const catLabel = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
    html += `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">${formatPrice(p.price)} so‘m • ${catLabel}</div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button onclick="changeQty(${c.index},-1)">-</button>
            <span>${c.qty}</span>
            <button onclick="changeQty(${c.index},1)">+</button>
          </div>
          <div class="cart-item-total">${formatPrice(lineTotal)} so‘m</div>
          <button class="cart-remove" onclick="removeFromCart(${c.index})">✕</button>
        </div>
      </div>
    `;
  });
  cartItemsEl.innerHTML = html;
  cartSheetTotalEl.textContent = formatPrice(total)+" so‘m";
}
function changeQty(idx,delta){
  const item = cart.find(c=>c.index===idx);
  if(!item) return;
  item.qty += delta;
  if(item.qty<=0) cart = cart.filter(c=>c.index!==idx);
  updateCartUI();
  renderCartItems();
}
function removeFromCart(idx){
  cart = cart.filter(c=>c.index!==idx);
  updateCartUI();
  renderCartItems();
}

/* ORDER STATUS HELPERS */
const ORDER_STEPS = ["pending","confirmed","courier","delivered"];
function statusLabel(status){
  switch(status){
    case "pending":   return "Tasdiqlash kutilmoqda";
    case "confirmed": return "Admin tasdiqladi";
    case "courier":   return "Kuryerga berildi";
    case "delivered": return "Yetkazildi";
    case "rejected":  return "Bekor qilindi";
    default:          return status;
  }
}
function statusClass(status){
  return `status-pill status-${status}`;
}
function progressPercent(status){
  if(status==="rejected") return 0;
  const idx = ORDER_STEPS.indexOf(status);
  if(idx<0) return 0;
  return ((idx+1)/ORDER_STEPS.length)*100;
}
function renderProgressHTML(status){
  const pct   = progressPercent(status);
  const steps = ORDER_STEPS;
  return `
    <div class="progress-wrap">
      <div class="progress-label">${statusLabel(status)}</div>
      <div class="progress-line">
        <div class="progress-fill" style="width:${pct}%;"></div>
      </div>
      <div class="progress-steps">
        ${steps.map(s=>`
          <span class="progress-step ${ORDER_STEPS.indexOf(s)<=ORDER_STEPS.indexOf(status) ? "active":""}">
            ${s==="pending"?"Yuborildi":
              s==="confirmed"?"Tasdiq":
              s==="courier"?"Kuryer":
              "Yetdi"}
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

/* SOUND PLAY (ding.mp3) */
function playNotify(){
  if(!notifySoundEl) return;
  try{
    notifySoundEl.currentTime = 0;
    notifySoundEl.play().catch(()=>{});
  }catch(e){
    console.error("Ding ijro xato:", e);
  }
}

/* MIJOZGA STATUS XABARLARI */
function clientStatusMessage(status){
  switch(status){
    case "confirmed": return "✅ Buyurtmangiz tasdiqlandi.";
    case "courier":   return "🚚 Buyurtmangiz kuryerga topshirildi.";
    case "delivered": return "🎉 Buyurtma yetkazildi. Bizni tanlaganingiz uchun rahmat!";
    case "rejected":  return "❌ Buyurtmangiz bekor qilindi.";
    default:          return "ℹ️ Buyurtma holati yangilandi.";
  }
}

function notifyClientStatus(status){
  const msg = clientStatusMessage(status);
  showToast(msg, 3000); // 3 soniya
  playNotify();
}

function checkDeliveredThankYou(){
  const hasDelivered = clientOrders.some(o => o.status === "delivered");
  if(hasDelivered){
    showToast("🎉 Buyurtmani qabul qilganingiz uchun rahmat!", 3000);
  }
}

/* REAL-TIME ORDERS (CLIENT) */
function subscribeClientOrders(){
  const qClient = query(
    ordersCol,
    where("clientId","==", clientId),
    orderBy("createdAt","desc")
  );
  onSnapshot(qClient, snap=>{
    let hasStatusChange   = false;
    let lastChangedStatus = null;

    const list = [];
    snap.forEach(d=>{
      const data   = d.data();
      const id     = d.id;
      const status = data.status || "pending";

      const prevStatus = clientOrderStatusMap[id];
      if(prevStatus && prevStatus !== status){
        hasStatusChange   = true;
        lastChangedStatus = status;
      }
      clientOrderStatusMap[id] = status;

      list.push({ id, ...data });
    });

    clientOrders = list;
    renderClientOrders();
    checkDeliveredThankYou();

    if(hasStatusChange && lastChangedStatus){
      // 2–3 ta bo‘lsa ham faqat bitta xabar + ding
      notifyClientStatus(lastChangedStatus);
    }
  },err=>{
    console.error("Client orders xato:", err);
    showToast("⚠️ Buyurtmalarni o‘qishda xato.");
  });
}
function renderClientOrders(){
  if(!clientOrdersListEl) return;
  if(!clientOrders.length){
    clientOrdersListEl.innerHTML = "<p class='cart-empty'>Hozircha buyurtmangiz yo‘q.</p>";
    return;
  }
  clientOrdersListEl.innerHTML = "";
  clientOrders.forEach(o=>{
    const created = o.createdAt?.seconds
      ? new Date(o.createdAt.seconds*1000)
      : null;
    const dateStr = created
      ? created.toLocaleString("uz-UZ",{hour12:false})
      : "";
    const itemsHtml = (o.items || []).map(i=>
      `<li>${i.name} — ${i.qty} dona × ${formatPrice(i.price)} so‘m</li>`
    ).join("");
    clientOrdersListEl.innerHTML += `
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">ID: ${o.id.slice(0,8)}...</div>
            ${dateStr ? `<div class="order-date">${dateStr}</div>` : ""}
          </div>
          <div class="order-total">${formatPrice(o.totalPrice)} so‘m</div>
        </header>
        <div class="order-status-row">
          <span class="${statusClass(o.status)}">${statusLabel(o.status)}</span>
        </div>
        ${renderProgressHTML(o.status)}
        <section class="order-items">
          <strong>Mahsulotlar:</strong>
          <ul>${itemsHtml}</ul>
        </section>
        <footer class="order-footer">
          <span>Holat: ${statusLabel(o.status)}</span>
          <span>${o.status==="delivered" ? "✅ Yakunlandi" :
                  o.status==="rejected" ? "❌ Bekor qilingan" :
                  "⏳ Jarayonda"}</span>
        </footer>
      </article>
    `;
  });
}

/* REAL-TIME ORDERS (ADMIN) */
function subscribeAdminOrders(){
  const qAdmin = query(ordersCol, orderBy("createdAt","desc"));
  onSnapshot(qAdmin, snap=>{
    const changes = snap.docChanges();
    let hasNew = false;
    changes.forEach(ch=>{
      if(ch.type==="added"){
        hasNew = true;
      }
    });
    adminOrders = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderAdminOrders();
    if(isAdmin && hasNew){
      playNotify();
      showToast("🔔 Yangi buyurtma keldi!");
    }
  },err=>{
    console.error("Admin orders xato:", err);
    showToast("⚠️ Buyurtmalar (admin) xato.");
  });
}

function setAdminOrderFilter(filter){
  adminOrderFilter = filter; // "all" yoki "delivered"
  renderAdminOrders();
}

function renderAdminOrders(){
  if(!adminOrdersListEl) return;

  const visibleOrders = adminOrderFilter === "delivered"
    ? adminOrders.filter(o => o.status === "delivered")
    : adminOrders;

  adminOrdersListEl.innerHTML = "";

  // Filtr tugmalari
  adminOrdersListEl.innerHTML += `
    <div class="admin-order-filters">
      <button
        class="btn-xs ${adminOrderFilter === "all" ? "btn-xs-primary" : "btn-xs-secondary"}"
        onclick="setAdminOrderFilter('all')">
        Barcha buyurtmalar
      </button>
      <button
        class="btn-xs ${adminOrderFilter === "delivered" ? "btn-xs-primary" : "btn-xs-secondary"}"
        onclick="setAdminOrderFilter('delivered')">
        Yetkazilganlar
      </button>
    </div>
 `;

  if(!visibleOrders.length){
    adminOrdersListEl.innerHTML += "<p class='cart-empty'>Tanlangan bo‘limda buyurtma yo‘q.</p>";
    return;
  }

  visibleOrders.forEach(o=>{
    const created = o.createdAt?.seconds
      ? new Date(o.createdAt.seconds*1000)
      : null;
    const dateStr = created
      ? created.toLocaleString("uz-UZ",{hour12:false})
      : "";
    const itemsHtml = (o.items || []).map(i=>
      `<li>${i.name} — ${i.qty} dona × ${formatPrice(i.price)} so‘m</li>`
    ).join("");
    const customer = o.customer || {};
    adminOrdersListEl.innerHTML += `
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">ID: ${o.id}</div>
            ${dateStr ? `<div class="order-date">${dateStr}</div>` : ""}
            <div class="order-customer">
              👤 ${customer.name || "-"} • 📱 ${customer.phone || "-"}
            </div>
            <div class="order-customer">
              📍 ${customer.address || "-"}
            </div>
          </div>
          <div class="order-total">${formatPrice(o.totalPrice)} so‘m</div>
        </header>
        <div class="order-status-row">
          <span class="${statusClass(o.status)}">${statusLabel(o.status)}</span>
        </div>
        ${renderProgressHTML(o.status)}
        <section class="order-items">
          <strong>Mahsulotlar:</strong>
          <ul>${itemsHtml}</ul>
        </section>
        <div class="admin-order-actions">
          <button class="btn-xs btn-xs-primary"   onclick="updateOrderStatus('${o.id}','confirmed')">Tasdiqlash</button>
          <button class="btn-xs btn-xs-danger"    onclick="updateOrderStatus('${o.id}','rejected')">Bekor qilish</button>
          <button class="btn-xs btn-xs-secondary" onclick="updateOrderStatus('${o.id}','courier')">Kuryer oldi</button>
          <button class="btn-xs btn-xs-primary"   onclick="updateOrderStatus('${o.id}','delivered')">Yetkazildi</button>
        </div>
      </article>
    `;
  });
}

async function updateOrderStatus(orderId, newStatus){
  try{
    await updateDoc(doc(db,"orders",orderId),{
      status:newStatus,
      updatedAt:serverTimestamp()
    });
    showToast("✅ Buyurtma statusi yangilandi.");

    // Admin "Yetkazildi" bosganida avtomatik yetkazilganlar bo‘limiga o‘tish
    if(isAdmin && newStatus === "delivered"){
      adminOrderFilter = "delivered";
      renderAdminOrders();
    }

  }catch(e){
    console.error("Status yangilash xato:", e);
    showToast("⚠️ Status yangilashda xato.");
  }
}

/* SEND ORDER (FIRESTOREGA) */
async function sendOrder(){
  if(cart.length===0){
    showToast("Savat bo‘sh. Avval mahsulot tanlang.");
    return;
  }
  const customer = askCustomerInfo();
  if(!customer){
    showToast("❌ Mijoz ma’lumoti kiritilmadi.");
    return;
  }

  let totalPrice = 0;
  const items = cart.map(c=>{
    const p = products[c.index];
    if(!p) return null;
    const lineTotal = p.price*c.qty;
    totalPrice += lineTotal;
    return {
      name:p.name || "",
      qty:c.qty,
      price:p.price || 0,
      category:p.category || ""
    };
  }).filter(Boolean);

  try{
    const docRef = await addDoc(ordersCol,{
      clientId,
      customer,
      items,
      totalPrice,
      status:"pending",
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    });

    showToast("✅ Buyurtma qabul qilindi. Holatini 'Buyurtmalarim' bo‘limidan ko‘rasiz.");
    cart = [];
    updateCartUI();
    renderCartItems();
    toggleCartSheet(false);

    localStorage.setItem("beauty_last_order_id", docRef.id);
  }catch(e){
    console.error("Order yozish xato:", e);
    showToast("⚠️ Buyurtma saqlashda xato.");
  }
}

/* TABS */
if(tabsEl){
  tabsEl.addEventListener("click", e=>{
    const btn = e.target.closest(".tab-btn");
    if(!btn) return;
    const pageId = btn.dataset.page;

    if(pageId==="adminPage" && !isAdmin){
      showToast("👑 Avval admin kodini kiriting.");
      return;
    }

    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    document.getElementById("shopPage").classList.add("hidden");
    document.getElementById("ordersPage").classList.add("hidden");
    document.getElementById("adminPage").classList.add("hidden");

    document.getElementById(pageId).classList.remove("hidden");
  });
}

/* ADMIN LOGIN */
function updateAdminUI(){
  if(isAdmin){
    adminTabBtn.classList.remove("hidden");
    adminAccessBtn.classList.add("admin-active");
    adminAccessBtn.textContent = "👑 Admin (kirdingiz)";
  }else{
    adminTabBtn.classList.add("hidden");
    adminAccessBtn.classList.remove("admin-active");
    adminAccessBtn.textContent = "👑 Admin uchun";
  }
}
async function askAdminCode(){
  if(isAdmin){
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    adminTabBtn.classList.add("active");
    document.getElementById("shopPage").classList.add("hidden");
    document.getElementById("ordersPage").classList.add("hidden");
    document.getElementById("adminPage").classList.remove("hidden");
    return;
  }
  const code = prompt("Admin uchun kirish kodi:");
  if(code===null) return;

  try{
    const settingsRef = doc(db,"beauty_admin_settings","security");
    const snap        = await getDoc(settingsRef);
    if(!snap.exists()){
      showToast("⚠️ Admin kodi Firestore’da hali sozlanmagan.");
      return;
    }
    const data     = snap.data();
    const realCode = String(data.adminCode || data.code || "").trim();
    if(!realCode){
      showToast("⚠️ Admin kodi noto‘g‘ri sozlangan.");
      return;
    }
    if(code===realCode){
      isAdmin = true;
      updateAdminUI();
      subscribeAdminOrders(); // faqat admin bo‘lganda
      showToast("✅ Admin sifatida kirdingiz.");
    }else{
      showToast("❌ Noto‘g‘ri kod.");
    }
  }catch(e){
    console.error("Admin kod xato:", e);
    showToast("⚠️ Admin kodi tekshiruvida xato.");
  }
}
if(adminAccessBtn){
  adminAccessBtn.addEventListener("click", askAdminCode);
}

/* ADMIN: CATEGORY */
function updateAdminCategorySelect(){
  if(!adminCategoryEl) return;
  const current = adminCategoryEl.value;
  adminCategoryEl.innerHTML = "";
  if(!categories.length){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Avval kategoriyani qo‘shing";
    adminCategoryEl.appendChild(opt);
    return;
  }
  categories.forEach(cat=>{
    const opt = document.createElement("option");
    opt.value = cat.code;
    opt.textContent = cat.label;
    adminCategoryEl.appendChild(opt);
  });
  if(current && categories.some(c=>c.code===current)){
    adminCategoryEl.value = current;
  }
}
function renderCategoryAdminList(){
  if(!adminCategoryListEl) return;
  if(!categories.length){
    adminCategoryListEl.innerHTML = "<p class='cart-empty'>Hozircha kategoriya yo‘q.</p>";
    return;
  }
  adminCategoryListEl.innerHTML = "";
  categories.forEach(cat=>{
    adminCategoryListEl.innerHTML += `
      <div class="admin-product-row">
        <span>${cat.emoji} <b>${cat.label}</b> <small>(${cat.code})</small></span>
        <button class="admin-edit-btn" onclick="editCategory('${cat.id}')">✏️</button>
        <button class="admin-delete-btn" onclick="deleteCategory('${cat.id}')">✕</button>
      </div>
    `;
  });
}
async function saveCategory(){
  if(!adminCatCodeEl || !adminCatLabelEl) return;
  const rawCode = adminCatCodeEl.value.trim();
  const code    = rawCode.toLowerCase();
  const label   = adminCatLabelEl.value.trim();
  const emoji   = (adminCatEmojiEl.value.trim() || "💅");
  if(!code || !label){
    showToast("❌ Kategoriya kodi va nomini kiriting.");
    return;
  }
  try{
    const existing = categories.find(c=>c.code===code);
    if(existing){
      await updateDoc(doc(db,"beauty_categories",existing.id),{
        code,label,emoji,updatedAt:serverTimestamp()
      });
      showToast("✅ Kategoriya yangilandi.");
    }else{
      await addDoc(categoriesCol,{
        code,label,emoji,order:categories.length,createdAt:serverTimestamp()
      });
      showToast("✅ Kategoriya qo‘shildi.");
    }
    adminCatCodeEl.value  = "";
    adminCatLabelEl.value = "";
    adminCatEmojiEl.value = "";
  }catch(e){
    console.error("Kategoriya saqlash xato:", e);
    showToast("⚠️ Kategoriya saqlashda xato.");
  }
}
function editCategory(id){
  const cat = categories.find(c=>c.id===id);
  if(!cat) return;
  editingCategoryId     = id;
  adminCatCodeEl.value  = cat.code;
  adminCatLabelEl.value = cat.label;
  adminCatEmojiEl.value = cat.emoji;
  showToast("✏️ Kategoriya tahrirlash rejimi.");
}
async function deleteCategory(id){
  if(!confirm("Bu kategoriyani o‘chirishni xohlaysizmi?")) return;
  try{
    await deleteDoc(doc(db,"beauty_categories",id));
    showToast("🗑 Kategoriya o‘chirildi.");
  }catch(e){
    console.error("Kategoriya o‘chirish xato:", e);
    showToast("⚠️ Kategoriya o‘chirishda xato.");
  }
}

/* ADMIN: PRODUCTS */
function flashAdminButton(text){
  const btn = document.querySelector(".admin-btn");
  if(!btn) return;
  btn.textContent = text;
  btn.classList.add("admin-btn-success");
  setTimeout(()=>{
    btn.classList.remove("admin-btn-success");
    btn.textContent = editingProductId
      ? "💾 Mahsulotni saqlash (tahrirlash)"
      : "➕ Mahsulotni qo‘shish (Firestore)";
  }, 1500);
}
async function addCustomProduct(){
  const name        = adminNameEl.value.trim();
  const category    = adminCategoryEl.value;
  const basePrice   = parseInt(adminPriceBaseEl.value || "0",10);
  const hasDiscount = adminHasDiscountEl.checked;
  const discountRaw = adminPriceDiscountEl.value
    ? parseInt(adminPriceDiscountEl.value || "0",10)
    : null;
  const tag         = adminTagEl.value.trim();
  const description = adminDescriptionEl.value.trim();

  if(!name || !basePrice || basePrice<=0){
    showToast("❌ Nomi va narxini to‘g‘ri kiriting.");
    return;
  }
  if(!category){
    showToast("❌ Kategoriya tanlang.");
    return;
  }

  let price = basePrice;
  let oldPrice = null;
  if(hasDiscount && discountRaw && discountRaw>0 && discountRaw<basePrice){
    price    = discountRaw;
    oldPrice = basePrice;
  }

  let images = normalizeImagesInput(adminImagesEl.value.trim());
  if(!images.length) images = [RAW_PREFIX + "noimage.png"];

  const emoji = categoryEmoji[category] || "💅";
  const payload = { name,price,oldPrice,category,emoji,tag,description,images };

  try{
    if(editingProductId){
      await updateDoc(doc(db,"beauty_products",editingProductId),{
        ...payload,updatedAt:serverTimestamp()
      });
      remoteProducts = remoteProducts.map(p=>p.id===editingProductId?{...p,...payload}:p);
      rebuildProducts();
      renderAdminCustomList();
      showToast("✅ Mahsulot yangilandi.");
      flashAdminButton("✅ Yangilandi");
    }else{
      const docRef = await addDoc(productsCol,{
        ...payload,createdAt:serverTimestamp()
      });
      remoteProducts.push({
        id:docRef.id,fromFirebase:true,...payload,createdAt:{seconds:Date.now()/1000}
      });
      rebuildProducts();
      renderAdminCustomList();
      showToast("✅ Mahsulot qo‘shildi.");
      flashAdminButton("✅ Qo‘shildi");
    }
    editingProductId             = null;
    adminNameEl.value           = "";
    adminPriceBaseEl.value      = "";
    adminPriceDiscountEl.value  = "";
    adminHasDiscountEl.checked  = false;
    adminTagEl.value            = "";
    adminDescriptionEl.value    = "";
    adminImagesEl.value         = "";
  }catch(e){
    console.error("Mahsulot saqlash xato:", e);
    showToast("⚠️ Mahsulot saqlashda xato.");
  }
}
async function deleteAnyProduct(id){
  if(!confirm("Bu mahsulotni o‘chirishni xohlaysizmi?")) return;
  try{
    await deleteDoc(doc(db,"beauty_products",id));
    remoteProducts = remoteProducts.filter(p=>p.id!==id);
    rebuildProducts();
    renderAdminCustomList();
    showToast("🗑 Mahsulot o‘chirildi.");
  }catch(e){
    console.error("Mahsulot o‘chirish xato:", e);
    showToast("⚠️ Mahsulot o‘chirishda xato.");
  }
}
function renderAdminCustomList(){
  const adminCustomListEl = document.getElementById("adminCustomList");
  if(!adminCustomListEl) return;
  if(!remoteProducts.length){
    adminCustomListEl.innerHTML = "<p class='cart-empty'>Hozircha mahsulot yo‘q.</p>";
    return;
  }
  adminCustomListEl.innerHTML = "";
  remoteProducts
    .slice()
    .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))
    .forEach(p=>{
      adminCustomListEl.innerHTML += `
        <div class="admin-product-row">
          <span>${p.name}</span>
          <span>${formatPrice(p.price)} so‘m</span>
          <button class="admin-edit-btn" onclick="editProduct('${p.id}')">✏️</button>
          <button class="admin-delete-btn" onclick="deleteAnyProduct('${p.id}')">✕</button>
        </div>
      `;
    });
}
function editProduct(id){
  const p = remoteProducts.find(r=>r.id===id);
  if(!p) return;
  editingProductId = id;
  adminNameEl.value     = p.name || "";
  adminCategoryEl.value = p.category || "";
  if(p.oldPrice && p.oldPrice>p.price){
    adminPriceBaseEl.value      = p.oldPrice;
    adminPriceDiscountEl.value  = p.price;
    adminHasDiscountEl.checked  = true;
  }else{
    adminPriceBaseEl.value      = p.price;
    adminPriceDiscountEl.value  = "";
    adminHasDiscountEl.checked  = false;
  }
  adminTagEl.value         = p.tag || "";
  adminDescriptionEl.value = p.description || "";
  adminImagesEl.value      = (p.images && p.images.length) ? p.images.join(", ") : "";
  const btn = document.querySelector(".admin-btn");
  if(btn) btn.textContent = "💾 Mahsulotni saqlash (tahrirlash)";
  showToast("✏️ Tahrirlash rejimi.");
}

/* PRODUCT DETAIL */
function getDetailImages(){
  if(detailIndex===null) return [RAW_PREFIX + "noimage.png"];
  const p = products[detailIndex];
  if(!p) return [RAW_PREFIX + "noimage.png"];
  if(p.images && p.images.length) return p.images;
  return [RAW_PREFIX + "noimage.png"];
}
function renderDetailImage(){
  if(!detailImageEl) return;
  const imgs = getDetailImages();
  if(!imgs.length) return;
  if(detailImageIndex>=imgs.length) detailImageIndex=0;
  if(detailImageIndex<0) detailImageIndex=imgs.length-1;
  setImageWithPngJpgFallback(detailImageEl, imgs[detailImageIndex]);
  if(detailImageIndexEl){
    detailImageIndexEl.textContent = `${detailImageIndex+1} / ${imgs.length}`;
  }
}
function changeDetailImage(delta){
  if(detailIndex===null) return;
  const imgs = getDetailImages();
  if(imgs.length<=1) return;
  detailImageIndex = (detailImageIndex+delta+imgs.length)%imgs.length;
  renderDetailImage();
}
function clearDetailCountdown(){
  if(detailCountdownTimer){
    clearInterval(detailCountdownTimer);
    detailCountdownTimer=null;
  }
  if(detailBackBtn){
    detailBackBtn.classList.add("hidden");
    detailBackBtn.textContent = "◀ Magaziniga qaytish";
    detailBackBtn.style.color = "";
  }
}
function openProductDetail(index){
  const p = products[index];
  if(!p) return;
  detailIndex      = index;
  detailImageIndex = 0;
  detailQty        = 1;
  clearDetailCountdown();

  const catLbl = categoryLabel[p.category] || p.category || "Kategoriya yo‘q";
  renderDetailImage();
  detailCategoryEl.textContent = catLbl;
  detailNameEl.textContent     = p.name;
  detailTagEl.textContent      = p.tag ? "💡 " + p.tag : "";
  detailDescEl.textContent =
    p.description && p.description.trim().length
      ? p.description
      : "Bu mahsulot sizning go‘zallik rutiningiz uchun mo‘ljallangan.";
  detailPriceEl.textContent = formatPrice(p.price) + " so‘m";
  if(p.oldPrice){
    detailOldPriceEl.classList.remove("hidden");
    detailOldPriceEl.textContent = formatPrice(p.oldPrice)+" so‘m";
  }else{
    detailOldPriceEl.classList.add("hidden");
  }
  detailQtyValue.textContent = detailQty;
  detailAddBtn.classList.remove("added");
  detailAddBtn.textContent   = "🛒 Savatga qo‘shish";

  productDetailOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeProductDetail(){
  clearDetailCountdown();
  productDetailOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  detailIndex = null;
}

if(detailAddBtn){
  detailAddBtn.addEventListener("click", ()=>{
    if(detailIndex===null) return;
    if(detailAddBtn.classList.contains("added")){
      closeProductDetail();
      return;
    }
    addToCart(detailIndex, detailQty);
    detailAddBtn.classList.add("added");
    detailAddBtn.textContent = "⬅️ Magaziniga qaytish";
    if(detailBackBtn) detailBackBtn.classList.remove("hidden");
  });
}
if(detailBackBtn){
  detailBackBtn.addEventListener("click", closeProductDetail);
}
if(productDetailOverlay){
  productDetailOverlay.addEventListener("click", e=>{
    if(e.target===productDetailOverlay) closeProductDetail();
  });
}
if(detailPrevBtn){
  detailPrevBtn.addEventListener("click", e=>{
    e.stopPropagation();
    changeDetailImage(-1);
  });
}
if(detailNextBtn){
  detailNextBtn.addEventListener("click", e=>{
    e.stopPropagation();
    changeDetailImage(1);
  });
}
if(detailQtyMinus){
  detailQtyMinus.addEventListener("click", e=>{
    e.stopPropagation();
    if(detailQty>1){
      detailQty--;
      detailQtyValue.textContent = detailQty;
    }
  });
}
if(detailQtyPlus){
  detailQtyPlus.addEventListener("click", e=>{
    e.stopPropagation();
    detailQty++;
    detailQtyValue.textContent = detailQty;
  });
}

/* INIT */
(function init(){
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);

  clientId = getOrCreateClientId();
  renderCustomerInfo();

  isAdmin = false;
  updateAdminUI();

  renderCategoryFilter();
  renderProducts();

  subscribeProductsRealtime();
  subscribeCategoriesRealtime();
  subscribeClientOrders();
})();

/* GLOBAL EXPORTS */
window.addToCart           = addToCart;
window.toggleCartSheet     = toggleCartSheet;
window.changeQty           = changeQty;
window.removeFromCart      = removeFromCart;
window.sendOrder           = sendOrder;
window.openProductDetail   = openProductDetail;
window.closeProductDetail  = closeProductDetail;

window.resetCustomerInfo   = resetCustomerInfo;
window.editCustomerInfo    = editCustomerInfo;

window.saveCategory        = saveCategory;
window.deleteCategory      = deleteCategory;
window.editCategory        = editCategory;

window.addCustomProduct    = addCustomProduct;
window.deleteAnyProduct    = deleteAnyProduct;
window.editProduct         = editProduct;

window.updateOrderStatus   = updateOrderStatus;
window.setAdminOrderFilter = setAdminOrderFilter;
