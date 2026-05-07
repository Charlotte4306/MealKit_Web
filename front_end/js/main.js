var API = "/api";

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
      <img src="${p.image ? '/images/products/' + p.image : 'https://picsum.photos/seed/mealkit/300/200'}" 
     alt="${p.name}" 
     onerror="this.onerror=null; this.src='https://picsum.photos/seed/mealkit/300/200'">
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

// ====== CHAT AI ======
const chatFab = document.getElementById("chatFab");
const chatBox = document.getElementById("chatBox");
const chatClose = document.getElementById("chatClose");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatMessages = document.getElementById("chatMessages");

let chatHistory = []; // lưu lịch sử hội thoại

chatFab?.addEventListener("click", () => chatBox.classList.toggle("open"));
chatClose?.addEventListener("click", () => chatBox.classList.remove("open"));

function appendMsg(text, role) {
    const div = document.createElement("div");
    div.className = `chat-msg chat-msg--${role === "user" ? "user" : "ai"}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

async function sendChat() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = "";

    appendMsg(msg, "user");
    chatHistory.push({ role: "user", text: msg });

    // Loading indicator
    const loading = appendMsg("Đang trả lời...", "loading");

    try {
        const res = await fetch(`${API}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, history: chatHistory }),
        });
        const data = await res.json();
        loading.remove();

        if (data.success) {
            appendMsg(data.reply, "ai");
            chatHistory.push({ role: "model", text: data.reply });
        } else {
            appendMsg("Xin lỗi, có lỗi xảy ra. Thử lại nhé!", "ai");
        }
    } catch {
        loading.remove();
        appendMsg("Không kết nối được server!", "ai");
    }
}

chatSend?.addEventListener("click", sendChat);
chatInput?.addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });
