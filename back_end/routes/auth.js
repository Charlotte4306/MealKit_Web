require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../database/db");
const authMW = require("../middleware/auth");
const authMiddleware = authMW.authMiddleware;

const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function genToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Họ tên ít nhất 2 ký tự"),
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("phone")
      .matches(/^0[3-9]\d{8}$/)
      .withMessage("Số điện thoại không hợp lệ"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Mật khẩu ít nhất 6 ký tự"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, phone, password } = req.body;
    try {
      const [exist] = await pool.query("SELECT id FROM users WHERE email=?", [
        email,
      ]);
      if (exist[0])
        return res
          .status(409)
          .json({ success: false, message: "Email đã được sử dụng" });

      const hashed = await bcrypt.hash(password, 12);
      const [result] = await pool.query(
        "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
        [name, email, phone, hashed],
      );
      const [rows] = await pool.query(
        "SELECT id, name, email, phone, role FROM users WHERE id=?",
        [result.insertId],
      );
      res
        .status(201)
        .json({
          success: true,
          message: "Đăng ký thành công",
          token: genToken(rows[0]),
          user: rows[0],
        });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password").notEmpty().withMessage("Vui lòng nhập mật khẩu"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;
    try {
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE email=? AND is_active=1",
        [email],
      );
      if (!rows[0])
        return res
          .status(401)
          .json({ success: false, message: "Email hoặc mật khẩu không đúng" });

      const match = await bcrypt.compare(password, rows[0].password);
      if (!match)
        return res
          .status(401)
          .json({ success: false, message: "Email hoặc mật khẩu không đúng" });

      const { password: _, ...user } = rows[0];
      res.json({
        success: true,
        message: "Đăng nhập thành công",
        token: genToken(user),
        user,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
);

// GET /api/auth/me
router.get("/me", authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile
router.put("/profile", authMiddleware, async (req, res) => {
  const { name, phone } = req.body;
  try {
    await pool.query(
      "UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone) WHERE id=?",
      [name || null, phone || null, req.user.id],
    );
    const [rows] = await pool.query(
      "SELECT id,name,email,phone,role,avatar FROM users WHERE id=?",
      [req.user.id],
    );
    res.json({ success: true, message: "Cập nhật thành công", user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/change-password
router.put("/change-password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ success: false, message: "Thiếu thông tin" });
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id=?", [
      req.user.id,
    ]);
    const match = await bcrypt.compare(oldPassword, rows[0].password);
    if (!match)
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu cũ không đúng" });
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password=? WHERE id=?", [
      hashed,
      req.user.id,
    ]);
    res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/google
router.post("/google", async (req, res) => {
    try {
        const { id_token } = req.body;

        // Xác minh token với Google
        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, picture } = ticket.getPayload();

        // Tìm user trong DB, nếu chưa có thì tạo mới
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        let user = rows[0];

        if (!user) {
            const [result] = await pool.query(
                "INSERT INTO users (name, email, phone, password, avatar, is_active) VALUES (?,?,?,?,?,?)",
                [name, email, "", "", picture || "", 1]
            );
            const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
            user = newUser[0];
        }

        // Tạo JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        });

    } catch (err) {
        console.error("Google auth error:", err);
        res.status(401).json({ success: false, message: "Xác thực Google thất bại" });
    }
});

module.exports = router;
