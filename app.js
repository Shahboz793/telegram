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
  orderBy,
  getDocs
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
const couriersCol   = collection(db, "couriers");

// CONSTANTS
const STORAGE_CUSTOMER        = "beauty_customer_info";
const STORAGE_LOCATION        = "beauty_customer_location";
const THEME_KEY               = "beauty_theme";
const CLIENT_ID_KEY           = "beauty_client_id";
const RAW_PREFIX              = "https://raw.githubusercontent.com/hanbek221-design/kosmetika-premium/main/images/";
const LOCAL_ORDERS_BACKUP_KEY = "beauty_orders_history";

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

let adminOrderFilter     = "all";
let clientOrderStatusMap = {};
let clientId             = null;
let clientOrders         = [];
let adminOrders          = [];

// DETAIL OLD SYSTEM REMOVED
let detailIndex              = null;
let detailImageIndex         = 0;
let detailQty                = 1;

// COURIER STATE
let courierSelectedOrderId = null;

// ADMIN COURIERS
let couriers         = [];
let editingCourierId = null;

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
const quickOrderBtn      = document.getElementById("quickOrderBtn");

// OLD DETAIL OVERLAY REMOVED COMPLETELY

// ADMIN FORM DOM
const adminNameEl          = document.getElementById("adminName");
const adminCategoryEl      = document.getElementById("adminCategory");
const adminPriceBaseEl     = document.getElementById("adminPriceBase");
const adminHasDiscountEl   = document.getElementById("adminHasDiscount");
const adminPriceDiscountEl = document.getElementById("adminPriceDiscount");
const adminTagEl           = document.getElementById("adminTag");
const adminDescriptionEl   = document.getElementById("adminDescription");
const adminImagesEl        = document.getElementById("adminImages");

const adminCatCodeEl      = document.getElementById("adminCatCode");
const adminCatLabelEl     = document.getElementById("adminCatLabel");
const adminCatEmojiEl     = document.getElementById("adminCatEmoji");
const adminCategoryListEl = document.getElementById("adminCategoryList");

const clientOrdersListEl = document.getElementById("clientOrdersList");
const adminOrdersListEl  = document.getElementById("adminOrdersList");

// COURIER DOM
const courierOrderSelect = document.getElementById("courierOrderSelect");
const courierMapFrame    = document.getElementById("courierMapFrame");
const courierInfoEl      = document.getElementById("courierInfo");

// COURIER ADMIN DOM
const adminCourierNameEl     = document.getElementById("adminCourierName");
const adminCourierPhoneEl    = document.getElementById("adminCourierPhone");
const adminCourierCarEl      = document.getElementById("adminCourierCar");
const adminCourierPlateEl    = document.getElementById("adminCourierPlate");
const adminCourierLoginEl    = document.getElementById("adminCourierLogin");
const adminCourierPasswordEl = document.getElementById("adminCourierPassword");
const adminCourierSaveBtn    = document.getElementById("adminCourierSaveBtn");
const adminCourierListEl     = document.getElementById("adminCourierList");

// SOUND
const notifySoundEl = document.getElementById("notifySound");


/* HELPERS */
function formatPrice(v){ return (v || 0).toLocaleString("uz-UZ"); }

function showToast(msg, ms=1800){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toastEl.classList.remove("show"), ms);
}

/* LOCATION SYSTEM */
function loadSavedLocation(){
  try{
    const raw = localStorage.getItem(STORAGE_LOCATION);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(typeof obj.lat==="number" && typeof obj.lng==="number") return obj;
  }catch(e){}
  return null;
}

function saveLocation(loc){
  try{ localStorage.setItem(STORAGE_LOCATION, JSON.stringify(loc)); }
  catch(e){}
}

function startLocationCountdown(s){
  let r=s;
  showToast(`📍 Joylashuv aniqlanmoqda... ${r}s`);
  const t=setInterval(()=>{
    r--;
    if(r>0) showToast(`📍 Joylashuv aniqlanmoqda... ${r}s`);
    else clearInterval(t);
  },1000);
}

function getBrowserLocation(timeout=7000){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){
      reject("GPS yo‘q");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos=>{
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          ts: Date.now()
        });
      },
      err=>reject(err),
      { enableHighAccuracy:true, timeout }
    );
  });
}

async function getOrAskLocation(){
  let saved = loadSavedLocation();
  if(saved){
    const ok = confirm(
      "Oldingi joylashuv saqlangan:\n" +
      "Lat: "+saved.lat+"\nLng: "+saved.lng+"\n\nShu joydan foydalanilsinmi?"
    );
    if(ok) return saved;
    localStorage.removeItem(STORAGE_LOCATION);
  }

  if(!confirm("📍 Joylashuv aniqlansinmi?")) return null;

  startLocationCountdown(7);

  try{
    const loc = await getBrowserLocation();
    saveLocation(loc);
    showToast("📍 Joylashuv olindi",1500);
    return loc;
  }catch(e){
    showToast("⚠️ Joylashuv olinmadi",3000);
    return null;
  }
}

/* IMAGE HELPERS */
function normalizeImagesInput(raw){
  if(!raw) return [];
  return raw.split(",")
    .map(x=>x.trim())
    .filter(Boolean)
    .map(x=>{
      if(x.startsWith("http")) return x;
      const clean = x.replace(/\.(png|jpg|jpeg)$/i,"");
      return RAW_PREFIX + clean + ".png";
    });
}

function matchesSearch(p){
  const q = currentSearch;
  if(!q) return true;
  return (
    (p.name||"").toLowerCase().includes(q) ||
    (p.tag||"").toLowerCase().includes(q) ||
    (p.description||"").toLowerCase().includes(q) ||
    (p.category||"").toLowerCase().includes(q)
  );
}

/* CLIENT ID */
function getOrCreateClientId(){
  let cid = localStorage.getItem(CLIENT_ID_KEY);
  if(!cid){
    cid = "c_" + Math.random().toString(36).slice(2);
    localStorage.setItem(CLIENT_ID_KEY, cid);
  }
  return cid;
}

/* CUSTOMER INFO */
function renderCustomerInfo(){
  let info=null;
  try{ info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER)); }catch(e){}
  if(info && info.name && info.phone){
    customerInfoTextEl.textContent =
      `👤 ${info.name} • 📱 ${info.phone}` +
      (info.address ? ` • 📍 ${info.address}`:"");
  }else{
    customerInfoTextEl.textContent =
      "Mijoz ma’lumotlari saqlanmagan.";
  }
}

function promptNewCustomerInfo(){
  const name = prompt("Ismingiz:");
  if(!name) return null;
  const phone = prompt("Telefon:");
  if(!phone) return null;
  const address = prompt("Manzil:");
  if(!address) return null;

  const info = {name,phone,address};
  localStorage.setItem(STORAGE_CUSTOMER, JSON.stringify(info));
  renderCustomerInfo();
  return info;
}

function askCustomerInfo(){
  let info=null;
  try{ info = JSON.parse(localStorage.getItem(STORAGE_CUSTOMER)); }catch(e){}
  if(info && info.name && info.phone && info.address){
    const ok = confirm(
      `Oldingi ma’lumotlar:\n${info.name}\n${info.phone}\n${info.address}\n\nTasdiqlaysizmi?`
    );
    if(ok) return info;
    return promptNewCustomerInfo();
  }
  return promptNewCustomerInfo();
}

function resetCustomerInfo(){
  localStorage.removeItem(STORAGE_CUSTOMER);
  renderCustomerInfo();
  showToast("Ma’lumotlar tozalandi.");
}

function editCustomerInfo(){ promptNewCustomerInfo(); }

/* THEME */
function applyTheme(t){
  document.body.classList.toggle("theme-dark", t==="dark");
  document.body.classList.toggle("theme-light", t==="light");
  themeToggleBtn.textContent = t==="dark" ? "☀️" : "🌙";
}
function toggleTheme(){
  const cur = localStorage.getItem(THEME_KEY) || "dark";
  const next = cur==="dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY,next);
  applyTheme(next);
}
if(themeToggleBtn) themeToggleBtn.onclick = toggleTheme;

/* PRODUCTS */
function rebuildProducts(){
  products = [...remoteProducts];
  renderProducts();
}

function renderProducts(){
  productsGrid.innerHTML = "";
  const list = products.filter(
    p => (activeCategory==="all" || p.category===activeCategory) && matchesSearch(p)
  );

  if(!list.length){
    productsGrid.innerHTML = "<p class='cart-empty'>Mahsulot yo‘q.</p>";
    return;
  }

  list.forEach((p,idx)=>{
    const disc = p.oldPrice && p.oldPrice>p.price
      ? (100 - Math.round(p.price*100/p.oldPrice))
      : null;
    const img = p.images?.[0] || RAW_PREFIX+"noimage.png";

    const base = img.startsWith(RAW_PREFIX)
      ? img.replace(/\.(png|jpg|jpeg)$/i,"")
      : null;

    const imgHtml = base
      ? `<img src="${base}.png"
              onerror="this.onerror=null;this.src='${base}.jpg';">`
      : `<img src="${img}">`;

    const cat = categoryLabel[p.category] || p.category || "";

    productsGrid.innerHTML += `
      <article class="product-card" onclick="openProduct(${idx})">
        <div class="product-img-wrap">
          ${imgHtml}
          ${disc ? `<div class="product-sale">-${disc}%</div>` : ""}
        </div>
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="product-meta">${cat}</div>
          <div class="price-row">
            <div>
              <div class="price-main">${formatPrice(p.price)} so‘m</div>
              ${p.oldPrice?`<div class="price-old">${formatPrice(p.oldPrice)} so‘m</div>`:""}
            </div>
            <button class="btn-add"
                    onclick="event.stopPropagation(); addToCart(${idx});">
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
    const list=[];
    snap.forEach(d=>{
      const x=d.data();
      list.push({
        id:d.id,
        name:x.name||"",
        price:x.price||0,
        oldPrice:x.oldPrice||null,
        category:x.category||"",
        images:Array.isArray(x.images)?x.images:[],
        tag:x.tag||"",
        description:x.description||"",
        createdAt:x.createdAt||null
      });
    });
    remoteProducts = list;
    rebuildProducts();
    renderAdminCustomList();
  });
}

/* CATEGORIES */
function renderCategoryFilter(){
  let h = `
    <button class="chip ${activeCategory==="all"?"active":""}"
            data-category="all">
      ⭐ Barchasi
    </button>
  `;
  categories.forEach(c=>{
    h += `
      <button class="chip ${activeCategory===c.code?"active":""}"
              data-category="${c.code}">
        ${c.emoji} ${c.label}
      </button>
    `;
  });
  filterBar.innerHTML = h;
}

function subscribeCategoriesRealtime(){
  onSnapshot(categoriesCol, snap=>{
    const list=[];
    snap.forEach(d=>{
      const x=d.data();
      list.push({
        id:d.id,
        code:x.code,
        label:x.label,
        emoji:x.emoji
      });
      categoryEmoji[x.code] = x.emoji;
      categoryLabel[x.code] = x.label;
    });
    categories=list;
    renderCategoryFilter();
    updateAdminCategorySelect();
    renderCategoryAdminList();
  });
}

filterBar.onclick = (e)=>{
  const b=e.target.closest(".chip");
  if(!b) return;
  document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  activeCategory = b.dataset.category;
  renderProducts();
};

/* SEARCH */
searchInput.oninput = ()=>{
  currentSearch = searchInput.value.trim().toLowerCase();
  renderProducts();
};

/* CART */
function addToCart(idx,qty=1){
  const f = cart.find(x=>x.index===idx);
  if(f) f.qty+=qty;
  else cart.push({index:idx,qty});
  updateCartUI();
  showToast("Savatga qo‘shildi");
}

function updateCartUI(){
  let c=0,sum=0;
  cart.forEach(i=>{
    const p=products[i.index];
    if(p){
      c+=i.qty;
      sum+=p.price*i.qty;
    }
  });
  cartCountTopEl.textContent=c;
  cartTotalTopEl.textContent=formatPrice(sum)+" so‘m";

  quickOrderBtn.classList.toggle("hidden", c===0);

  if(cartSheet.classList.contains("open")) renderCartItems();
}

function toggleCartSheet(open){
  const st = typeof open==="boolean" ? open : !cartSheet.classList.contains("open");
  cartSheet.classList.toggle("open",st);
  cartSheetOverlay.classList.toggle("show",st);
  if(st) renderCartItems();
}

function renderCartItems(){
  if(cart.length===0){
    cartItemsEl.innerHTML="<p class='cart-empty'>Savat bo‘sh</p>";
    cartSheetTotalEl.textContent="0 so‘m";
    return;
  }
  let h="",sum=0;
  cart.forEach(i=>{
    const p=products[i.index];
    if(!p) return;
    const lt=p.price*i.qty;
    sum+=lt;
    h+=`
      <div class="cart-item-row">
        <div class="cart-item-main">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-meta">${formatPrice(p.price)} so‘m</div>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button onclick="changeQty(${i.index},-1)">-</button>
            <span>${i.qty}</span>
            <button onclick="changeQty(${i.index},1)">+</button>
          </div>
          <div class="cart-item-total">${formatPrice(lt)} so‘m</div>
          <button class="cart-remove" onclick="removeFromCart(${i.index})">✕</button>
        </div>
      </div>
    `;
  });
  cartItemsEl.innerHTML=h;
  cartSheetTotalEl.textContent=formatPrice(sum)+" so‘m";
}

function changeQty(idx,delta){
  const i=cart.find(x=>x.index===idx);
  if(!i) return;
  i.qty+=delta;
  if(i.qty<=0) cart=cart.filter(x=>x.index!==idx);
  updateCartUI();
  renderCartItems();
}

function removeFromCart(idx){
  cart=cart.filter(x=>x.index!==idx);
  updateCartUI();
  renderCartItems();
}

/* ORDER STATUS */
const ORDER_STEPS=["pending","confirmed","courier","delivered"];

function statusLabel(s){
  switch(s){
    case"pending":return"Tasdiqlash kutilmoqda";
    case"confirmed":return"Admin tasdiqladi";
    case"courier":return"Kuryerga berildi";
    case"delivered":return"Yetkazildi";
    case"rejected":return"Bekor qilindi";
  }
}

function statusClass(s){ return `status-pill status-${s}`; }

function progressPercent(s){
  if(s==="rejected") return 0;
  const i=ORDER_STEPS.indexOf(s);
  return i<0?0:((i+1)/ORDER_STEPS.length)*100;
}

function renderProgressHTML(s){
  const pct=progressPercent(s);
  return `
    <div class="progress-wrap">
      <div class="progress-label">${statusLabel(s)}</div>
      <div class="progress-line">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

/* NOTIFY */
function playNotify(){
  try{
    notifySoundEl.currentTime=0;
    notifySoundEl.play().catch(()=>{});
  }catch(e){}
}

function notifyClientStatus(s){
  const map={
    confirmed:"✅ Buyurtma tasdiqlandi",
    courier:"🚚 Buyurtma kuryerga berildi",
    delivered:"🎉 Yetkazildi",
    rejected:"❌ Buyurtma bekor qilindi"
  };
  showToast(map[s] || "Holat yangilandi",2500);
  playNotify();
}

/* CLIENT ORDERS */
function subscribeClientOrders(){
  const qClient = query(ordersCol, where("clientId","==",clientId));

  onSnapshot(qClient, snap=>{
    let list=[];
    let changed=null;

    snap.forEach(d=>{
      const o={id:d.id,...d.data()};
      const prev=clientOrderStatusMap[o.id];
      if(prev && prev!==o.status) changed=o.status;
      clientOrderStatusMap[o.id]=o.status;
      list.push(o);
    });

    list.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    clientOrders=list;

    try{ localStorage.setItem(LOCAL_ORDERS_BACKUP_KEY, JSON.stringify(list)); }
    catch(e){}

    renderClientOrders();

    if(changed) notifyClientStatus(changed);
  });
}

function renderClientOrders(){
  if(!clientOrders.length){
    clientOrdersListEl.innerHTML="<p class='cart-empty'>Buyurtma yo‘q</p>";
    return;
  }
  clientOrdersListEl.innerHTML="";
  clientOrders.forEach(o=>{
    const t=o.createdAt?.seconds
      ? new Date(o.createdAt.seconds*1000).toLocaleString("uz-UZ",{hour12:false})
      :"";
    const items=o.items.map(i=>`<li>${i.name} — ${i.qty} × ${formatPrice(i.price)} so‘m</li>`).join("");

    clientOrdersListEl.innerHTML+=`
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">ID: ${o.id}</div>
            <div class="order-date">${t}</div>
          </div>
          <div class="order-total">${formatPrice(o.totalPrice)} so‘m</div>
        </header>
        <div class="order-status-row">
          <span class="${statusClass(o.status)}">${statusLabel(o.status)}</span>
        </div>
        ${renderProgressHTML(o.status)}
        <section class="order-items">
          <strong>Mahsulotlar:</strong>
          <ul>${items}</ul>
        </section>
      </article>
    `;
  });
}

/* ADMIN ORDERS */
function subscribeAdminOrders(){
  const qAdmin=query(ordersCol,orderBy("createdAt","desc"));
  onSnapshot(qAdmin, snap=>{
    adminOrders=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderAdminOrders();
  });
}

function setAdminOrderFilter(f){
  adminOrderFilter=f;
  renderAdminOrders();
}

function renderAdminOrders(){
  let list=[];
  if(adminOrderFilter==="courier")
    list = adminOrders.filter(o=>o.status==="courier");
  else if(adminOrderFilter==="delivered")
    list = adminOrders.filter(o=>o.status==="delivered");
  else if(adminOrderFilter==="rejected")
    list = adminOrders.filter(o=>o.status==="rejected");
  else
    list = adminOrders.filter(o=>o.status!=="delivered" && o.status!=="rejected");

  adminOrdersListEl.innerHTML=`
    <div class="admin-order-filters">
      <button class="btn-xs ${adminOrderFilter==="all"?"btn-xs-primary":"btn-xs-secondary"}" onclick="setAdminOrderFilter('all')">Faol</button>
      <button class="btn-xs ${adminOrderFilter==="courier"?"btn-xs-primary":"btn-xs-secondary"}" onclick="setAdminOrderFilter('courier')">Kuryerda</button>
      <button class="btn-xs ${adminOrderFilter==="delivered"?"btn-xs-primary":"btn-xs-secondary"}" onclick="setAdminOrderFilter('delivered')">Yetkazilgan</button>
      <button class="btn-xs ${adminOrderFilter==="rejected"?"btn-xs-primary":"btn-xs-secondary"}" onclick="setAdminOrderFilter('rejected')">Bekor qilingan</button>
    </div>
  `;

  if(!list.length){
    adminOrdersListEl.innerHTML+="<p class='cart-empty'>Buyurtmalar yo‘q</p>";
    return;
  }

  list.forEach(o=>{
    const t=o.createdAt?.seconds
      ? new Date(o.createdAt.seconds*1000).toLocaleString("uz-UZ",{hour12:false})
      :"";

    const items=o.items.map(i=>`<li>${i.name} — ${i.qty} × ${formatPrice(i.price)} so‘m</li>`).join("");

    adminOrdersListEl.innerHTML+=`
      <article class="order-card">
        <header class="order-header">
          <div>
            <div class="order-id">${o.id}</div>
            <div class="order-date">${t}</div>
            <div class="order-customer">👤 ${o.customer?.name || "-"}</div>
            <div class="order-customer">📱 ${o.customer?.phone || "-"}</div>
            <div class="order-customer">📍 ${o.customer?.address || "-"}</div>
          </div>
          <div class="order-total">${formatPrice(o.totalPrice)} so‘m</div>
        </header>
        <div class="order-status-row">
          <span class="${statusClass(o.status)}">${statusLabel(o.status)}</span>
        </div>
        ${renderProgressHTML(o.status)}

        <section class="order-items">
          <strong>Mahsulotlar:</strong>
          <ul>${items}</ul>
        </section>

        <div class="admin-order-actions">
          <button class="btn-xs btn-xs-primary"   onclick="updateOrderStatus('${o.id}','confirmed')">Tasdiqlash</button>
          <button class="btn-xs btn-xs-danger"    onclick="updateOrderStatus('${o.id}','rejected')">Bekor qilish</button>
          <button class="btn-xs btn-xs-secondary" onclick="updateOrderStatus('${o.id}','courier')">Kuryerga berish</button>
          <button class="btn-xs btn-xs-primary"   onclick="updateOrderStatus('${o.id}','delivered')">Yetkazildi</button>
          ${o.location ? `
            <button class="btn-xs btn-xs-secondary"
                    onclick="openOrderLocation(${o.location.lat},${o.location.lng})">
              📍 Marshrut
            </button>
          ` : ""}
        </div>
      </article>
    `;
  });
}

/* =========================================================
   ORDER CREATE (BUYURTMA BERISH)
========================================================= */
async function sendOrder(){
  if(cart.length===0){
    showToast("Savat bo‘sh");
    return;
  }

  const customer = askCustomerInfo();
  if(!customer){
    showToast("Ma’lumot to‘liq kiritilmadi");
    return;
  }

  const location = await getOrAskLocation(); // GPS olish
  const items = cart.map(i=>{
    const p = products[i.index];
    return {
      name: p.name,
      qty: i.qty,
      price: p.price
    };
  });

  const totalPrice = items.reduce((s,x)=>s + x.qty*x.price, 0);

  try{
    const ref = await addDoc(ordersCol, {
      clientId,
      customer,
      items,
      totalPrice,
      status: "pending",
      createdAt: serverTimestamp(),
      location
    });
    showToast("Buyurtmangiz qabul qilindi!");
    cart = [];
    updateCartUI();
    toggleCartSheet(false);

  }catch(err){
    console.error(err);
    showToast("Xatolik! Buyurtma yuborilmadi");
  }
}


/* =========================================================
   ORDER STATUS UPDATE (ADMIN)
========================================================= */
async function updateOrderStatus(id, status){
  try{
    await updateDoc(doc(ordersCol, id), { status });
    showToast("Yangilandi");
  }catch(e){
    console.error(e);
    showToast("Xatolik!");
  }
}


/* =========================================================
   CATEGORY CRUD
========================================================= */
function updateAdminCategorySelect(){
  adminCategoryEl.innerHTML = `<option value="">Tanlang</option>`;
  categories.forEach(c=>{
    adminCategoryEl.innerHTML += `<option value="${c.code}">${c.label}</option>`;
  });
}

async function saveCategory(){
  const code  = adminCatCodeEl.value.trim();
  const label = adminCatLabelEl.value.trim();
  const emoji = adminCatEmojiEl.value.trim() || "🏷";

  if(!code || !label){
    showToast("To‘ldiring");
    return;
  }

  try{
    if(editingCategoryId){
      await updateDoc(doc(categoriesCol, editingCategoryId), {
        code, label, emoji
      });
      editingCategoryId = null;
    }else{
      await addDoc(categoriesCol, { code, label, emoji });
    }

    adminCatCodeEl.value = "";
    adminCatLabelEl.value = "";
    adminCatEmojiEl.value = "";
    showToast("Saqlangan");

  }catch(e){
    console.error(e);
    showToast("Xatolik");
  }
}

function renderCategoryAdminList(){
  adminCategoryListEl.innerHTML = "";

  categories.forEach(c=>{
    adminCategoryListEl.innerHTML += `
      <div class="admin-product-row">
        <span>${c.emoji} ${c.label}</span>
        <span>
          <button class="admin-edit-btn" onclick="editCategory('${c.id}')">✏️</button>
          <button class="admin-delete-btn" onclick="deleteCategory('${c.id}')">🗑</button>
        </span>
      </div>
    `;
  });
}

function editCategory(id){
  const c = categories.find(x=>x.id===id);
  if(!c) return;

  adminCatCodeEl.value  = c.code;
  adminCatLabelEl.value = c.label;
  adminCatEmojiEl.value = c.emoji;
  editingCategoryId = id;
}

async function deleteCategory(id){
  if(!confirm("O‘chirsinmi?")) return;
  try{
    await deleteDoc(doc(categoriesCol, id));
    showToast("O‘chirildi");
  }catch(e){
    showToast("Xatolik");
  }
}


/* =========================================================
   PRODUCT CRUD (ADMIN)
========================================================= */
function renderAdminCustomList(){
  const box = document.getElementById("adminCustomList");
  box.innerHTML = "";

  remoteProducts.forEach(p=>{
    box.innerHTML += `
      <div class="admin-product-row">
        <span>${p.name}</span>
        <span>
          <button class="admin-edit-btn" onclick="editProduct('${p.id}')">✏️</button>
          <button class="admin-delete-btn" onclick="deleteProduct('${p.id}')">🗑</button>
        </span>
      </div>
    `;
  });
}

function editProduct(id){
  const p = remoteProducts.find(x=>x.id===id);
  if(!p) return;

  editingProductId = id;

  adminNameEl.value          = p.name;
  adminCategoryEl.value      = p.category;
  adminPriceBaseEl.value     = p.price;
  adminHasDiscountEl.checked = !!p.oldPrice;
  adminPriceDiscountEl.value = p.oldPrice || "";
  adminTagEl.value           = p.tag;
  adminDescriptionEl.value   = p.description;
  adminImagesEl.value        = p.images?.join(", ") || "";
}

async function deleteProduct(id){
  if(!confirm("O‘chirsinmi?")) return;
  try{
    await deleteDoc(doc(productsCol, id));
    showToast("Mahsulot o‘chirildi");
  }catch(e){
    showToast("Xatolik");
  }
}

async function addCustomProduct(){
  const name      = adminNameEl.value.trim();
  const category  = adminCategoryEl.value.trim();
  const basePrice = Number(adminPriceBaseEl.value || 0);
  const hasDisc   = adminHasDiscountEl.checked;
  const oldPrice  = Number(adminPriceDiscountEl.value || 0);
  const tag       = adminTagEl.value.trim();
  const desc      = adminDescriptionEl.value.trim();
  const images    = normalizeImagesInput(adminImagesEl.value.trim());

  if(!name || !category || !basePrice){
    showToast("Majburiy maydonlar");
    return;
  }

  const data = {
    name,
    category,
    price: basePrice,
    oldPrice: hasDisc ? oldPrice : null,
    tag,
    description: desc,
    images,
    createdAt: serverTimestamp()
  };

  try{
    if(editingProductId){
      await updateDoc(doc(productsCol, editingProductId), data);
      editingProductId = null;
    }else{
      await addDoc(productsCol, data);
    }

    adminNameEl.value = "";
    adminCategoryEl.value = "";
    adminPriceBaseEl.value = "";
    adminHasDiscountEl.checked = false;
    adminPriceDiscountEl.value = "";
    adminTagEl.value = "";
    adminDescriptionEl.value = "";
    adminImagesEl.value = "";

    showToast("Mahsulot saqlandi");

  }catch(e){
    console.error(e);
    showToast("Xatolik");
  }
}


/* =========================================================
   GOOGLE MAP MARSHRUT
========================================================= */
function openOrderLocation(lat, lng){
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, "_blank");
}


/* =========================================================
   KURYER PANELI – SIMPLE ADMIN CONNECT
========================================================= */
async function saveCourier(){
  const name  = adminCourierNameEl.value.trim();
  const phone = adminCourierPhoneEl.value.trim();
  const car   = adminCourierCarEl.value.trim();
  const plate = adminCourierPlateEl.value.trim();
  const login = adminCourierLoginEl.value.trim();
  const pass  = adminCourierPasswordEl.value.trim();

  if(!name || !phone || !login || !pass){
    showToast("Majburiy maydonlar");
    return;
  }

  const data = { name, phone, car, plate, login, pass };

  try{
    if(editingCourierId){
      await updateDoc(doc(couriersCol, editingCourierId), data);
      editingCourierId=null;
    }else{
      await addDoc(couriersCol, data);
    }

    adminCourierNameEl.value="";
    adminCourierPhoneEl.value="";
    adminCourierCarEl.value="";
    adminCourierPlateEl.value="";
    adminCourierLoginEl.value="";
    adminCourierPasswordEl.value="";

    showToast("Saqlangan");

  }catch(e){
    console.error(e);
    showToast("Xatolik");
  }
}

async function deleteCourier(id){
  if(!confirm("O‘chirsinmi?")) return;
  try{
    await deleteDoc(doc(couriersCol, id));
    showToast("O‘chirildi");
  }catch(e){
    showToast("Xatolik");
  }
}

function editCourier(id){
  const c = couriers.find(x=>x.id===id);
  if(!c) return;
  editingCourierId=id;

  adminCourierNameEl.value  = c.name;
  adminCourierPhoneEl.value = c.phone;
  adminCourierCarEl.value   = c.car;
  adminCourierPlateEl.value = c.plate;
  adminCourierLoginEl.value = c.login;
  adminCourierPasswordEl.value = c.pass;
}

function subscribeCouriersRealtime(){
  onSnapshot(couriersCol, snap=>{
    couriers = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderCourierListAdmin();
  });
}

function renderCourierListAdmin(){
  adminCourierListEl.innerHTML = "";

  couriers.forEach(c=>{
    adminCourierListEl.innerHTML += `
      <div class="admin-product-row">
        <span>${c.name} — ${c.phone}</span>
        <span>
          <button class="admin-edit-btn" onclick="editCourier('${c.id}')">✏️</button>
          <button class="admin-delete-btn" onclick="deleteCourier('${c.id}')">🗑</button>
        </span>
      </div>
    `;
  });
}


/* =========================================================
   FINISH ORDER PAGE RETURNER
========================================================= */
function finishToOrders(){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  document.getElementById("ordersPage").classList.remove("hidden");
}


/* =========================================================
   PRODUCT OPEN (CALL VIEWER – FUNKSIYA 3-QISMDA)
========================================================= */
function openProduct(i){
  // Bu faqat viewer'ga yuboradi
  openViewer(i);
}

/* =========================================================
   TELEGRAM STYLE FULLSCREEN VIEWER – FINAL VERSION
========================================================= */

let viewerIndex = 0;
let viewerImages = [];
let viewerProduct = null;
let viewerZoom = 1;
let viewerPos = { x: 0, y: 0 };
let viewerDragging = false;
let viewerStart = { x: 0, y: 0 };

const viewerOverlay = document.getElementById("viewerOverlay");
const viewerTrack   = document.getElementById("viewerTrack");
const viewerClose   = document.getElementById("viewerClose");
const viewerIndexEl = document.getElementById("viewerIndex");

const viewerTitle = document.getElementById("viewerTitle");
const viewerPrice = document.getElementById("viewerPrice");
const viewerOld   = document.getElementById("viewerOld");
const viewerAddBtn = document.getElementById("viewerAddBtn");


/* =========================================================
   OPEN VIEWER
========================================================= */
function openViewer(productIndex){
  const product = products[productIndex];
  if(!product || !product.images || product.images.length === 0){
    showToast("Rasm topilmadi");
    return;
  }

  viewerProduct = product;
  viewerImages = product.images;
  viewerIndex = 0;

  buildViewerImages();
  updateViewerData();

  viewerOverlay.classList.add("show");
  viewerOverlay.classList.remove("hidden");

  viewerZoom = 1;
}


/* =========================================================
   BUILD IMAGES
========================================================= */
function buildViewerImages(){
  viewerTrack.innerHTML = "";

  viewerImages.forEach((url, i)=>{
    const img = document.createElement("img");
    img.src = url;
    img.className = "viewer-img";
    img.dataset.i = i;

    // Double tap (zoom)
    img.addEventListener("click", e=>{
      if(viewerZoom === 1){
        viewerZoom = 2;
        img.classList.add("zoomed");
      } else {
        viewerZoom = 1;
        img.classList.remove("zoomed");
        img.style.transform = "";
      }
    });

    // Drag to move
    img.addEventListener("mousedown", dragStart);
    img.addEventListener("mousemove", dragMove);
    img.addEventListener("mouseup", dragEnd);
    img.addEventListener("mouseleave", dragEnd);

    viewerTrack.appendChild(img);
  });

  viewerTrack.style.transform = `translateX(0%)`;
}


/* =========================================================
   UPDATE VIEWER DATA (TITLE, PRICE, INDEX)
========================================================= */
function updateViewerData(){
  viewerIndexEl.textContent = `${viewerIndex+1}/${viewerImages.length}`;

  viewerTitle.textContent = viewerProduct.name;
  viewerPrice.textContent = formatPrice(viewerProduct.price);

  if(viewerProduct.oldPrice){
    viewerOld.textContent = formatPrice(viewerProduct.oldPrice);
    viewerOld.style.display = "block";
  } else {
    viewerOld.style.display = "none";
  }
}


/* =========================================================
   NEXT / PREV
========================================================= */
function viewerNext(){
  if(viewerIndex < viewerImages.length - 1){
    viewerIndex++;
    viewerTrack.style.transform = `translateX(-${viewerIndex * 100}%)`;
    updateViewerData();
  }
}

function viewerPrev(){
  if(viewerIndex > 0){
    viewerIndex--;
    viewerTrack.style.transform = `translateX(-${viewerIndex * 100}%)`;
    updateViewerData();
  }
}


/* =========================================================
   DRAG MOVE (ZOOM MODE)
========================================================= */
function dragStart(e){
  if(viewerZoom === 1) return;
  viewerDragging = true;
  viewerStart.x = e.clientX - viewerPos.x;
  viewerStart.y = e.clientY - viewerPos.y;
}

function dragMove(e){
  if(!viewerDragging || viewerZoom === 1) return;

  viewerPos.x = e.clientX - viewerStart.x;
  viewerPos.y = e.clientY - viewerStart.y;

  const activeImg = viewerTrack.children[viewerIndex];
  activeImg.style.transform = `translate(${viewerPos.x}px, ${viewerPos.y}px) scale(${viewerZoom})`;
}

function dragEnd(){
  viewerDragging = false;
}


/* =========================================================
   SWIPE LEFT/RIGHT — MOBILE
========================================================= */
let touchStartX = 0;

viewerOverlay.addEventListener("touchstart", e=>{
  touchStartX = e.touches[0].clientX;
}, {passive:true});

viewerOverlay.addEventListener("touchend", e=>{
  const end = e.changedTouches[0].clientX;
  const diff = end - touchStartX;

  if(Math.abs(diff) > 60){
    if(diff < 0) viewerNext();
    else viewerPrev();
  }
}, {passive:true});


/* =========================================================
   ADD TO CART FROM VIEWER
========================================================= */
viewerAddBtn.addEventListener("click", ()=>{
  addToCart(viewerProduct.index);
  showToast("Savatga qo‘shildi");
});


/* =========================================================
   CLOSE VIEWER
========================================================= */
viewerClose.addEventListener("click", ()=>{
  viewerOverlay.classList.add("hidden");
  viewerOverlay.classList.remove("show");
});


/* =========================================================
   GLOBAL EXPORT (HTML BUTTONLAR ISHLASHI UCHUN)
========================================================= */
window.openProduct = openProduct;
window.openViewer  = openViewer;
window.viewerNext  = viewerNext;
window.viewerPrev  = viewerPrev;


/* =========================================================
   INIT — HAMMA NARSA ISHGA TUSHADI
========================================================= */
function init(){
  loadClientId();
  subscribeProducts();
  subscribeCategories();
  subscribeOrdersRealtime();
  subscribeCouriersRealtime();
  restoreCustomerInfo();

  document.getElementById("searchInput")
    .addEventListener("input", e => filterProducts(e.target.value));

  themeInit();
}

init();
