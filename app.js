// FIREBASE MODULLARI CDN ORQALI
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ============================
   FIREBASE CONFIG
============================ */
const firebaseConfig = {
  apiKey: "AIzaSyDVidcgjpUxkg88bxXfIFzmsFydv0rMMao",
  authDomain: "shahboz-5d0a3.firebaseapp.com",
  projectId: "shahboz-5d0a3",
  storageBucket: "shahboz-5d0a3.firebasestorage.app",
  messagingSenderId: "352024095535",
  appId: "1:352024095535:web:3f495ac74cdd40f5c54fda",
  measurementId: "G-J8KFW5ED77",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// KOLLEKSIYALAR
const colCategories = collection(db, "beauty_categories");
const colProducts   = collection(db, "beauty_products");
const colOrders     = collection(db, "beauty_orders");

/* ============================
   STATE + CONSTANTS
============================ */
const LS_CART_KEY      = "beauty_cart_v2";
const LS_CLIENT_KEY    = "beauty_client_id";
const LS_CUSTOMER_KEY  = "beauty_customer_info";
const LS_THEME_KEY     = "beauty_theme";
const LS_ADMIN_KEY     = "beauty_admin_on";

const ADMIN_PASS = "7777"; // xohlasang o‘zgartir

let products = [];          // firestore’dan kelgan mahsulotlar
let categories = [];        // firestore’dan kelgan kategoriyalar
let categoryLabel = {};     // {code: "💄 Lab bo‘yoqlari"}
let cart = [];              // localStorage savat
let activeCategory = "all";
let isAdmin = false;
let clientId = null;
let customerInfo = null;

// buyurtmalar
let clientOrdersUnsub = null;
let adminOrdersUnsub  = null;
let adminOrdersCache  = [];
let lastAdminOrderTs  = 0;

// DETAIL MODAL STATE
let detailIndex = null;
let detailImageIndex = 0;
let detailQty = 1;
let isImageFullscreen = false;

/* ============================
   DOM SHORTCUT
============================ */
const qs  = (id) => document.getElementById(id);
const $q  = (sel) => document.querySelector(sel);

/* ============================
   DOM ELEMENTLAR
============================ */
const themeToggleBtn   = qs("themeToggleBtn");
const quickOrderBtn    = qs("quickOrderBtn");
const cartCountTop     = qs("cartCountTop");
const cartTotalTop     = qs("cartTotalTop");
const tabsNav          = qs("tabs");
const shopPage         = qs("shopPage");
const ordersPage       = qs("ordersPage");
const adminPage        = qs("adminPage");
const adminTabBtn      = qs("adminTabBtn");
const searchInput      = qs("searchInput");
const filterBar        = qs("filterBar");
const productsGrid     = qs("productsGrid");
const cartSheetOverlay = qs("cartSheetOverlay");
const cartSheet        = qs("cartSheet");
const cartItemsEl      = qs("cartItems");
const cartSheetTotal   = qs("cartSheetTotal");
const toastEl          = qs("toast");
const clientOrdersList = qs("clientOrdersList");
const adminOrdersList  = qs("adminOrdersList");
const customerInfoText = qs("customerInfoText");
const adminAccessBtn   = qs("adminAccessBtn");
const adminCategorySel = qs("adminCategory");
const adminCatCode     = qs("adminCatCode");
const adminCatLabel    = qs("adminCatLabel");
const adminCatEmoji    = qs("adminCatEmoji");
const adminCategoryList= qs("adminCategoryList");
const adminName        = qs("adminName");
const adminPriceBase   = qs("adminPriceBase");
const adminHasDiscount = qs("adminHasDiscount");
const adminPriceDiscount = qs("adminPriceDiscount");
const adminTag         = qs("adminTag");
const adminDescription = qs("adminDescription");
const adminImages      = qs("adminImages");
const adminCustomList  = qs("adminCustomList");
const notifySound      = qs("notifySound");

// DETAIL MODAL ELEMENTLARI
const productDetailOverlay = qs("productDetailOverlay");
const detailImageEl        = qs("detailImage");
const detailImageIndexEl   = qs("detailImageIndex");
const detailCategoryEl     = qs("detailCategory");
const detailNameEl         = qs("detailName");
const detailTagEl          = qs("detailTag");
const detailDescEl         = qs("detailDesc");
const detailPriceEl        = qs("detailPrice");
const detailOldPriceEl     = qs("detailOldPrice");
const detailQtyMinus       = qs("detailQtyMinus");
const detailQtyPlus        = qs("detailQtyPlus");
const detailQtyValue       = qs("detailQtyValue");
const detailAddBtn         = qs("detailAddBtn");
const detailBackBtn        = qs("detailBackBtn");
const detailPrevBtn        = qs("detailPrevBtn");
const detailNextBtn        = qs("detailNextBtn");
const detailCloseBtn       = $q(".detail-close");
const detailImgWrap        = $q(".detail-img-wrap");

/* ============================
   UTIL FUNKSIYALAR
============================ */
function formatPrice(num){
  const n = Number(num || 0);
  return n.toLocaleString("uz-UZ");
}

function showToast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(()=>toastEl.classList.remove("show"),2000);
}

function saveCart(){
  localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
  updateCartUI();
}

function loadCart(){
  try{
    const raw = localStorage.getItem(LS_CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
  }catch(e){
    cart = [];
  }
  updateCartUI();
}

function getCartTotals(){
  let count = 0;
  let total = 0;
  for(const item of cart){
    count += item.qty;
    total += item.price * item.qty;
  }
  return {count,total};
}

function generateClientId(){
  let id = localStorage.getItem(LS_CLIENT_KEY);
  if(!id){
    id = Date.now().toString(36)+Math.random().toString(36).slice(2);
    localStorage.setItem(LS_CLIENT_KEY,id);
  }
  return id;
}

/* ============================
   THEME
============================ */
function applySavedTheme(){
  const saved = localStorage.getItem(LS_THEME_KEY);
  const body = document.body;
  if(saved === "light"){
    body.classList.remove("theme-dark");
  }else{
    body.classList.add("theme-dark");
  }
  updateThemeIcon();
}
function updateThemeIcon(){
  if(!themeToggleBtn) return;
  const isDark = document.body.classList.contains("theme-dark");
  themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
}

/* ============================
   CUSTOMER INFO (MIJOZ MA’LUMOTLARI)
============================ */
function loadCustomerInfo(){
  try{
    const raw = localStorage.getItem(LS_CUSTOMER_KEY);
    customerInfo = raw ? JSON.parse(raw) : null;
  }catch(e){
    customerInfo = null;
  }
  updateCustomerInfoView();
}
function updateCustomerInfoView(){
  if(!customerInfoText) return;
  if(!customerInfo){
    customerInfoText.textContent = "Mijoz ma’lumotlari kiritilmagan.";
    return;
  }
  const {name,phone,phone2,address,landmark,deliveryTime} = customerInfo;
  let txt = "";
  if(name) txt += "👤 " + name + "  ";
  if(phone) txt += "📞 " + phone + "  ";
  if(phone2) txt += "📞2 " + phone2 + "  ";
  if(address) txt += "\n📍 " + address;
  if(landmark) txt += " (" + landmark + ")";
  if(deliveryTime) txt += "\n⏰ Yetkazish vaqti: " + deliveryTime;
  customerInfoText.textContent = txt || "Mijoz ma’lumotlari kiritilgan, lekin to‘liq emas.";
}

function editCustomerInfo(){
  const base = customerInfo || {};
  let name = prompt("Ismingiz?", base.name || "");
  if(name===null) return;

  let phone = prompt("Telefon raqamingiz (masalan: 90 123 45 67)", base.phone || "");
  if(phone===null) return;

  let phone2 = prompt("Ikkinchi telefon raqami (ixtiyoriy)", base.phone2 || "");
  if(phone2===null) return;

  let address = prompt("Manzilingiz (ko‘cha, uy, kvartira)", base.address || "");
  if(address===null) return;

  let landmark = prompt("Mo‘ljal (masalan: bozor oldi, maktab ro‘parasida)", base.landmark || "");
  if(landmark===null) return;

  let deliveryTime = prompt("Buyurtmani qachon yetkazishni xohlaysiz? (masalan: 18:00–19:00)", base.deliveryTime || "");
  if(deliveryTime===null) return;

  customerInfo = {name,phone,phone2,address,landmark,deliveryTime};
  localStorage.setItem(LS_CUSTOMER_KEY, JSON.stringify(customerInfo));
  updateCustomerInfoView();
  showToast("Mijoz ma’lumotlari saqlandi");
}

function resetCustomerInfo(){
  if(!confirm("Mijoz ma’lumotlarini tozalaysizmi?")) return;
  customerInfo = null;
  localStorage.removeItem(LS_CUSTOMER_KEY);
  updateCustomerInfoView();
  showToast("Ma’lumotlar tozalandi");
}

/* ============================
   CART UI
============================ */
function updateCartUI(){
  const {count,total} = getCartTotals();

  if(cartCountTop) cartCountTop.textContent = count;
  if(cartTotalTop) cartTotalTop.textContent = formatPrice(total) + " so‘m";

  if(quickOrderBtn){
    if(count>0) quickOrderBtn.classList.remove("hidden");
    else quickOrderBtn.classList.add("hidden");
  }

  // bottom sheet
  if(!cartItemsEl || !cartSheetTotal) return;

  if(!cart.length){
    cartItemsEl.innerHTML = `<p class="cart-empty">Savat bo‘sh. Mahsulot tanlang 😊</p>`;
    cartSheetTotal.textContent = "0 so‘m";
    return;
  }

  cartItemsEl.innerHTML = cart.map(item => {
    const lineTotal = item.price * item.qty;
    return `
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">
            ${item.categoryLabel || ""} · ${formatPrice(item.price)} so‘m
          </div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button data-cart-minus="${item.id}">−</button>
            <span>${item.qty}</span>
            <button data-cart-plus="${item.id}">+</button>
          </div>
          <div class="cart-item-total">${formatPrice(lineTotal)} so‘m</div>
          <button class="cart-remove" data-cart-remove="${item.id}">O‘chirish</button>
        </div>
      </div>
    `;
  }).join("");

  cartSheetTotal.textContent = formatPrice(total) + " so‘m";

  // eventlar
  cartItemsEl.querySelectorAll("[data-cart-minus]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-cart-minus");
      changeCartQty(id,-1);
    });
  });
  cartItemsEl.querySelectorAll("[data-cart-plus]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-cart-plus");
      changeCartQty(id,1);
    });
  });
  cartItemsEl.querySelectorAll("[data-cart-remove]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-cart-remove");
      removeFromCart(id);
    });
  });
}

function addToCart(product, qty=1){
  if(!product) return;
  const id = product.id;
  const existing = cart.find(x=>x.id===id);
  const catLbl = categoryLabel[product.category] || product.category || "";
  const price = Number(product.price || 0);

  if(existing){
    existing.qty += qty;
  }else{
    cart.push({
      id,
      name: product.name,
      price,
      category: product.category,
      categoryLabel: catLbl,
      tag: product.tag || "",
      qty
    });
  }
  saveCart();
  showToast("Savatga qo‘shildi");
}

function changeCartQty(id,delta){
  const item = cart.find(x=>x.id===id);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0){
    cart = cart.filter(x=>x.id!==id);
  }
  saveCart();
}

function removeFromCart(id){
  cart = cart.filter(x=>x.id!==id);
  saveCart();
}

/* CART SHEET OCHISH / YOPISH */
function toggleCartSheet(open){
  if(open){
    cartSheetOverlay.classList.add("show");
    cartSheet.classList.add("open");
  }else{
    cartSheetOverlay.classList.remove("show");
    cartSheet.classList.remove("open");
  }
}

/* ============================
   FIRESTORE SNAPSHOTLAR
============================ */
// KATEGORIYALAR
onSnapshot(query(colCategories, orderBy("label")), snap=>{
  categories = [];
  categoryLabel = {};
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    const item = {
      id: docSnap.id,
      code: data.code || "",
      label: data.label || "",
      emoji: data.emoji || "💄",
    };
    categories.push(item);
    categoryLabel[item.code] = `${item.emoji} ${item.label}`;
  });
  renderCategoryChips();
  syncAdminCategorySelect();
  renderProductsGrid(); // filterlar yangilanishi uchun
});

// MAHSULOTLAR
onSnapshot(query(colProducts, orderBy("name")), snap=>{
  products = [];
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    products.push({
      id: docSnap.id,
      name: data.name || "",
      category: data.category || "",
      price: Number(data.price || 0),
      oldPrice: data.oldPrice ? Number(data.oldPrice) : null,
      hasDiscount: !!data.hasDiscount,
      tag: data.tag || "",
      description: data.description || "",
      images: Array.isArray(data.images) ? data.images : [],
      active: data.active !== false,
    });
  });
  renderProductsGrid();
  renderAdminProductsList();
});

/* MIJOZ BUYURTMALARI (FAQAT O‘ZINIKI) */
function subscribeClientOrders(){
  if(clientOrdersUnsub) clientOrdersUnsub();
  const qClient = query(colOrders, where("clientKey","==",clientId));
  clientOrdersUnsub = onSnapshot(qClient, snap=>{
    const arr = [];
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      arr.push(mapOrderDoc(docSnap.id,d));
    });
    arr.sort((a,b)=>(b.createdAtTs||0)-(a.createdAtTs||0));
    renderClientOrders(arr);
  });
}

/* ADMIN BUYURTMALARI */
function subscribeAdminOrders(){
  if(adminOrdersUnsub) adminOrdersUnsub();
  const qAdmin = query(colOrders, orderBy("createdAt","desc"));
  adminOrdersUnsub = onSnapshot(qAdmin, snap=>{
    const arr = [];
    let maxTs = lastAdminOrderTs;
    let newCount = 0;
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const mapped = mapOrderDoc(docSnap.id,d);
      arr.push(mapped);
      if(mapped.createdAtTs && mapped.createdAtTs > maxTs){
        if(mapped.createdAtTs > lastAdminOrderTs) newCount++;
        if(mapped.createdAtTs > maxTs) maxTs = mapped.createdAtTs;
      }
    });
    adminOrdersCache = arr;
    if(newCount>0 && notifySound){
      notifySound.play().catch(()=>{});
    }
    lastAdminOrderTs = maxTs;
    renderAdminOrders(arr);
  });
}

/* ORDER DOC MAP */
function mapOrderDoc(id,d){
  let createdAtTs = null;
  if(d.createdAt && d.createdAt.seconds){
    createdAtTs = d.createdAt.seconds;
  }
  return {
    id,
    status: d.status || "pending",
    total: Number(d.total || 0),
    items: Array.isArray(d.items) ? d.items : [],
    clientKey: d.clientKey || "",
    createdAtTs,
    createdAtText: d.createdAtText || "",
    customer: d.customer || null,
    comment: d.comment || "",
    location: d.location || null,
  };
}

/* ============================
   CATEGORY & PRODUCTS UI
============================ */
function renderCategoryChips(){
  if(!filterBar) return;

  const allChip = `
    <button class="chip ${activeCategory==="all"?"active":""}" data-cat="all">
      <span>⭐</span>
      <span>Hammasi</span>
    </button>
  `;
  const catsHtml = categories.map(cat=>{
    const active = activeCategory === cat.code;
    return `
      <button class="chip ${active?"active":""}" data-cat="${cat.code}">
        <span>${cat.emoji}</span>
        <span>${cat.label}</span>
      </button>
    `;
  }).join("");

  filterBar.innerHTML = allChip + catsHtml;

  filterBar.querySelectorAll(".chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      activeCategory = btn.getAttribute("data-cat");
      renderCategoryChips();
      renderProductsGrid();
    });
  });
}

function renderProductsGrid(){
  if(!productsGrid) return;

  let list = products.filter(p=>p.active!==false);

  if(activeCategory !== "all"){
    list = list.filter(p=>p.category === activeCategory);
  }

  const term = (searchInput?.value || "").trim().toLowerCase();
  if(term){
    list = list.filter(p=>
      p.name.toLowerCase().includes(term) ||
      (p.tag || "").toLowerCase().includes(term) ||
      (categoryLabel[p.category] || "").toLowerCase().includes(term)
    );
  }

  if(!list.length){
    productsGrid.innerHTML = `<p style="padding:14px;color:var(--muted);font-size:13px;">
      Hech narsa topilmadi. Boshqa so‘z bilan qidirib ko‘ring.
    </p>`;
    return;
  }

  productsGrid.innerHTML = list.map(p=>{
    const idx = products.findIndex(x=>x.id===p.id);
    const catLbl = categoryLabel[p.category] || "";
    const hasDisc = p.oldPrice && p.oldPrice > p.price;
    return `
      <article class="product-card" data-idx="${idx}">
        <div class="product-img-wrap">
          <img src="${(p.images && p.images[0]) || "https://via.placeholder.com/600x400?text=Beauty+Store"}" alt="${p.name}">
          <div class="product-img-tag">
            ${catLbl ? `<span>${catLbl}</span>`:""}
          </div>
          ${hasDisc ? `<div class="product-sale">Chegirma</div>`:""}
        </div>
        <div class="product-body">
          <h3 class="product-name">${p.name}</h3>
          <div class="product-meta">${p.tag || ""}</div>
          <div class="price-row">
            <div>
              <div class="price-main">${formatPrice(p.price)} so‘m</div>
              ${hasDisc ? `<div class="price-old">${formatPrice(p.oldPrice)} so‘m</div>`:""}
            </div>
            <button class="btn-add" data-add="${p.id}">Savatga</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // card bosish – detail ochish
  productsGrid.querySelectorAll(".product-card").forEach(card=>{
    card.addEventListener("click", (e)=>{
      const idx = Number(card.getAttribute("data-idx"));
      // “Savatga” tugmasi bosilganda detail emas
      if(e.target.matches("[data-add]")){
        const id = e.target.getAttribute("data-add");
        const product = products.find(p=>p.id===id);
        addToCart(product,1);
        e.stopPropagation();
        return;
      }
      openProductDetail(idx);
    });
  });
}

/* ADMIN PANEL – KATEGORIYA SELECT & LIST */
function syncAdminCategorySelect(){
  if(!adminCategorySel) return;
  adminCategorySel.innerHTML = `
    <option value="">Kategoriya tanlang</option>
    ${categories.map(c=>`<option value="${c.code}">${c.emoji} ${c.label}</option>`).join("")}
  `;

  if(!adminCategoryList) return;
  adminCategoryList.innerHTML = categories.map(c=>`
    <div class="admin-product-row">
      <span>${c.emoji} ${c.label}</span>
      <span style="font-size:11px;color:var(--muted)">kod: ${c.code}</span>
    </div>
  `).join("");
}

/* ADMIN – MAHSULOTLAR RO‘YXATI (faqat ko‘rsatish) */
function renderAdminProductsList(){
  if(!adminCustomList) return;
  if(!products.length){
    adminCustomList.innerHTML = `<p style="font-size:12px;color:var(--muted);">Mahsulotlar yo‘q.</p>`;
    return;
  }
  adminCustomList.innerHTML = products.map(p=>{
    const catLbl = categoryLabel[p.category] || p.category || "";
    return `
      <div class="admin-product-row">
        <div>
          <div>${p.name}</div>
          <div style="font-size:11px;color:var(--muted);">
            ${catLbl} · ${formatPrice(p.price)} so‘m
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ============================
   ADMIN BUYURTMALAR UI
============================ */
function renderAdminOrders(list){
  if(!adminOrdersList) return;
  if(!list.length){
    adminOrdersList.innerHTML = `<p style="font-size:13px;color:var(--muted);padding:8px;">
      Hozircha buyurtmalar yo‘q.
    </p>`;
    return;
  }

  adminOrdersList.innerHTML = list.map(order=>{
    const statusLabel = getStatusLabel(order.status);
    const statusClass  = getStatusClass(order.status);
    const steps = ["pending","confirmed","courier","delivered"];

    return `
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">#${order.id.slice(-6)}</div>
            <div class="order-date">${order.createdAtText || ""}</div>
          </div>
          <div class="order-total">${formatPrice(order.total)} so‘m</div>
        </header>

        <div class="order-items">
          <div>
            ${order.items.map(it=>`• ${it.qty}× ${it.name}`).join("<br>")}
          </div>
        </div>

        <div class="progress-wrap">
          <div class="progress-label">
            Holat: <span class="status-pill ${statusClass}">${statusLabel}</span>
          </div>
          <div class="progress-line">
            <div class="progress-fill" style="width:${getStatusPercent(order.status)}%"></div>
          </div>
          <div class="progress-steps">
            ${steps.map(s=>`
              <span class="progress-step ${isStatusReached(order.status,s)?"active":""}">
                ${getStatusShort(s)}
              </span>
            `).join("")}
          </div>
        </div>

        <footer class="order-footer">
          <div>
            ${order.customer ? renderOrderCustomerSmall(order.customer) : ""}
            ${order.comment ? `<div style="margin-top:4px;">💬 ${order.comment}</div>`:""}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
            ${order.location ? `
              <button class="btn-xs btn-xs-primary" onclick="openOrderMap('${order.id}')">
                📍 Marshrut
              </button>` : ""}

            <div style="display:flex;gap:4px;margin-top:4px;">
              <button class="btn-xs btn-xs-primary" onclick="changeOrderStatus('${order.id}','confirmed')">✅ Tasdiqlash</button>
              <button class="btn-xs btn-xs-secondary" onclick="changeOrderStatus('${order.id}','courier')">🚗 Kuryerda</button>
              <button class="btn-xs btn-xs-primary" onclick="changeOrderStatus('${order.id}','delivered')">📦 Yetkazildi</button>
              <button class="btn-xs btn-xs-danger" onclick="changeOrderStatus('${order.id}','rejected')">❌ Bekor</button>
            </div>
          </div>
        </footer>
      </article>
    `;
  }).join("");
}

function renderOrderCustomerSmall(c){
  let s = "";
  if(c.name) s += "👤 " + c.name + "<br>";
  if(c.phone) s += "📞 " + c.phone + "<br>";
  if(c.phone2) s += "📞 " + c.phone2 + "<br>";
  if(c.address) s += "📍 " + c.address;
  if(c.landmark) s += " (" + c.landmark + ")";
  return `<div style="font-size:12px;">${s}</div>`;
}

/* MIJOZ BUYURTMALARI UI */
function renderClientOrders(list){
  if(!clientOrdersList) return;
  if(!list.length){
    clientOrdersList.innerHTML = `<p style="font-size:13px;color:var(--muted);padding:8px;">
      Siz hali buyurtma bermagansiz.
    </p>`;
    return;
  }

  clientOrdersList.innerHTML = list.map(order=>{
    const statusLabel = getStatusLabel(order.status);
    const statusClass = getStatusClass(order.status);
    const steps = ["pending","confirmed","courier","delivered"];
    return `
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">#${order.id.slice(-6)}</div>
            <div class="order-date">${order.createdAtText || ""}</div>
          </div>
          <div class="order-total">${formatPrice(order.total)} so‘m</div>
        </header>

        <div class="order-items">
          <div>${order.items.map(it=>`• ${it.qty}× ${it.name}`).join("<br>")}</div>
        </div>

        <div class="progress-wrap">
          <div class="progress-label">
            Holat: <span class="status-pill ${statusClass}">${statusLabel}</span>
          </div>
          <div class="progress-line">
            <div class="progress-fill" style="width:${getStatusPercent(order.status)}%"></div>
          </div>
          <div class="progress-steps">
            ${steps.map(s=>`
              <span class="progress-step ${isStatusReached(order.status,s)?"active":""}">
                ${getStatusShort(s)}
              </span>
            `).join("")}
          </div>
        </div>

        ${order.location ? `
          <div style="margin-top:6px;">
            <button class="btn-xs btn-xs-primary" onclick="openOrderMap('${order.id}')">
              📍 Marshrutni Google Maps’da ochish
            </button>
          </div>` : ""}
      </article>
    `;
  }).join("");
}

/* STATUS HELPERS */
function getStatusLabel(st){
  switch(st){
    case "confirmed": return "Tasdiqlandi";
    case "courier":   return "Kuryerda";
    case "delivered": return "Yetkazildi";
    case "rejected":  return "Bekor qilingan";
    default:          return "Yangi";
  }
}
function getStatusClass(st){
  switch(st){
    case "confirmed": return "status-confirmed";
    case "courier":   return "status-courier";
    case "delivered": return "status-delivered";
    case "rejected":  return "status-rejected";
    default:          return "status-pending";
  }
}
function getStatusPercent(st){
  switch(st){
    case "confirmed": return 35;
    case "courier":   return 65;
    case "delivered": return 100;
    case "rejected":  return 100;
    default:          return 15;
  }
}
function isStatusReached(current, step){
  const order = ["pending","confirmed","courier","delivered","rejected"];
  const ci = order.indexOf(current);
  const si = order.indexOf(step);
  if(current==="rejected") return true;
  return ci >= si;
}
function getStatusShort(st){
  switch(st){
    case "pending":   return "Yangi";
    case "confirmed": return "Tasdiq";
    case "courier":   return "Kuryer";
    case "delivered": return "Yetdi";
    case "rejected":  return "Bekor";
    default:          return st;
  }
}

/* ADMIN HARAKATLARI */
async function changeOrderStatus(orderId,status){
  try{
    await updateDoc(doc(colOrders,orderId),{
      status,
      statusUpdatedAt: serverTimestamp(),
    });
    showToast("Holat yangilandi");
  }catch(e){
    console.error(e);
    showToast("Xato: holat yangilanmadi");
  }
}

function openOrderMap(orderId){
  const ord = adminOrdersCache.find(o=>o.id===orderId)
    || null;
  if(!ord || !ord.location || ord.location.lat==null) {
    alert("Bu buyurtma uchun lokatsiya saqlanmagan.");
    return;
  }
  const {lat,lng} = ord.location;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url,"_blank");
}

/* ============================
   GEOLOCATION (GPS)
============================ */
function getCurrentLocationOnce(timeoutMs=8000){
  return new Promise(resolve=>{
    if(!("geolocation" in navigator)){
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || null,
        });
      },
      err=>{
        console.log("Geo error",err);
        resolve(null);
      },
      {enableHighAccuracy:true,timeout:timeoutMs,maximumAge:0}
    );
  });
}

/* ============================
   BUYURTMA JO‘NATISH
============================ */
async function sendOrder(){
  if(!cart.length){
    showToast("Savat bo‘sh");
    return;
  }
  if(!customerInfo){
    alert("Avval mijoz ma’lumotlarini kiriting.");
    editCustomerInfo();
    if(!customerInfo) return;
  }

  const note = prompt("Buyurtmaga qo‘shimcha izoh qo‘shasizmi? (ixtiyoriy)", "") || "";

  alert("Iltimos, telefoningizdagi GPS/joylashuv ruxsatini yoqib qo‘ying. Kuryer sizni aniqroq topa oladi. Buyurtma baribir qabul qilinadi.");

  const location = await getCurrentLocationOnce().catch(()=>null);

  const items = cart.map(it=>({
    productId: it.id,
    name: it.name,
    qty: it.qty,
    price: it.price,
    category: it.category,
    tag: it.tag || "",
  }));
  const {total} = getCartTotals();
  const now = new Date();
  const timeText = now.toLocaleString("uz-UZ");

  const orderDoc = {
    clientKey: clientId,
    items,
    total,
    status: "pending",
    createdAt: serverTimestamp(),
    createdAtText: timeText,
    customer: customerInfo,
    comment: note,
    location: location || null,
  };

  try{
    await addDoc(colOrders, orderDoc);
    cart = [];
    saveCart();
    toggleCartSheet(false);
    showToast("Buyurtmangiz qabul qilindi ✅");
  }catch(e){
    console.error(e);
    showToast("Xato: buyurtma jo‘natilmadi");
  }
}

/* ============================
   ADMIN – KATEGORIYA / MAHSULOT QO‘SHISH
============================ */
async function saveCategory(){
  if(!isAdmin){
    showToast("Faqat admin kategoriya qo‘shishi mumkin");
    return;
  }
  const code  = adminCatCode.value.trim();
  const label = adminCatLabel.value.trim();
  const emoji = adminCatEmoji.value.trim() || "💄";

  if(!code || !label){
    showToast("Kod va nom shart");
    return;
  }
  try{
    await addDoc(colCategories,{
      code,label,emoji,
      createdAt: serverTimestamp()
    });
    adminCatCode.value = "";
    adminCatLabel.value = "";
    adminCatEmoji.value = "";
    showToast("Kategoriya saqlandi");
  }catch(e){
    console.error(e);
    showToast("Xato: kategoriya saqlanmadi");
  }
}

async function addCustomProduct(){
  if(!isAdmin){
    showToast("Faqat admin mahsulot qo‘shishi mumkin");
    return;
  }

  const name   = adminName.value.trim();
  const cat    = adminCategorySel.value;
  const pBase  = Number(adminPriceBase.value || 0);
  const hasDisc = adminHasDiscount.checked;
  const pDisc  = Number(adminPriceDiscount.value || 0);
  const tag    = adminTag.value.trim();
  const desc   = adminDescription.value.trim();
  const images = adminImages.value.split(",").map(s=>s.trim()).filter(Boolean);

  const price = hasDisc && pDisc>0 ? pDisc : pBase;

  if(!name || !cat || !price){
    showToast("Nomi, kategoriya va narx majburiy");
    return;
  }

  try{
    await addDoc(colProducts,{
      name,
      category: cat,
      price,
      oldPrice: hasDisc ? pBase : null,
      hasDiscount: hasDisc,
      tag,
      description: desc,
      images,
      active:true,
      createdAt: serverTimestamp()
    });

    adminName.value = "";
    adminPriceBase.value = "";
    adminHasDiscount.checked = false;
    adminPriceDiscount.value = "";
    adminTag.value = "";
    adminDescription.value = "";
    adminImages.value = "";

    showToast("Mahsulot qo‘shildi");
  }catch(e){
    console.error(e);
    showToast("Xato: mahsulot qo‘shilmadi");
  }
}

/* ============================
   PRODUCT DETAIL (UZUM STYLE)
============================ */
function clearDetailCountdown(){ /* hozircha taymer yo‘q */ }

function getDetailImages(){
  const p = products[detailIndex];
  if(!p) return ["https://via.placeholder.com/800x600?text=Beauty+Store"];
  const imgs = Array.isArray(p.images) && p.images.length ? p.images : [
    "https://via.placeholder.com/800x600?text=Beauty+Store"
  ];
  return imgs;
}

function renderDetailImage(){
  const p = products[detailIndex];
  if(!p) return;
  const imgs = getDetailImages();
  if(detailImageIndex >= imgs.length) detailImageIndex = 0;
  if(detailImageIndex < 0) detailImageIndex = imgs.length-1;

  detailImageEl.src = imgs[detailImageIndex];
  detailImageEl.alt = p.name;
  if(imgs.length>1){
    detailImageIndexEl.textContent = `${detailImageIndex+1} / ${imgs.length}`;
    detailImageIndexEl.classList.remove("hidden");
  }else{
    detailImageIndexEl.textContent = "";
    detailImageIndexEl.classList.add("hidden");
  }
}

function setImageFullscreen(on){
  const card = $q(".detail-card");
  if(!card) return;
  isImageFullscreen = !!on;
  card.classList.toggle("image-fullscreen", isImageFullscreen);
  if(detailCloseBtn){
    detailCloseBtn.textContent = isImageFullscreen ? "✕ Yopish" : "✕";
  }
}

function toggleImageFullscreen(){
  setImageFullscreen(!isImageFullscreen);
}

function openProductDetail(index){
  const p = products[index];
  if(!p) return;

  detailIndex      = index;
  detailImageIndex = 0;
  detailQty        = 1;
  clearDetailCountdown();
  setImageFullscreen(false);

  const catLbl = categoryLabel[p.category] || p.category || "Kategoriya";

  renderDetailImage();
  detailCategoryEl.textContent = catLbl;
  detailNameEl.textContent     = p.name;
  detailTagEl.textContent      = p.tag ? "💡 " + p.tag : "";
  detailDescEl.textContent =
    p.description && p.description.trim().length
      ? p.description
      : "Bu mahsulot siz uchun tanlangan.";

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
  setImageFullscreen(false);
  productDetailOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  detailIndex = null;
}

/* DETAIL EVENTLAR */
if(detailPrevBtn){
  detailPrevBtn.addEventListener("click", (e)=>{
    e.stopPropagation();
    detailImageIndex--;
    renderDetailImage();
  });
}
if(detailNextBtn){
  detailNextBtn.addEventListener("click", (e)=>{
    e.stopPropagation();
    detailImageIndex++;
    renderDetailImage();
  });
}
if(detailQtyMinus){
  detailQtyMinus.addEventListener("click", (e)=>{
    e.stopPropagation();
    if(detailQty>1){
      detailQty--;
      detailQtyValue.textContent = detailQty;
    }
  });
}
if(detailQtyPlus){
  detailQtyPlus.addEventListener("click", (e)=>{
    e.stopPropagation();
    detailQty++;
    detailQtyValue.textContent = detailQty;
  });
}
if(detailAddBtn){
  detailAddBtn.addEventListener("click", (e)=>{
    e.stopPropagation();
    const p = products[detailIndex];
    if(!p) return;
    addToCart(p,detailQty);
    detailAddBtn.classList.add("added");
    detailAddBtn.textContent = "✅ Savatga qo‘shildi";
  });
}
if(detailBackBtn){
  detailBackBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    closeProductDetail();
  });
}
if(productDetailOverlay){
  productDetailOverlay.addEventListener("click",(e)=>{
    if(e.target === productDetailOverlay){
      closeProductDetail();
    }
  });
}
if(detailCloseBtn){
  detailCloseBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    if(isImageFullscreen){
      setImageFullscreen(false);
    }else{
      closeProductDetail();
    }
  });
}
if(detailImgWrap){
  detailImgWrap.addEventListener("click",(e)=>{
    e.stopPropagation();
    toggleImageFullscreen();
  });
}

/* ============================
   TABS / ADMIN ACCESS / THEME
============================ */
if(tabsNav){
  tabsNav.addEventListener("click",(e)=>{
    const btn = e.target.closest(".tab-btn");
    if(!btn) return;
    const pageId = btn.getAttribute("data-page");
    tabsNav.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    [shopPage,ordersPage,adminPage].forEach(sec=>{
      if(!sec) return;
      sec.classList.add("hidden");
    });
    if(pageId==="shopPage") shopPage.classList.remove("hidden");
    if(pageId==="ordersPage") ordersPage.classList.remove("hidden");
    if(pageId==="adminPage") adminPage.classList.remove("hidden");
  });
}

if(adminAccessBtn){
  adminAccessBtn.addEventListener("click",()=>{
    const code = prompt("Admin parolini kiriting:");
    if(code === null) return;
    if(code === ADMIN_PASS){
      isAdmin = true;
      localStorage.setItem(LS_ADMIN_KEY,"1");
      if(adminTabBtn) adminTabBtn.classList.remove("hidden");
      showToast("Admin rejimi yoqildi");
      subscribeAdminOrders();
    }else{
      showToast("Parol noto‘g‘ri");
    }
  });
}

if(themeToggleBtn){
  themeToggleBtn.addEventListener("click",()=>{
    document.body.classList.toggle("theme-dark");
    const theme = document.body.classList.contains("theme-dark") ? "dark" : "light";
    localStorage.setItem(LS_THEME_KEY, theme);
    updateThemeIcon();
  });
}

/* CART SHEET OVERLAY */
if(cartSheetOverlay){
  cartSheetOverlay.addEventListener("click",()=>toggleCartSheet(false));
}

/* QIDIRUV */
if(searchInput){
  searchInput.addEventListener("input", ()=>{
    renderProductsGrid();
  });
}

/* ============================
   INIT
============================ */
function init(){
  clientId = generateClientId();
  applySavedTheme();
  loadCart();
  loadCustomerInfo();

  const adminOn = localStorage.getItem(LS_ADMIN_KEY)==="1";
  if(adminOn){
    isAdmin = true;
    if(adminTabBtn) adminTabBtn.classList.remove("hidden");
    subscribeAdminOrders();
  }
  subscribeClientOrders();
}

init();

/* ============================
   GLOBALGA EXPORT QILINADIGAN 
   FUNKSIYALAR (index.html uchun)
============================ */
window.toggleCartSheet   = toggleCartSheet;
window.sendOrder         = sendOrder;
window.editCustomerInfo  = editCustomerInfo;
window.resetCustomerInfo = resetCustomerInfo;
window.saveCategory      = saveCategory;
window.addCustomProduct  = addCustomProduct;
window.changeOrderStatus = changeOrderStatus;
window.openOrderMap      = openOrderMap;
