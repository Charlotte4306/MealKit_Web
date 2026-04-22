const express = require("express");
const router = express.Router();
const { getDB } = require("../database/init");
const { authMiddleware, optionalAuth } = require("../middleware/auth");

function genOrderCode() {
  return "#MKV-" + Math.floor(100000 + Math.random() * 900000);
}

// POST /api/orders — tạo đơn hàng
router.post("/", optionalAuth, (req, res) => {
  const {
    items,
    name,
    phone,
    email,
    address,
    district,
    city,
    note,
    delivery_slot,
    payment_method,
    subtotal,
    discount,
    shipping_fee,
    total,
  } = req.body;
  if (!items || !items.length)
    return res.status(400).json({ success: false, message: "Giỏ hàng trống" });
  if (!name || !phone || !email || !address)
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin giao hàng" });

  const db = getDB();
  let code;
  // Đảm bảo mã không trùng
  do {
    code = genOrderCode();
  } while (db.prepare("SELECT id FROM orders WHERE order_code=?").get(code));

  try {
    const result = db
      .prepare(
        `
      INSERT INTO orders (user_id, order_code, items, subtotal, discount, shipping_fee, total, name, phone, email, address, district, city, note, delivery_slot, payment_method)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `,
      )
      .run(
        req.user?.id || null,
        code,
        JSON.stringify(items),
        subtotal,
        discount || 0,
        shipping_fee || 0,
        total,
        name,
        phone,
        email,
        address,
        district || "",
        city || "",
        note || "",
        delivery_slot || "tomorrow-morning",
        payment_method || "cod",
      );

    // Cập nhật số lượng bán
    for (const item of items) {
      db.prepare(
        "UPDATE products SET sold=sold+?, stock=MAX(0,stock-?) WHERE id=?",
      ).run(item.qty, item.qty, item.id);
    }

    res
      .status(201)
      .json({
        success: true,
        message: "Đặt hàng thành công!",
        orderCode: code,
        orderId: result.lastInsertRowid,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/my — lịch sử đơn hàng của user
router.get("/my", authMiddleware, (req, res) => {
  const db = getDB();
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json({ success: true, data: orders });
});

// GET /api/orders/:code — tra cứu đơn hàng theo mã
router.get("/:code", (req, res) => {
  const db = getDB();
  const order = db
    .prepare("SELECT * FROM orders WHERE order_code=?")
    .get(req.params.code);
  if (!order)
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy đơn hàng" });
  res.json({
    success: true,
    data: { ...order, items: JSON.parse(order.items) },
  });
});

// PUT /api/orders/:id/cancel — hủy đơn hàng
router.put("/:id/cancel", authMiddleware, (req, res) => {
  const db = getDB();
  const order = db
    .prepare("SELECT * FROM orders WHERE id=? AND user_id=?")
    .get(req.params.id, req.user.id);
  if (!order)
    return res
      .status(404)
      .json({ success: false, message: "Không tìm thấy đơn hàng" });
  if (order.status !== "pending")
    return res
      .status(400)
      .json({ success: false, message: "Chỉ có thể hủy đơn đang chờ xử lý" });
  db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(
    req.params.id,
  );
  res.json({ success: true, message: "Đã hủy đơn hàng" });
});

module.exports = router;
