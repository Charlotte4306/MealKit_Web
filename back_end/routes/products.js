const express = require("express");
const router = express.Router();
const pool = require("../database/db");
const auth = require("../middleware/auth");

// GET /api/products
router.get("/", async function (req, res) {
  var search = req.query.search;
  var category = req.query.category;
  var maxPrice = req.query.maxPrice;
  var minPrice = req.query.minPrice;
  var sort = req.query.sort;
  var page = parseInt(req.query.page) || 1;
  var limit = parseInt(req.query.limit) || 12;
  var where = ["p.is_active=1"];
  var params = [];
  if (search) {
    where.push("(p.name LIKE ? OR p.description LIKE ?)");
    params.push("%" + search + "%", "%" + search + "%");
  }
  if (category) {
    where.push("p.category=?");
    params.push(category);
  }
  if (maxPrice) {
    where.push("p.price<=?");
    params.push(parseInt(maxPrice));
  }
  if (minPrice) {
    where.push("p.price>=?");
    params.push(parseInt(minPrice));
  }
  var whereStr = "WHERE " + where.join(" AND ");
  var orderMap = {
    "price-asc": "p.price ASC",
    "price-desc": "p.price DESC",
    newest: "p.created_at DESC",
    "best-seller": "p.sold DESC",
  };
  var orderBy = orderMap[sort] || "p.sold DESC";
  var offset = (page - 1) * limit;
  try {
    var countResult = await pool.query(
      "SELECT COUNT(*) as total FROM products p " + whereStr,
      params,
    );
    var total = countResult[0][0].total;
    var qParams = params.concat([limit, offset]);
    var result = await pool.query(
      "SELECT p.*, COALESCE(AVG(r.rating),0) as avg_rating, COUNT(r.id) as review_count " +
        "FROM products p LEFT JOIN reviews r ON r.product_id=p.id " +
        whereStr +
        " GROUP BY p.id ORDER BY " +
        orderBy +
        " LIMIT ? OFFSET ?",
      qParams,
    );
    res.json({
      success: true,
      data: result[0],
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id
router.get("/:id", auth.optionalAuth, async function (req, res) {
  try {
    var r1 = await pool.query(
      "SELECT p.*, COALESCE(AVG(rv.rating),0) as avg_rating, COUNT(rv.id) as review_count " +
        "FROM products p LEFT JOIN reviews rv ON rv.product_id=p.id " +
        "WHERE p.id=? AND p.is_active=1 GROUP BY p.id",
      [req.params.id],
    );
    var product = r1[0][0];
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Khong tim thay san pham" });
    var r2 = await pool.query(
      "SELECT rv.*, u.name as user_name FROM reviews rv LEFT JOIN users u ON u.id=rv.user_id WHERE rv.product_id=? ORDER BY rv.created_at DESC LIMIT 10",
      [req.params.id],
    );
    var r3 = await pool.query(
      "SELECT id,name,price,image,badge,servings,cook_time FROM products WHERE category=? AND id!=? AND is_active=1 LIMIT 4",
      [product.category, product.id],
    );
    var inWishlist = false;
    if (req.user) {
      var r4 = await pool.query(
        "SELECT id FROM wishlists WHERE user_id=? AND product_id=?",
        [req.user.id, req.params.id],
      );
      inWishlist = r4[0].length > 0;
    }
    product.reviews = r2[0];
    product.related = r3[0];
    product.inWishlist = inWishlist;
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/:id/reviews
router.post("/:id/reviews", auth.authMiddleware, async function (req, res) {
  var rating = req.body.rating;
  var comment = req.body.comment;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ success: false, message: "Rating tu 1-5" });
  try {
    var r = await pool.query(
      "SELECT id FROM reviews WHERE product_id=? AND user_id=?",
      [req.params.id, req.user.id],
    );
    if (r[0].length > 0)
      return res
        .status(409)
        .json({ success: false, message: "Ban da danh gia roi" });
    await pool.query(
      "INSERT INTO reviews (product_id,user_id,name,rating,comment) VALUES (?,?,?,?,?)",
      [req.params.id, req.user.id, req.user.name, rating, comment || ""],
    );
    res.status(201).json({ success: true, message: "Cam on ban da danh gia!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/:id/wishlist
router.post("/:id/wishlist", auth.authMiddleware, async function (req, res) {
  try {
    var r = await pool.query(
      "SELECT id FROM wishlists WHERE user_id=? AND product_id=?",
      [req.user.id, req.params.id],
    );
    if (r[0].length > 0) {
      await pool.query(
        "DELETE FROM wishlists WHERE user_id=? AND product_id=?",
        [req.user.id, req.params.id],
      );
      res.json({
        success: true,
        inWishlist: false,
        message: "Da bo yeu thich",
      });
    } else {
      await pool.query(
        "INSERT INTO wishlists (user_id,product_id) VALUES (?,?)",
        [req.user.id, req.params.id],
      );
      res.json({
        success: true,
        inWishlist: true,
        message: "Da them vao yeu thich",
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
