const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
        "https://charlottedev.me",
        "http://charlottedev.me"
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../front_end")));

const { initDB } = require("./database/init");
initDB().catch(console.error);

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders",   require("./routes/orders"));
app.use("/api/admin",    require("./routes/admin"));
app.use("/api/upload",   require("./routes/upload"));
app.use("/api/chat",     require("./routes/chat"));   // ← chỉ 1 dòng duy nhất

// ── Health check ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "MealKit Viet API dang hoat dong", time: new Date() });
});

// ── Error handlers (phải ở CUỐI CÙNG) ────────────────────
app.use((req, res) =>
    res.status(404).json({ success: false, message: "Endpoint khong ton tai" })
);
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("Server: http://localhost:" + PORT);
    console.log("Health: http://localhost:" + PORT + "/api/health");
});