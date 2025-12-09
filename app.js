// app.js — EVOS uslubidagi Telegram WebApp UI logikasi

// Telegram WebApp obyektini olamiz (agar Telegram ichida bo'lsa)
const tg =
  window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

// Global holat (state)
const state = {
  products: [],
  filteredCategory: 'all', // 'all' yoki konkret kategoriya nomi
  cart: [],
  selectedProduct: null,
  selectedVariantId: null,
  quantity: 1,
};

// DOM elementlar
const productListEl = document.getElementById('productList');
const categoryTabsEl = document.getElementById('categoryTabs');
const cartBarEl = document.getElementById('cartBar');
const cartSummaryTextEl = document.getElementById('cartSummaryText');
const cartButtonEl = document.getElementById('cartButton');

const modalBackdropEl = document.getElementById('productModalBackdrop');
const modalSheetEl = document.getElementById('productModalSheet');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalImageEl = document.getElementById('modalImage');
const modalTitleEl = document.getElementById('modalTitle');
const modalDescriptionEl = document.getElementById('modalDescription');
const modalVariantContainerEl = document.getElementById('modalVariantContainer');
const modalVariantListEl = document.getElementById('modalVariantList');
const qtyMinusBtn = document.getElementById('qtyMinusBtn');
const qtyPlusBtn = document.getElementById('qtyPlusBtn');
const qtyValueEl = document.getElementById('qtyValue');
const modalPriceEl = document.getElementById('modalPrice');
const addToCartBtn = document.getElementById('addToCartBtn');

/**
 * MOCK mahsulotlar
 * Keyin bularni Firestore’dan keladigan haqiqiy ma’lumot bilan almashtirasiz.
 */
const MOCK_PRODUCTS = [
  {
    id: 'burger_big',
    name: 'Big EVOS burger',
    description: 'Mol go‘shti, pishloq, salat va maxsus sous.',
    category: 'Burgerlar',
    basePrice: 28000,
    image: 'images/big-burger.jpg',
    variants: [
      { id: 'single', name: 'Single', price: 28000 },
      { id: 'combo', name: 'Kombo', price: 42000 },
    ],
  },
  {
    id: 'lavash_cheese',
    name: 'Lavash Cheese',
    description: 'Pishloqli lavash, issiq holda yetkazib beriladi.',
    category: 'Lavashlar',
    basePrice: 26000,
    image: 'images/lavash-cheese.jpg',
    variants: [
      { id: 'classic', name: 'Klassik', price: 26000 },
      { id: 'spicy', name: 'Achchiq', price: 27000 },
    ],
  },
  {
    id: 'fries_big',
    name: 'Katta fri',
    description: 'Tashqi tomoni qarsildoq, ichi yumshoq kartoshka fri.',
    category: 'Snacks',
    basePrice: 14000,
    image: 'images/fries-big.jpg',
    variants: [],
  },
  {
    id: 'cola_05',
    name: 'Coca-Cola 0.5L',
    description: 'Muzdek gazli ichimlik.',
    category: 'Ichimliklar',
    basePrice: 10000,
    image: 'images/cola-05.jpg',
    variants: [
      { id: 'cola', name: 'Coca-Cola', price: 10000 },
      { id: 'fanta', name: 'Fanta', price: 10000 },
      { id: 'sprite', name: 'Sprite', price: 10000 },
    ],
  },
];

// Dastur starti
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  showSkeletons();
  setupCartButton();
  setupModalEvents();

  // Hozircha mock ma’lumotdan yuklaymiz
  loadProductsMock();

  // KEYIN SENING FIRESTORE KODING:
  // loadProductsFromFirestore();
}

/**
 * Skeleton loading (Firestore yoki network javobi kelguncha)
 */
function showSkeletons() {
  if (!productListEl) return;
  productListEl.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const card = document.createElement('article');
    card.className = 'product-card skeleton-card';
    card.innerHTML = `
      <div class="skeleton-img shimmer"></div>
      <div class="skeleton-line shimmer"></div>
      <div class="skeleton-line shimmer short"></div>
      <div class="skeleton-line shimmer medium"></div>
    `;
    productListEl.appendChild(card);
  }
}

/**
 * Mock orqali mahsulot yuklash (Firestore o‘rniga)
 */
function loadProductsMock() {
  setTimeout(function () {
    state.products = MOCK_PRODUCTS.slice();
    state.filteredCategory = 'all';
    buildCategoryTabs();
    renderProducts();
  }, 600);
}

/**
 * Agar xohlasang shu funksiyada Firestore’dan yuklaysan:
 *
 * misol uchun:
 *  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
 *  import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
 *
 * keyin:
 *  async function loadProductsFromFirestore() {
 *    const app = initializeApp(firebaseConfig);
 *    const db = getFirestore(app);
 *    const snap = await getDocs(collection(db, "evos_products"));
 *    state.products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 *    state.filteredCategory = 'all';
 *    buildCategoryTabs();
 *    renderProducts();
 *  }
 */

/**
 * Kategoriya tablarini yasash (Barchasi + unik kategoriyalar)
 */
function buildCategoryTabs() {
  if (!categoryTabsEl) return;

  const categoriesSet = new Set();
  state.products.forEach((p) => {
    if (p.category) categoriesSet.add(p.category);
  });

  const categories = ['Barchasi'].concat(Array.from(categoriesSet));

  categoryTabsEl.innerHTML = '';

  categories.forEach((cat) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip';
    chip.textContent = cat;

    const isActive =
      (state.filteredCategory === 'all' && cat === 'Barchasi') ||
      state.filteredCategory === cat;
    if (isActive) {
      chip.classList.add('active');
    }

    chip.addEventListener('click', () => {
      state.filteredCategory = cat === 'Barchasi' ? 'all' : cat;
      buildCategoryTabs();
      renderProducts();
    });

    categoryTabsEl.appendChild(chip);
  });
}

/**
 * Mahsulotlar ro‘yxatini chizish
 */
function renderProducts() {
  if (!productListEl) return;

  productListEl.innerHTML = '';

  let list = state.products;
  if (state.filteredCategory !== 'all') {
    list = list.filter((p) => p.category === state.filteredCategory);
  }

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Bu kategoriya bo‘yicha mahsulotlar hozircha yo‘q.';
    productListEl.appendChild(empty);
    return;
  }

  list.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    const variantsHtml =
      product.variants && product.variants.length > 0
        ? `<div class="chip-row">
            ${product.variants
              .map(
                (v) =>
                  `<span class="chip chip-outline">${escapeHtml(v.name)}</span>`
              )
              .join('')}
          </div>`
        : '';

    card.innerHTML = `
      <div class="product-img-wrap">
        <img
          class="product-img"
          src="${product.image}"
          alt="${escapeHtml(product.name)}"
        />
      </div>
      <div class="product-content">
        <h2 class="product-title">${escapeHtml(product.name)}</h2>
        <p class="product-description">${escapeHtml(
          product.description || ''
        )}</p>
        ${variantsHtml}
        <div class="product-footer">
          <div class="product-price">${formatPrice(
            getProductDefaultPrice(product)
          )}</div>
          <button class="btn-primary btn-add" data-product-id="${product.id}">
            Qo‘shish
          </button>
        </div>
      </div>
    `;

    productListEl.appendChild(card);
  });

  // Eventlar: karta bosilganda modal, qo‘shish tugmasi
  productListEl.querySelectorAll('.product-card').forEach((card) => {
    const productId = card.dataset.productId;
    if (!productId) return;

    const product = state.products.find((p) => p.id === productId);
    if (!product) return;

    // Karta bosilganda modal
    card.addEventListener('click', () => {
      openProductModal(product);
    });

    // Qo‘shish tugmasi faqat qo‘shadi, card-click eventini to‘xtatadi
    const addBtn = card.querySelector('.btn-add');
    if (addBtn) {
      addBtn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        const variant = getProductDefaultVariant(product);
        addToCart(product, variant, 1);
      });
    }
  });
}

/* Yordamchi funksiyalar */
function getProductDefaultVariant(product) {
  if (product.variants && product.variants.length > 0) {
    return product.variants[0];
  }
  return null;
}

function getProductDefaultPrice(product) {
  const v = getProductDefaultVariant(product);
  if (v) return v.price;
  return product.basePrice || 0;
}

function formatPrice(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('uz-UZ') + ' so‘m';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* SAVAT (cart) LOGIKASI */
function addToCart(product, variant, quantity) {
  if (!product || !quantity) return;

  const variantId = variant ? variant.id : null;
  const key = product.id + '::' + (variantId || 'default');

  const existing = state.cart.find((item) => item.key === key);

  const pricePerUnit = variant ? variant.price : product.basePrice;

  if (existing) {
    existing.quantity += quantity;
  } else {
    state.cart.push({
      key,
      productId: product.id,
      name: product.name,
      variantId: variantId,
      variantName: variant ? variant.name : '',
      quantity,
      pricePerUnit,
    });
  }

  updateCartBar();
}

function getCartTotalQuantity() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotalAmount() {
  return state.cart.reduce(
    (sum, item) => sum + item.quantity * item.pricePerUnit,
    0
  );
}

function updateCartBar() {
  if (!cartBarEl || !cartSummaryTextEl) return;

  const totalQty = getCartTotalQuantity();
  const totalAmount = getCartTotalAmount();

  if (totalQty === 0) {
    cartBarEl.classList.add('hidden');
    cartSummaryTextEl.textContent = 'Savat bo‘sh';
    return;
  }

  cartBarEl.classList.remove('hidden');
  cartSummaryTextEl.textContent =
    'Savat: ' + totalQty + ' ta · Jami: ' + formatPrice(totalAmount);
}

/* Cart tugmasi — Telegram WebApp’ga ma’lumot yuborish */
function setupCartButton() {
  if (!cartButtonEl) return;
  cartButtonEl.addEventListener('click', () => {
    if (state.cart.length === 0) return;

    const payload = {
      type: 'cart',
      items: state.cart,
      totalQuantity: getCartTotalQuantity(),
      totalAmount: getCartTotalAmount(),
    };

    if (tg && typeof tg.sendData === 'function') {
      tg.sendData(JSON.stringify(payload));
    } else {
      // Oddiy brauzerda test uchun
      alert('Savat:\n' + JSON.stringify(payload, null, 2));
    }
  });
}

/* MODAL (bottom sheet) LOGIKASI */
function setupModalEvents() {
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeProductModal);
  }

  if (modalBackdropEl) {
    modalBackdropEl.addEventListener('click', (evt) => {
      if (evt.target === modalBackdropEl) {
        // Faqat fon bosilganda yopish
        closeProductModal();
      }
    });
  }

  if (qtyMinusBtn) {
    qtyMinusBtn.addEventListener('click', () => {
      if (state.quantity > 1) {
        state.quantity -= 1;
        updateModalQuantityAndPrice();
      }
    });
  }

  if (qtyPlusBtn) {
    qtyPlusBtn.addEventListener('click', () => {
      state.quantity += 1;
      updateModalQuantityAndPrice();
    });
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      if (!state.selectedProduct) return;
      const variant = getSelectedVariant(state.selectedProduct);
      addToCart(state.selectedProduct, variant, state.quantity);
      closeProductModal();
    });
  }
}

function openProductModal(product) {
  state.selectedProduct = product;
  state.quantity = 1;

  const defaultVariant = getProductDefaultVariant(product);
  state.selectedVariantId = defaultVariant ? defaultVariant.id : null;

  if (modalImageEl) {
    modalImageEl.src = product.image;
    modalImageEl.alt = product.name;
  }
  if (modalTitleEl) modalTitleEl.textContent = product.name;
  if (modalDescriptionEl)
    modalDescriptionEl.textContent = product.description || '';

  renderModalVariants(product);
  updateModalQuantityAndPrice();

  if (modalBackdropEl) modalBackdropEl.classList.remove('hidden');
  if (modalSheetEl) modalSheetEl.classList.add('open');
}

function closeProductModal() {
  state.selectedProduct = null;
  state.selectedVariantId = null;
  state.quantity = 1;

  if (modalSheetEl) modalSheetEl.classList.remove('open');
  if (modalBackdropEl) modalBackdropEl.classList.add('hidden');
}

function renderModalVariants(product) {
  if (!modalVariantContainerEl || !modalVariantListEl) return;

  if (!product.variants || product.variants.length === 0) {
    modalVariantContainerEl.classList.add('hidden');
    modalVariantListEl.innerHTML = '';
    return;
  }

  modalVariantContainerEl.classList.remove('hidden');
  modalVariantListEl.innerHTML = '';

  product.variants.forEach((variant) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip chip-outline';
    if (state.selectedVariantId === variant.id) {
      btn.classList.add('chip-filled');
    }
    btn.textContent = variant.name;

    btn.addEventListener('click', () => {
      state.selectedVariantId = variant.id;
      renderModalVariants(product); // aktiv chipni yangilash
      updateModalQuantityAndPrice();
    });

    modalVariantListEl.appendChild(btn);
  });
}

function updateModalQuantityAndPrice() {
  if (!state.selectedProduct) return;

  if (qtyValueEl) {
    qtyValueEl.textContent = String(state.quantity);
  }

  if (modalPriceEl) {
    const variant = getSelectedVariant(state.selectedProduct);
    const unitPrice = variant
      ? variant.price
      : state.selectedProduct.basePrice;
    const total = unitPrice * state.quantity;
    modalPriceEl.textContent = formatPrice(total);
  }
}

function getSelectedVariant(product) {
  if (!product.variants || product.variants.length === 0) return null;
  return (
    product.variants.find((v) => v.id === state.selectedVariantId) ||
    product.variants[0]
  );
}
