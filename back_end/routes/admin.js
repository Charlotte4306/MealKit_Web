const express = require("express");
const router = express.Router();
const pool = require("../database/db");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");

// POST /api/admin/seed-admin - KHÔNG cần auth
router.post("/seed-admin", async function (req, res) {
  if (req.body.secretKey !== "MEALKIT_SETUP_2025")
    return res.status(403).json({ success: false, message: "Sai key" });
  try {
    var r = await pool.query(
      "SELECT id FROM users WHERE email='admin@mealkit.vn'",
    );
    if (r[0].length > 0)
      return res.json({ success: false, message: "Admin da ton tai" });
    var hashed = await bcrypt.hash("Admin@123", 12);
    await pool.query(
      "INSERT INTO users (name,email,phone,password,role) VALUES (?,?,?,?,?)",
      ["Admin", "admin@mealkit.vn", "0901234567", hashed, "admin"],
    );
    res.json({
      success: true,
      message:
        "Tao admin thanh cong! Email: admin@mealkit.vn | Pass: Admin@123",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === TẤT CẢ ROUTE BÊN DƯỚI CẦN AUTH + ADMIN ===
router.use(auth.authMiddleware);
router.use(auth.adminMiddleware);

// GET /api/admin/dashboard
router.get("/dashboard", async function (req, res) {
  try {
    var r1 = await pool.query("SELECT COUNT(*) as v FROM orders");
    var r2 = await pool.query(
      "SELECT COUNT(*) as v FROM orders WHERE status='pending'",
    );
    var r3 = await pool.query(
      "SELECT COALESCE(SUM(total),0) as v FROM orders WHERE status!='cancelled'",
    );
    var r4 = await pool.query(
      "SELECT COUNT(*) as v FROM users WHERE role='user'",
    );
    var r5 = await pool.query(
      "SELECT COUNT(*) as v FROM products WHERE is_active=1",
    );
    var r6 = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5",
    );
    var r7 = await pool.query(
      "SELECT id,name,sold,price FROM products ORDER BY sold DESC LIMIT 5",
    );
    res.json({
      success: true,
      data: {
        totalOrders: r1[0][0].v,
        pendingOrders: r2[0][0].v,
        totalRevenue: r3[0][0].v,
        totalUsers: r4[0][0].v,
        totalProducts: r5[0][0].v,
        recentOrders: r6[0],
        topProducts: r7[0],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/products", async function (req, res) {
  try {
    var r = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
    res.json({ success: true, data: r[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/products", async function (req, res) {
  var b = req.body;
  if (!b.name || !b.price)
    return res
      .status(400)
      .json({ success: false, message: "Thieu ten hoac gia" });
  try {
    var r = await pool.query(
      "INSERT INTO products (name,description,price,servings,cook_time,category,difficulty,calories,badge,image,stock) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [
        b.name,
        b.description || "",
        b.price,
        b.servings || 2,
        b.cook_time || 30,
        b.category || "other",
        b.difficulty || "easy",
        b.calories || 400,
        b.badge || null,
        b.image || "",
        b.stock || 100,
      ],
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Them san pham thanh cong",
        id: r[0].insertId,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/products/:id", async function (req, res) {
  var b = req.body;
  try {
    await pool.query(
      "UPDATE products SET name=COALESCE(?,name),description=COALESCE(?,description),price=COALESCE(?,price),category=COALESCE(?,category),badge=COALESCE(?,badge),image=COALESCE(?,image),stock=COALESCE(?,stock),is_active=COALESCE(?,is_active) WHERE id=?",
      [
        b.name || null,
        b.description || null,
        b.price || null,
        b.category || null,
        b.badge || null,
        b.image || null,
        b.stock || null,
        b.is_active != null ? b.is_active : null,
        req.params.id,
      ],
    );
    res.json({ success: true, message: "Cap nhat thanh cong" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/products/:id", async function (req, res) {
  try {
    await pool.query("UPDATE products SET is_active=0 WHERE id=?", [
      req.params.id,
    ]);
    res.json({ success: true, message: "Da an san pham" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/orders", async function (req, res) {
  var status = req.query.status;
  var page = parseInt(req.query.page) || 1;
  var limit = parseInt(req.query.limit) || 20;
  var where = status ? "WHERE status=?" : "";
  var params = status ? [status] : [];
  try {
    var rc = await pool.query(
      "SELECT COUNT(*) as total FROM orders " + where,
      params,
    );
    var offset = (page - 1) * limit;
    var r = await pool.query(
      "SELECT * FROM orders " +
        where +
        " ORDER BY created_at DESC LIMIT ? OFFSET ?",
      params.concat([limit, offset]),
    );
    res.json({ success: true, data: r[0], total: rc[0][0].total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/orders/:id/status", async function (req, res) {
  var valid = [
    "pending",
    "confirmed",
    "preparing",
    "shipping",
    "delivered",
    "cancelled",
  ];
  if (!valid.includes(req.body.status))
    return res
      .status(400)
      .json({ success: false, message: "Trang thai khong hop le" });
  try {
    await pool.query("UPDATE orders SET status=? WHERE id=?", [
      req.body.status,
      req.params.id,
    ]);
    res.json({ success: true, message: "Cap nhat thanh cong" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/users", async function (req, res) {
  try {
    var r = await pool.query(
      "SELECT id,name,email,phone,role,is_active,created_at FROM users ORDER BY created_at DESC",
    );
    res.json({ success: true, data: r[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/users/:id/toggle", async function (req, res) {
  try {
    await pool.query(
      "UPDATE users SET is_active=IF(is_active=1,0,1) WHERE id=?",
      [req.params.id],
    );
    res.json({ success: true, message: "Cap nhat thanh cong" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
