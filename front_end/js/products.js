async function loadProducts(category = "") {
  const url = category
    ? `${API}/products?category=${category}`
    : `${API}/products`;
  const res = await fetch(url);
  const data = await res.json();
  return data.success ? data.data : [];
}

function renderProductCard(p) {
  return `
    <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
      <img src="${p.image || "https://picsum.photos/seed/mealkit/300/200"}" alt="${p.name}">
      <div class="product-info">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <h3>${p.name}</h3>
        <p>${p.description || ""}</p>
        <div class="product-meta">
          <span>⏱ ${p.cook_time} phút</span>
          <span>👥 ${p.servings} người</span>
          <span>🔥 ${p.calories} kcal</span>
        </div>
        <div class="product-footer">
          <span class="price">${Number(p.price).toLocaleString("vi-VN")}đ</span>
          <button onclick="event.stopPropagation(); addToCart(${p.id},'${p.name}',${p.price},'${p.image || ""}')">
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", async function () {
  const grid = document.getElementById("products-grid");
  if (!grid) return;
  grid.innerHTML = "<p>Đang tải...</p>";
  const products = await loadProducts();
  if (products.length === 0) {
    grid.innerHTML = "<p>Không có sản phẩm nào.</p>";
    return;
  }
  grid.innerHTML = products.map(renderProductCard).join("");
});
