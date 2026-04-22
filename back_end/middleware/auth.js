const jwt = require("jsonwebtoken");
const pool = require("../database/db");
require("dotenv").config();

async function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Không có token xác thực" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT id, name, email, role, avatar FROM users WHERE id=? AND is_active=1",
      [decoded.id],
    );
    if (!rows[0])
      return res
        .status(401)
        .json({
          success: false,
          message: "Tài khoản không tồn tại hoặc bị khóa",
        });
    req.user = rows[0];
    next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Token không hợp lệ hoặc hết hạn" });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin")
    return res
      .status(403)
      .json({ success: false, message: "Bạn không có quyền truy cập" });
  next();
}

async function optionalAuth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id=?",
      [decoded.id],
    );
    req.user = rows[0] || null;
  } catch {}
  next();
}

module.exports = { authMiddleware, adminMiddleware, optionalAuth };
