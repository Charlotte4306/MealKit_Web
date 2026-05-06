// ============================================
// product-detail.js
// ============================================

// Product catalog (đồng bộ với main.js)
const catalog = [
  { id:1, name:"Bò Xào Rau Củ Đà Lạt", desc:"Thịt bò Úc + rau củ Đà Lạt tươi, sốt hoisin đặc biệt.", price:189000, servings:2, time:25, img:"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&q=80", badge:"Bán chạy" },
  { id:2, name:"Canh Chua Cá Hồi", desc:"Cá hồi Na Uy tươi, me chua Tây Ninh, cà chua bi.", price:245000, servings:4, time:30, img:"https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80", badge:"Mới" },
  { id:3, name:"Đậu Hủ Sốt Cay Hàn Quốc", desc:"Đậu hủ non, nấm kim châm, sốt gochujang nhập khẩu.", price:145000, servings:2, time:20, img:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80", badge:"Chay" },
  { id:4, name:"Gà Rang Muối Ớt Xanh", desc:"Gà ta Hà Nam, muối ớt xanh Tây Nguyên. Giòn ngoài mềm trong.", price:195000, servings:4, time:35, img:"https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80", badge:null },
  { id:5, name:"Salad Gỏi Bưởi Tôm", desc:"Bưởi Năm Roi, tôm sú Cà Mau, rau thơm, nước mắm chua ngọt.", price:168000, servings:2, time:15, img:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", badge:"Nhanh" },
  { id:6, name:"Lẩu Thái Hải Sản", desc:"Tôm, mực, cá viên tươi, nước dùng tom yum thơm cay.", price:385000, servings:4, time:30, img:"https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80", badge:"Cao cấp" },
];

// Lấy product ID từ URL (ví dụ ?id=1), mặc định id=1
const params = new URLSearchParams(window.location.search);
const currentId = parseInt(params.get('id') || '1');
const product = catalog.find(p => p.id === currentId) || catalog[0];

// State
let selectedPrice = product.price;
let qty = 1;
let selectedStar = 0;

// ---- INIT ----
function initPage() {
  document.title = product.name + ' – MealKit Việt';
  const nameEl = document.getElementById('pdName');
  if (nameEl) nameEl.textContent = product.name;
  const descEl = document.getElementById('pdShortDesc');
  if (descEl) descEl.textContent = product.desc;
  const breadEl = document.getElementById('pdBreadcrumb');
  if (breadEl) breadEl.textContent = product.name;
  const badgeEl = document.getElementById('pdBadge');
  if (badgeEl) { badgeEl.textContent = product.badge || ''; badgeEl.style.display = product.badge ? '' : 'none'; }
  updatePriceDisplay();
  renderRelated();
}

function updatePriceDisplay() {
  const fmtPrice = selectedPrice.toLocaleString('vi-VN') + 'đ';
  const pdPrice = document.getElementById('pdPrice');
  if (pdPrice) pdPrice.textContent = fmtPrice;
  const stickyPrice = document.getElementById('stickyPrice');
  if (stickyPrice) stickyPrice.textContent = fmtPrice;
}

// ---- GALLERY ----
function changeImg(btn, src) {
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const mainImg = document.getElementById('mainImg');
  if (mainImg) {
    mainImg.style.opacity = '0';
    setTimeout(() => { mainImg.src = src; mainImg.style.opacity = '1'; }, 200);
  }
}

// ---- WISHLIST ----
function toggleWishlist(btn) {
  btn.classList.toggle('active');
  const isActive = btn.classList.contains('active');
  showToast(isActive ? '❤️ Đã thêm vào yêu thích' : '🤍 Đã bỏ yêu thích');
}

// ---- SERVING SELECTOR ----
function selectServing(btn) {
  document.querySelectorAll('.serving-choice').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedPrice = parseInt(btn.dataset.price);
  updatePriceDisplay();
}

// ---- QTY ----
function changeDetailQty(delta) {
  qty = Math.max(1, qty + delta);
  const el = document.getElementById('detailQty');
  if (el) el.textContent = qty;
}

// ---- ADD TO CART ----
function addDetailToCart() {
  let cartArr = JSON.parse(localStorage.getItem('mealkit_cart') || '[]');
  const existing = cartArr.find(i => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cartArr.push({ id: product.id, name: product.name, price: selectedPrice, qty, img: product.img });
  }
  localStorage.setItem('mealkit_cart', JSON.stringify(cartArr));
  const total = cartArr.reduce((s,i) => s+i.qty, 0);
  document.querySelectorAll('#cartBadge').forEach(el => el.textContent = total);
  showToast('✓ Đã thêm ' + qty + ' gói "' + product.name + '" vào giỏ hàng');
}

// ---- TABS ----
function switchTab(btn) {
  document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pd-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const tabId = 'tab-' + btn.dataset.tab;
  const tabContent = document.getElementById(tabId);
  if (tabContent) tabContent.classList.add('active');
}

// ---- STAR PICKER ----
function pickStar(n) {
  selectedStar = n;
  document.querySelectorAll('.star-pick').forEach((btn, i) => {
    btn.classList.toggle('active', i < n);
  });
}

function submitReview() {
  if (selectedStar === 0) { showToast('Vui lòng chọn số sao!'); return; }
  const text = document.getElementById('reviewText')?.value.trim();
  if (!text) { showToast('Vui lòng nhập nội dung đánh giá!'); return; }
  showToast('🎉 Cảm ơn bạn đã đánh giá!');
  if (document.getElementById('reviewText')) document.getElementById('reviewText').value = '';
  selectedStar = 0;
  document.querySelectorAll('.star-pick').forEach(b => b.classList.remove('active'));
}

// ---- RELATED PRODUCTS ----
function renderRelated() {
  const grid = document.getElementById('relatedGrid');
  if (!grid) return;
  const related = catalog.filter(p => p.id !== product.id).slice(0, 3);
  grid.innerHTML = related.map(p => `
    <article class="product-card">
      <a href="product-detail.html?id=${p.id}" class="product-card__img" style="display:block">
        <img src="${p.img}" alt="${p.name}" width="400" height="300" loading="lazy"/>
        ${p.badge ? '<span class="product-card__badge">'+p.badge+'</span>' : ''}
      </a>
      <div class="product-card__body">
        <h3 class="product-card__name">
          <a href="product-detail.html?id=${p.id}" style="color:inherit">${p.name}</a>
        </h3>
        <p class="product-card__desc">${p.desc}</p>
        <div class="product-card__footer">
          <div class="product-card__price">${p.price.toLocaleString('vi-VN')}đ <span>/ gói</span></div>
          <button class="btn-add" onclick="addToCart(${p.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// ---- STICKY BAR on scroll ----
const heroSection = document.querySelector('.pd-hero');
const stickyBar = document.getElementById('stickyBar');
if (heroSection && stickyBar) {
  window.addEventListener('scroll', () => {
    const heroBottom = heroSection.getBoundingClientRect().bottom;
    stickyBar.style.display = heroBottom < 0 ? 'flex' : 'none';
  }, { passive: true });
}

// ---- START ----
initPage();
