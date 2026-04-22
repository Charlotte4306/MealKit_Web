//const API = "http://localhost:5000/api";

// Lưu / đọc token
function getToken() {
  return localStorage.getItem("token");
}
function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}
function isLoggedIn() {
  return !!getToken();
}

// Cập nhật navbar
function updateNavbar() {
  const user = getUser();
  const btnLogin = document.getElementById("btn-login");
  const btnReg = document.getElementById("btn-register");
  const btnLogout = document.getElementById("btn-logout");
  const userName = document.getElementById("user-name");
  if (!btnLogin) return;
  if (user) {
    btnLogin && (btnLogin.style.display = "none");
    btnReg && (btnReg.style.display = "none");
    btnLogout && (btnLogout.style.display = "inline-block");
    userName && (userName.textContent = user.name);
  } else {
    btnLogin && (btnLogin.style.display = "inline-block");
    btnReg && (btnReg.style.display = "inline-block");
    btnLogout && (btnLogout.style.display = "none");
    userName && (userName.textContent = "");
  }
}

// Đăng ký
async function register(name, email, phone, password) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
}

// Đăng nhập
async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }
  return data;
}

// Đăng xuất
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/index.html";
}

// Chạy khi load trang
document.addEventListener("DOMContentLoaded", function () {
  updateNavbar();

  // Nút logout
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) btnLogout.addEventListener("click", logout);

  // Form đăng nhập
  // Form đăng nhập
  const loginForm = document.getElementById("loginForm"); // ← sửa id này
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.getElementById("email").value; // ← sửa
      const password = document.getElementById("password").value; // ← sửa
      const emailErr = document.getElementById("emailError");
      const passErr = document.getElementById("passwordError");

      // Xoá lỗi cũ
      if (emailErr) emailErr.textContent = "";
      if (passErr) passErr.textContent = "";

      const data = await login(email, password);
      if (data.success) {
        setTimeout(() => (window.location.href = "/index.html"), 1000);
      } else {
        // Hiện lỗi đúng vị trí
        if (passErr)
          passErr.textContent =
            "❌ " + (data.message || "Email hoặc mật khẩu không đúng");
      }
    });
  }

  // Form đăng ký
  const regForm = document.getElementById("registerForm");
  if (regForm) {
    regForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("reg-name").value;
      const email = document.getElementById("reg-email").value;
      const phone = document.getElementById("reg-phone").value;
      const password = document.getElementById("reg-password").value;
      const msg = document.getElementById("reg-message");
      const data = await register(name, email, phone, password);
      if (data.success) {
        msg && (msg.textContent = "✅ Đăng ký thành công! Đang chuyển...");
        setTimeout(() => (window.location.href = "/index.html"), 1000);
      } else {
        msg && (msg.textContent = "❌ " + data.message);
      }
    });
  }
});
