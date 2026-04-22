const pool = require("./db");

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('user','admin') DEFAULT 'user',
        avatar VARCHAR(255),
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price INT NOT NULL,
        servings INT DEFAULT 2,
        cook_time INT DEFAULT 30,
        category VARCHAR(50) DEFAULT 'other',
        difficulty ENUM('easy','medium','hard') DEFAULT 'easy',
        calories INT DEFAULT 400,
        badge VARCHAR(50),
        image VARCHAR(255),
        images JSON,
        ingredients JSON,
        steps JSON,
        nutrition JSON,
        is_active TINYINT(1) DEFAULT 1,
        stock INT DEFAULT 100,
        sold INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        order_code VARCHAR(20) UNIQUE NOT NULL,
        items JSON NOT NULL,
        subtotal INT NOT NULL,
        discount INT DEFAULT 0,
        shipping_fee INT DEFAULT 0,
        total INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(150) NOT NULL,
        address TEXT NOT NULL,
        district VARCHAR(100),
        city VARCHAR(100),
        note TEXT,
        delivery_slot VARCHAR(50) DEFAULT 'tomorrow-morning',
        payment_method VARCHAR(50) DEFAULT 'cod',
        status ENUM('pending','confirmed','preparing','shipping','delivered','cancelled') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT,
        name VARCHAR(100) NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS wishlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_wishlist (user_id, product_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Tất cả bảng đã sẵn sàng");

    const [[{ c }]] = await conn.query("SELECT COUNT(*) as c FROM products");
    if (c === 0) await seedProducts(conn);
  } finally {
    conn.release();
  }
}

async function seedProducts(conn) {
  const products = [
    [
      "Bò Xào Rau Củ Đà Lạt",
      "Thịt bò Úc hạng A, rau củ Đà Lạt tươi.",
      189000,
      2,
      25,
      "couple",
      450,
      "Bán chạy",
    ],
    [
      "Canh Chua Cá Hồi",
      "Cá hồi Na Uy, me chua Tây Ninh, cà chua bi.",
      245000,
      4,
      30,
      "family",
      380,
      "Mới",
    ],
    [
      "Đậu Hủ Sốt Cay Hàn Quốc",
      "Đậu hủ non, nấm kim châm, sốt gochujang.",
      145000,
      2,
      20,
      "vegan",
      320,
      "Chay",
    ],
    [
      "Lẩu Thái Hải Sản",
      "Tôm, mực, cá viên, nước dùng tom yum.",
      385000,
      4,
      30,
      "premium",
      520,
      "Cao cấp",
    ],
    [
      "Salad Gỏi Bưởi Tôm",
      "Bưởi Năm Roi, tôm sú Cà Mau, rau thơm.",
      168000,
      2,
      15,
      "quick",
      280,
      "Nhanh",
    ],
  ];
  for (const p of products) {
    await conn.query(
      "INSERT INTO products (name,description,price,servings,cook_time,category,calories,badge) VALUES (?,?,?,?,?,?,?,?)",
      p,
    );
  }
  console.log("🌱 Đã seed", products.length, "sản phẩm mẫu");
}

module.exports = { initDB };
