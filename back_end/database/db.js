const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "mealkit_viet",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

pool
  .getConnection()
  .then((conn) => {
    console.log("✅ Kết nối MySQL thành công!");
    conn.release();
  })
  .catch((err) => console.error("❌ Lỗi kết nối MySQL:", err.message));

module.exports = pool;
