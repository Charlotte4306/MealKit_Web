const params = new URLSearchParams(window.location.search);
const currentId = parseInt(params.get("id") || "1");

let product = null;
let selectedPrice = 0;
let qty = 1;
let selectedStar = 0;

async function initPage() {
  try {
    const res = await fetch(`${API}/products/${currentId}`);
    const data = await res.json();
    if (!data.success) throw new Error("Không tìm thấy sản phẩm");
    product = data.data;
    selectedPrice = product.price;

    document.title = product.name + " – ByteBloom MealKit";
    const imgSrc = product.image
      ? "/images/products/" + product.image
      : "https://picsum.photos/seed/" + product.id + "/600/400";

    const nameEl = document.getElementById("pdName");
    if (nameEl) nameEl.textContent = product.name;
    const descEl = document.getElementById("pdShortDesc");
    if (descEl) descEl.textContent = product.description;
    const breadEl = document.getElementById("pdBreadcrumb");
    if (breadEl) breadEl.textContent = product.name;
    const badgeEl = document.getElementById("pdBadge");
    if (badgeEl) {
      badgeEl.textContent = product.badge || "";
      badgeEl.style.display = product.badge ? "" : "none";
    }

    const mainImg = document.getElementById("mainImg");
    if (mainImg) {
      mainImg.src = imgSrc;
      mainImg.onerror = function () {
        this.onerror = null;
        this.src = "https://picsum.photos/seed/" + product.id + "/600/400";
      };
    }

    updatePriceDisplay();
    renderRelated(product.related || []);
  } catch (err) {
    console.error(err);
  }
}

function updatePriceDisplay() {
  const fmtPrice = selectedPrice.toLocaleString("vi-VN") + "đ";
  const pdPrice = document.getElementById("pdPrice");
  if (pdPrice) pdPrice.textContent = fmtPrice;
  const stickyPrice = document.getElementById("stickyPrice");
  if (stickyPrice) stickyPrice.textContent = fmtPrice;
}

function changeImg(btn, src) {
  document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  const mainImg = document.getElementById("mainImg");
  if (mainImg) {
    mainImg.style.opacity = "0";
    setTimeout(() => { mainImg.src = src; mainImg.style.opacity = "1"; }, 200);
  }
}

function toggleWishlist(btn) {
  btn.classList.toggle("active");
  const isActive = btn.classList.contains("active");
  showToast(isActive ? "❤️ Đã thêm vào yêu thích" : "🤍 Đã bỏ yêu thích");
}

function selectServing(btn) {
  document.querySelectorAll(".serving-choice").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedPrice = parseInt(btn.dataset.price);
  updatePriceDisplay();
}

function changeDetailQty(delta) {
  qty = Math.max(1, qty + delta);
  const el = document.getElementById("detailQty");
  if (el) el.textContent = qty;
}

function addDetailToCart() {
  let cartArr = JSON.parse(localStorage.getItem("mealkit_cart") || "[]");
  const existing = cartArr.find(i => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cartArr.push({ id: product.id, name: product.name, price: selectedPrice, qty, img: product.image });
  }
  localStorage.setItem("mealkit_cart", JSON.stringify(cartArr));
  const total = cartArr.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll("#cartBadge").forEach(el => el.textContent = total);
  showToast("✓ Đã thêm " + qty + " gói \"" + product.name + "\" vào giỏ hàng");
}

function switchTab(btn) {
  document.querySelectorAll(".pd-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".pd-tab-content").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  const tabContent = document.getElementById("tab-" + btn.dataset.tab);
  if (tabContent) tabContent.classList.add("active");
}

function pickStar(n) {
  selectedStar = n;
  document.querySelectorAll(".star-pick").forEach((btn, i) => {
    btn.classList.toggle("active", i < n);
  });
}

function submitReview() {
  if (selectedStar === 0) { showToast("Vui lòng chọn số sao!"); return; }
  const text = document.getElementById("reviewText")?.value.trim();
  if (!text) { showToast("Vui lòng nhập nội dung đánh giá!"); return; }
  showToast("🎉 Cảm ơn bạn đã đánh giá!");
  if (document.getElementById("reviewText")) document.getElementById("reviewText").value = "";
  selectedStar = 0;
  document.querySelectorAll(".star-pick").forEach(b => b.classList.remove("active"));
}

function renderRelated(related) {
  const grid = document.getElementById("relatedGrid");
  if (!grid || !related.length) return;
  grid.innerHTML = related.slice(0, 3).map(p => {
    const imgSrc = p.image ? "/images/products/" + p.image : "https://picsum.photos/seed/" + p.id + "/400/300";
    return `
    <article class="product-card">
      <a href="product-detail.html?id=${p.id}" class="product-card__img">
        <img src="${imgSrc}" alt="${p.name}" loading="lazy"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/${p.id}/400/300'"/>
        ${p.badge ? '<span class="product-card__badge">' + p.badge + "</span>" : ""}
      </a>
      <div class="product-card__body">
        <h3 class="product-card__name"><a href="product-detail.html?id=${p.id}">${p.name}</a></h3>
        <p class="product-card__desc">${p.description || ""}</p>
        <div class="product-card__footer">
          <div class="product-card__price">${Number(p.price).toLocaleString("vi-VN")}đ</div>
        </div>
      </div>
    </article>`;
  }).join("");
}

const heroSection = document.querySelector(".pd-hero");
const stickyBar = document.getElementById("stickyBar");
if (heroSection && stickyBar) {
  window.addEventListener("scroll", () => {
    stickyBar.style.display = heroSection.getBoundingClientRect().bottom < 0 ? "flex" : "none";
  }, { passive: true });
}

initPage();