const API = "http://localhost:5000/api";

// ===== GIỎ HÀNG =====
function getCart() {
  return JSON.parse(localStorage.getItem("cart") || "[]");
}
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cart-count");
  if (badge) badge.textContent = total;
}

function addToCart(id, name, price, image) {
  const cart = getCart();
  const idx = cart.findIndex((i) => i.id === id);
  if (idx >= 0) cart[idx].qty++;
  else cart.push({ id, name, price, image, qty: 1 });
  saveCart(cart);
  alert(`✅ Đã thêm "${name}" vào giỏ hàng!`);
}

// ===== LOAD SẢN PHẨM NỔI BẬT TRANG CHỦ =====
async function loadFeaturedProducts() {
  const grid = document.getElementById("featured-products");
  if (!grid) return;
  const res = await fetch(`${API}/products?limit=4`);
  const data = await res.json();
  if (!data.success) return;
  grid.innerHTML = data.data
    .slice(0, 4)
    .map(
      (p) => `
    <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
      <img src="${p.image || "https://via.placeholder.com/300x200?text=MealKit"}" alt="${p.name}">
      <div class="product-info">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <h3>${p.name}</h3>
        <div class="product-footer">
          <span class="price">${Number(p.price).toLocaleString("vi-VN")}đ</span>
          <button onclick="event.stopPropagation(); addToCart(${p.id},'${p.name}',${p.price},'${p.image || ""}')">
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>`,
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", function () {
  updateCartCount();
  loadFeaturedProducts();
  if (typeof updateNavbar === "function") {
    updateNavbar();
  }
});
