
// =============================================
// products.js — ByteBloom / MealKit Việt
// =============================================

const CATEGORIES = {
  "com":     "🍚 Cơm",
  "bun-mi":  "🍜 Bún & Mì",
  "healthy": "🥗 Healthy",
  "xao":     "🥘 Món Xào",
  "combo":   "🎁 Combo"
};

let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');

// ── Load JSON ──────────────────────────────
async function loadProducts() {
  const res = await fetch('/data/products.json');
  const { products } = await res.json();
  return products;
}

// ── Format ────────────────────────────────
function formatPrice(p) {
  return p.toLocaleString('vi-VN') + ' đ';
}

function renderTag(tag) {
  const colors = {
    "bán chạy":  "#e74c3c",
    "phổ biến":  "#27ae60",
    "eat clean": "#2980b9",
    "combo":     "#8e44ad",
    "cao cấp":   "#d35400",
    "tiết kiệm": "#16a085"
  };
  const color = colors[tag] || "#555";
  return `<span class="product-tag" style="background:${color}">${tag}</span>`;
}

// ── Render card ───────────────────────────
function renderCard(p) {
  const tags = (p.tags || []).map(renderTag).join('');
  const time = p.time ? `⏱ ${p.time} phút` : '';
  const inCart = cart.find(c => c.id === p.id);
  return `
    <div class="product-card" data-category="${p.category}" data-id="${p.id}">
      <div class="product-img-wrap">

<img src="${p.imageUrl || ('/images/products/' + p.image)}" alt="${p.name}"
     loading="lazy" onerror="this.onerror=null; this.src='/images/placeholder.jpg'">
        <div class="product-tags">${tags}</div>
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-meta">
          <span>👥 ${p.serves} người</span>
          ${time ? `<span>${time}</span>` : ''}
        </div>
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="btn-add ${inCart ? 'in-cart' : ''}"
                  onclick="addToCart(${p.id})"
                  id="btn-${p.id}">
            ${inCart ? '✓ Đã thêm' : 'Thêm vào giỏ'}
          </button>
        </div>
      </div>
    </div>`;
}

// ── Giỏ hàng ──────────────────────────────
function addToCart(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();

  // Đổi trạng thái nút
  const btn = document.getElementById(`btn-${id}`);
  if (btn) {
    btn.textContent = '✓ Đã thêm';
    btn.classList.add('in-cart');
  }

  // Toast thông báo
  showToast(`Đã thêm "${product.name}" vào giỏ!`);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) {
    const total = cart.reduce((s, c) => s + c.qty, 0);
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; background:#2d6a4f; color:#fff;
      padding:12px 20px; border-radius:10px; font-size:14px; font-weight:600;
      box-shadow:0 4px 16px rgba(0,0,0,.2); z-index:9999;
      transition:opacity .3s; opacity:0;`;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── Filter & Search ───────────────────────
function getFilteredProducts() {
  let list = [...allProducts];

  // Search
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  if (q) list = list.filter(p =>
    p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  );

  // Price range
  const maxPrice = parseInt(document.getElementById('priceRange')?.value || 999999);
  list = list.filter(p => p.price <= maxPrice);

  // Cook time
  const cooktime = document.querySelector('input[name="cooktime"]:checked')?.value || 'all';
  if (cooktime === '15') list = list.filter(p => p.time && p.time <= 15);
  else if (cooktime === '30') list = list.filter(p => p.time && p.time > 15 && p.time <= 30);
  else if (cooktime === '60') list = list.filter(p => p.time && p.time > 30 && p.time <= 60);

  // Servings
  const serving = document.querySelector('.serving-btn.active')?.dataset.serving || 'all';
  if (serving !== 'all') list = list.filter(p => p.serves == serving);

  // Sort
  const sort = document.getElementById('sortSelect')?.value || 'default';
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'time-asc') list.sort((a, b) => (a.time || 99) - (b.time || 99));

  return list;
}

function renderProducts() {
  const list = getFilteredProducts();
  const grid = document.getElementById('products-grid');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('productsCount');

  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
  } else {
    grid.innerHTML = list.map(renderCard).join('');
    if (empty) empty.style.display = 'none';
  }

  if (count) count.innerHTML = `Hiển thị <strong>${list.length}</strong> món`;
}

// ── Tab filter trên toolbar ───────────────
function renderCategoryTabs() {
  const wrap = document.getElementById('product-filters');
  if (!wrap) return;

  const cats = [...new Set(allProducts.map(p => p.category))];
  const btns = cats.map(c =>
    `<button class="filter-btn" data-cat="${c}" onclick="filterByTab('${c}')">${CATEGORIES[c] || c}</button>`
  ).join('');
  wrap.innerHTML = `<button class="filter-btn active" data-cat="all" onclick="filterByTab('all')">🍽 Tất cả</button>${btns}`;
}

function filterByTab(cat) {
  document.querySelectorAll('#product-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
  });
  const visible = [...document.querySelectorAll('.product-card')].filter(c => c.style.display !== 'none').length;
  const count = document.getElementById('productsCount');
  if (count) count.innerHTML = `Hiển thị <strong>${visible}</strong> món`;
}

// ── Reset ─────────────────────────────────
function resetAllFilters() {
  const search = document.getElementById('searchInput');
  if (search) search.value = '';
  const price = document.getElementById('priceRange');
  if (price) { price.value = 500000; document.getElementById('priceLabel').textContent = '500,000đ'; }
  document.querySelectorAll('input[name="cooktime"]')[0]?.click();
  document.querySelector('.serving-btn[data-serving="all"]')?.click();
  document.getElementById('sortSelect').value = 'default';
  renderProducts();
}

// ── Init ──────────────────────────────────
async function initProductsPage() {
  allProducts = await loadProducts();
  renderCategoryTabs();
  renderProducts();
  updateCartBadge();

  // Gắn sự kiện filter
  document.getElementById('searchInput')?.addEventListener('input', renderProducts);
  document.getElementById('priceRange')?.addEventListener('input', function () {
    document.getElementById('priceLabel').textContent = parseInt(this.value).toLocaleString('vi-VN') + 'đ';
    renderProducts();
  });
  document.getElementById('sortSelect')?.addEventListener('change', renderProducts);
  document.getElementById('resetFilters')?.addEventListener('click', resetAllFilters);

  document.querySelectorAll('input[name="cooktime"]').forEach(r =>
    r.addEventListener('change', renderProducts));

  document.querySelectorAll('.serving-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.serving-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderProducts();
    });
  });

  // Mobile filter toggle
  document.getElementById('mobileFilterBtn')?.addEventListener('click', () => {
    document.getElementById('filtersSidebar')?.classList.toggle('open');
  });

  // View toggle (grid / list)
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const grid = document.getElementById('products-grid');
      if (grid) grid.dataset.view = this.dataset.view;
    });
  });
}

document.addEventListener('DOMContentLoaded', initProductsPage);
