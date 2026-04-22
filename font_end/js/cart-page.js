// ============================================
// cart-page.js — Cart & Checkout page logic
// ============================================

// Product catalog (dùng chung với main.js)
const productCatalog = [
  { id:1, name:"Bò Xào Rau Củ Đà Lạt", price:189000, img:"https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=200&q=70" },
  { id:2, name:"Canh Chua Cá Hồi", price:245000, img:"https://images.unsplash.com/photo-1547592180-85f173990554?w=200&q=70" },
  { id:3, name:"Đậu Hủ Sốt Cay Hàn Quốc", price:145000, img:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=70" },
  { id:4, name:"Gà Rang Muối Ớt Xanh", price:195000, img:"https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=200&q=70" },
  { id:5, name:"Salad Gỏi Bưởi Tôm", price:168000, img:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=70" },
  { id:6, name:"Lẩu Thái Hải Sản", price:385000, img:"https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=200&q=70" },
];

let discount = 0;
const COUPONS = { 'MEALKIT20': 0.20, 'WELCOME10': 0.10, 'FRESH15': 0.15 };

function fmt(n) { return n.toLocaleString('vi-VN') + 'đ'; }

function getCart() {
  return JSON.parse(localStorage.getItem('mealkit_cart') || '[]');
}
function saveCartData(cart) {
  localStorage.setItem('mealkit_cart', JSON.stringify(cart));
  updateCartBadge();
}

function getSubtotal() {
  return getCart().reduce((s, i) => s + i.price * i.qty, 0);
}
function getShipping() {
  const sub = getSubtotal();
  const express = document.querySelector('input[name="delivery"][value="express"]');
  const expressChecked = express && express.checked;
  return sub >= 300000 || !expressChecked ? (expressChecked ? 20000 : 0) : 20000;
}
function getTotal() {
  const sub = getSubtotal();
  const ship = getShipping();
  return sub + ship - Math.round(sub * discount);
}

// ---------- CART PAGE ----------
function renderCartPage() {
  const cart = getCart();
  const cartContent = document.getElementById('cartContent');
  const cartEmpty = document.getElementById('cartEmpty');
  if (!cartContent) return;

  if (cart.length === 0) {
    cartEmpty && (cartEmpty.style.display = 'flex');
    cartContent.style.display = 'none';
    return;
  }
  cartEmpty && (cartEmpty.style.display = 'none');
  cartContent.style.display = 'grid';

  const itemCount = document.getElementById('itemCount');
  if (itemCount) itemCount.textContent = cart.reduce((s,i) => s+i.qty, 0);

  const list = document.getElementById('cartItemsList');
  if (list) {
    list.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item__img">
          <img src="${item.img}" alt="${item.name}" loading="lazy" />
        </div>
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price-unit">${fmt(item.price)} / gói</div>
        </div>
        <div class="cart-item__controls">
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          </div>
          <div class="cart-item__total">${fmt(item.price * item.qty)}</div>
          <button class="remove-item" onclick="removeItem(${item.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            Xóa
          </button>
        </div>
      </div>
    `).join('');
  }

  updateSummary();
  renderUpsell();
}

function updateSummary() {
  const sub = getSubtotal();
  const disc = Math.round(sub * discount);
  const total = sub - disc;

  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  el('subtotal', fmt(sub));
  el('totalPrice', fmt(total));

  const discLine = document.getElementById('discountLine');
  if (discLine) {
    discLine.style.display = discount > 0 ? 'flex' : 'none';
    el('discountAmount', '-' + fmt(disc));
  }
}

function changeQty(id, delta) {
  let cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCartData(cart);
  renderCartPage();
}

function removeItem(id) {
  let cart = getCart().filter(i => i.id !== id);
  saveCartData(cart);
  renderCartPage();
  showToast('Đã xóa món khỏi giỏ hàng');
}

function renderUpsell() {
  const grid = document.getElementById('upsellGrid');
  if (!grid) return;
  const cartIds = getCart().map(i => i.id);
  const recs = productCatalog.filter(p => !cartIds.includes(p.id)).slice(0, 3);
  grid.innerHTML = recs.map(p => `
    <article class="product-card">
      <div class="product-card__img">
        <img src="${p.img.replace('w=200','w=400')}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${p.name}</h3>
        <div class="product-card__footer">
          <div class="product-card__price">${fmt(p.price)} <span>/ gói</span></div>
          <button class="btn-add" onclick="addToCart(${p.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// Coupon
document.getElementById('applyCoupon')?.addEventListener('click', () => {
  const code = document.getElementById('couponInput')?.value.trim().toUpperCase();
  if (COUPONS[code]) {
    discount = COUPONS[code];
    updateSummary();
    showToast(`✓ Mã "${code}" — giảm ${discount*100}% thành công!`);
  } else {
    showToast('❌ Mã giảm giá không hợp lệ');
  }
});

document.getElementById('clearCartBtn')?.addEventListener('click', () => {
  if (confirm('Xóa tất cả sản phẩm trong giỏ hàng?')) {
    saveCartData([]);
    renderCartPage();
  }
});

// ---------- CHECKOUT PAGE ----------
function renderCheckoutSummary() {
  const cart = getCart();
  const list = document.getElementById('checkoutItemsList');
  if (!list) return;

  list.innerHTML = cart.map(i => `
    <div class="co-item">
      <img src="${i.img}" alt="${i.name}" />
      <span class="co-item__name">${i.name}</span>
      <span class="co-item__qty">x${i.qty}</span>
      <span class="co-item__price">${fmt(i.price * i.qty)}</span>
    </div>
  `).join('');

  // Get discount from cart page (if transferred)
  const savedDiscount = parseFloat(localStorage.getItem('mealkit_discount') || '0');
  discount = savedDiscount;

  const sub = getSubtotal();
  const disc = Math.round(sub * discount);
  const shipping = getShipping();
  const total = sub - disc + shipping;

  const el = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  el('co-subtotal', fmt(sub));
  el('co-total', fmt(total));

  const discLine = document.getElementById('co-discountLine');
  if (discLine) {
    discLine.style.display = discount > 0 ? 'flex' : 'none';
    el('co-discount', '-' + fmt(disc));
  }
}

// Delivery change → update shipping fee
document.querySelectorAll('input[name="delivery"]').forEach(r => {
  r.addEventListener('change', () => {
    const express = r.value === 'express';
    const shippingEl = document.getElementById('co-shipping');
    if (shippingEl) {
      shippingEl.textContent = express ? '+20,000đ' : 'Miễn phí';
      shippingEl.className = express ? 'text-orange' : 'text-green';
    }
    renderCheckoutSummary();
  });
});

// Place order
function placeOrder(e) {
  e.preventDefault();
  let valid = true;

  const fields = [
    ['co-name', 'coNameError', v => v.length >= 2, 'Vui lòng nhập họ tên'],
    ['co-phone', 'coPhoneError', v => /^0[3-9]\d{8}$/.test(v), 'Số điện thoại không hợp lệ'],
    ['co-email', 'coEmailError', v => /^[^@]+@[^@]+\.[^@]+$/.test(v), 'Email không hợp lệ'],
    ['co-address', 'coAddressError', v => v.length >= 5, 'Vui lòng nhập địa chỉ'],
  ];

  fields.forEach(([inputId, errId, validate, msg]) => {
    const input = document.getElementById(inputId);
    const errEl = document.getElementById(errId);
    if (!input) return;
    const val = input.value.trim();
    if (!validate(val)) {
      if (errEl) errEl.textContent = msg;
      input.style.borderColor = '#e53e3e';
      valid = false;
    } else {
      if (errEl) errEl.textContent = '';
      input.style.borderColor = '';
    }
  });

  if (!valid) { showToast('❌ Vui lòng điền đầy đủ thông tin'); return; }

  const btn = document.getElementById('placeOrderBtn');
  if (btn) { btn.textContent = 'Đang xử lý...'; btn.disabled = true; }

  setTimeout(() => {
    // Clear cart
    saveCartData([]);
    localStorage.removeItem('mealkit_discount');

    // Show success modal
    const code = '#MKV-' + Math.floor(100000 + Math.random() * 900000);
    const codeEl = document.getElementById('orderCode');
    if (codeEl) codeEl.textContent = code;

    const modal = document.getElementById('successModal');
    if (modal) modal.style.display = 'flex';

    if (btn) { btn.textContent = 'Xác nhận đặt hàng 🛒'; btn.disabled = false; }
  }, 1500);
}

// Save discount when going to checkout
document.getElementById('checkoutBtn')?.addEventListener('click', (e) => {
  if (getCart().length === 0) { e.preventDefault(); showToast('Giỏ hàng đang trống!'); return; }
  localStorage.setItem('mealkit_discount', discount.toString());
});

// Init
if (document.getElementById('cartItemsList')) renderCartPage();
if (document.getElementById('checkoutItemsList')) renderCheckoutSummary();
