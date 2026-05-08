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

    // ── Tiêu đề & breadcrumb ──
    document.title = product.name + " – ByteBloom MealKit";
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

    // ── Ảnh chính ──
    const imgSrc = product.image
      ? "/images/products/" + product.image
      : "https://picsum.photos/seed/" + product.id + "/600/400";
    const mainImg = document.getElementById("mainImg");
    if (mainImg) {
      mainImg.src = imgSrc;
      mainImg.onerror = function () {
        this.onerror = null;
        this.src = "https://picsum.photos/seed/" + product.id + "/600/400";
      };
    }

    // ── Specs ──
    const cookTimeEl = document.getElementById("pdCookTime");
    if (cookTimeEl) cookTimeEl.textContent = product.cook_time + " phút";
    const servingsEl = document.getElementById("pdServings");
    if (servingsEl) servingsEl.textContent = product.servings + " người";
    const diffEl = document.getElementById("pdDifficulty");
    if (diffEl) diffEl.textContent =
      product.difficulty === "easy" ? "Dễ" :
      product.difficulty === "medium" ? "Trung bình" : "Khó";
    const calEl = document.getElementById("pdCalories");
    if (calEl) calEl.textContent = product.calories + " kcal";

    // ── Rating ──
    const avgRating = parseFloat(product.avg_rating || 0).toFixed(1);
    const ratingCountEl = document.getElementById("pdRatingCount");
    if (ratingCountEl) ratingCountEl.textContent = `${avgRating} (${product.review_count} đánh giá)`;
    const soldEl = document.getElementById("pdSold");
    if (soldEl) soldEl.textContent = product.sold > 0 ? `· Đã bán ${product.sold}+` : "";
    const avgRatingEl = document.getElementById("avgRating");
    if (avgRatingEl) avgRatingEl.textContent = avgRating;
    const reviewTabEl = document.getElementById("reviewCountTab");
    if (reviewTabEl) reviewTabEl.textContent = product.review_count;
    const reviewSummaryEl = document.getElementById("reviewCountSummary");
    if (reviewSummaryEl) reviewSummaryEl.textContent = product.review_count + " đánh giá";

    // ── Category ──
    const catMap = { quick: "Món nhanh", family: "Gia đình", healthy: "Lành mạnh" };
    const catEl = document.getElementById("pdCategory");
    if (catEl) catEl.textContent = catMap[product.category] || product.category;

    // ── Dinh dưỡng ──
    const nutritionKcal = document.getElementById("nutritionKcal");
    if (nutritionKcal) nutritionKcal.textContent = product.calories || "--";
    const nutritionTable = document.getElementById("nutritionTable");
    if (nutritionTable) {
      const n = product.nutrition || {};
      nutritionTable.innerHTML = `
        <h4>Thành phần dinh dưỡng <small>(mỗi khẩu phần)</small></h4>
        <table><tbody>
          <tr><td>Năng lượng</td><td><strong>${product.calories || "--"} kcal</strong></td></tr>
          <tr><td>Protein</td><td><strong>${n.protein || "38"}g</strong></td></tr>
          <tr><td>Chất béo</td><td><strong>${n.fat || "14"}g</strong></td></tr>
          <tr><td>Carbohydrate</td><td><strong>${n.carbs || "45"}g</strong></td></tr>
          <tr><td>Chất xơ</td><td><strong>${n.fiber || "5"}g</strong></td></tr>
          <tr><td>Natri</td><td><strong>${n.sodium || "620"}mg</strong></td></tr>
        </tbody></table>`;
    }

    // ── Video ──
    const videoSection = document.getElementById("videoSection");
    if (videoSection) {
      if (product.video_url) {
        videoSection.innerHTML = `
          <video controls preload="metadata"
            poster="/images/products/${product.image}"
            style="width:100%;border-radius:12px;max-height:480px;background:#000;">
            <source src="${product.video_url}" type="video/mp4">
            Trình duyệt không hỗ trợ video.
          </video>
          <p style="margin-top:12px;font-size:13px;color:#666;">
            📱 Quét QR để xem video hướng dẫn nấu món này trên điện thoại!
          </p>`;
      } else {
        videoSection.innerHTML = `<p style="color:#aaa;padding:32px 0;text-align:center;">Chưa có video hướng dẫn cho món này.</p>`;
      }
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
  showToast(btn.classList.contains("active") ? "❤️ Đã thêm vào yêu thích" : "🤍 Đã bỏ yêu thích");
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
  showToast(`✓ Đã thêm ${qty} gói "${product.name}" vào giỏ hàng`);
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
    const imgSrc = p.image
      ? "/images/products/" + p.image
      : "https://picsum.photos/seed/" + p.id + "/400/300";
    return `
    <article class="product-card">
      <a href="product-detail.html?id=${p.id}" class="product-card__img">
        <img src="${imgSrc}" alt="${p.name}" loading="lazy"
             onerror="this.onerror=null;this.src='https://picsum.photos/seed/${p.id}/400/300'"/>
        ${p.badge ? `<span class="product-card__badge">${p.badge}</span>` : ""}
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

// ── Sticky bar ──
const heroSection = document.querySelector(".pd-hero");
const stickyBar = document.getElementById("stickyBar");
if (heroSection && stickyBar) {
  window.addEventListener("scroll", () => {
    stickyBar.style.display = heroSection.getBoundingClientRect().bottom < 0 ? "flex" : "none";
  }, { passive: true });
}

initPage();