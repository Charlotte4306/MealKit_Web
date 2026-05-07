
// =============================================
// products-render.js — ByteBloom Meal Kit
// Gọi file này trong products.html:
// <script src="/js/products-render.js"></script>
// =============================================

const CATEGORIES = {
  "com":     "🍚 Cơm",
  "bun-mi":  "🍜 Bún & Mì",
  "healthy": "🥗 Healthy",
  "xao":     "🥘 Món Xào",
  "combo":   "🎁 Combo"
};

async function loadProducts() {
  const res = await fetch('/data/products.json');
  const { products } = await res.json();
  return products;
}

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

function renderCard(p) {
  const tags = (p.tags || []).map(renderTag).join('');
  const time = p.time ? `⏱ ${p.time} phút` : '';
  return `
    <div class="product-card" data-category="${p.category}">
      <div class="product-img-wrap">
        <img src="/images/products/${p.image}" alt="${p.name}"
             loading="lazy" onerror="this.src='/images/placeholder.jpg'">
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
          <button class="btn-add" onclick="addToCart(${p.id})">Thêm vào giỏ</button>
        </div>
      </div>
    </div>`;
}

function renderFilters(products) {
  const cats = [...new Set(products.map(p => p.category))];
  const btns = cats.map(c =>
    `<button class="filter-btn" data-cat="${c}" onclick="filterProducts('${c}')">${CATEGORIES[c] || c}</button>`
  ).join('');
  return `<button class="filter-btn active" data-cat="all" onclick="filterProducts('all')">🍽 Tất cả</button>${btns}`;
}

function filterProducts(cat) {
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.display = (cat === 'all' || card.dataset.category === cat) ? '' : 'none';
  });
}

async function initProductsPage() {
  const products = await loadProducts();

  const filterEl = document.getElementById('product-filters');
  if (filterEl) filterEl.innerHTML = renderFilters(products);

  const gridEl = document.getElementById('product-grid');
  if (gridEl) gridEl.innerHTML = products.map(renderCard).join('');
}

document.addEventListener('DOMContentLoaded', initProductsPage);
