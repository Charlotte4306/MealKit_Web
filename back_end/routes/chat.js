require("dotenv").config();
const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const pool = require("../database/db");
const { authMiddleware } = require('../middleware/auth');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Bạn là Mai — trợ lý tư vấn ẩm thực thân thiện của MealKit Việt, dịch vụ giao nguyên liệu nấu ăn sạch tại Việt Nam.

Cách trả lời:
- Viết như đang nhắn tin với bạn bè: ngắn gọn, tự nhiên, đôi khi dùng emoji nhẹ nhàng và phải suy nghĩ để trả lời tự nhiên nhé 🌿
- KHÔNG dùng danh sách đánh số dài dòng, KHÔNG in đậm tràn lan
- Gợi ý tối đa 2-3 món, giải thích ngắn tại sao phù hợp
- Hỏi thêm 1 câu để hiểu khẩu vị nếu cần
- Tông giọng ấm áp, gần gũi, như người bạn hay nấu ăn

Ví dụ cách trả lời TỐT:
User: "tư vấn món cho 2 người"
Mai: "2 người thì vừa xinh 🍱 Hai bạn thích ăn nhẹ hay no? Nếu muốn nhanh mình gợi ý cơm gà nướng mật ong — thơm, dễ làm, khoảng 30 phút là xong. Còn muốn romantic hơn thì mì ý bò bằm cũng hợp lắm đó!"

Phạm vi tư vấn: món ăn Việt Nam và quốc tế, combo MealKit, thời gian nấu, nguyên liệu, khẩu vị.`;

// ── Gửi tin nhắn (không đăng nhập) — giữ nguyên cho guest ──
router.post("/", async (req, res) => {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ success: false });

    try {
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.map(m => ({
                role: m.role === "model" ? "assistant" : m.role,
                content: m.text
            })),
            { role: "user", content: message },
        ];

        const completion = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages,
            max_tokens: 512,
        });

        const reply = completion.choices[0].message.content;
        res.json({ success: true, reply });
    } catch (err) {
        console.error("Groq error:", err);
        res.status(500).json({ success: false, message: "AI đang bận, thử lại nhé!" });
    }
});

// ══════════════════════════════════════════════════════════
// CÁC ROUTE BÊN DƯỚI YÊU CẦU ĐĂNG NHẬP (verifyToken)
// ══════════════════════════════════════════════════════════

// ── Lấy danh sách phiên chat ──────────────────────────────
router.get("/sessions", authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Tạo phiên chat mới ────────────────────────────────────
router.post("/sessions", authMiddleware, async (req, res) => {
    try {
        const [result] = await pool.query(
            `INSERT INTO chat_sessions (user_id) VALUES (?)`,
            [req.user.id]
        );
        res.json({ success: true, sessionId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Lấy tin nhắn của 1 phiên ──────────────────────────────
router.get("/sessions/:sessionId/messages", authMiddleware, async (req, res) => {
    try {
        const [sessions] = await pool.query(
            `SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?`,
            [req.params.sessionId, req.user.id]
        );
        if (sessions.length === 0)
            return res.status(403).json({ success: false, message: "Không có quyền truy cập" });

        const [messages] = await pool.query(
            `SELECT role, content, created_at FROM chat_messages
             WHERE session_id = ? ORDER BY id ASC`,
            [req.params.sessionId]
        );
        res.json({ success: true, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Gửi tin (đã đăng nhập) + lưu DB ──────────────────────
router.post("/sessions/:sessionId/send", authMiddleware, async (req, res) => {
    const { message } = req.body;
    const sessionId = req.params.sessionId;
    if (!message) return res.status(400).json({ success: false, message: "Thiếu message" });

    try {
        // Kiểm tra phiên thuộc user
        const [sessions] = await pool.query(
            `SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?`,
            [sessionId, req.user.id]
        );
        if (sessions.length === 0)
            return res.status(403).json({ success: false, message: "Không có quyền" });

        // Lấy lịch sử từ DB
        const [history] = await pool.query(
            `SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY id ASC`,
            [sessionId]
        );

        // Gọi Groq với lịch sử từ DB
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.map(m => ({
                role: m.role === "model" ? "assistant" : m.role,
                content: m.content
            })),
            { role: "user", content: message },
        ];

        const completion = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages,
            max_tokens: 512,
        });

        const reply = completion.choices[0].message.content;

        // Lưu 2 tin nhắn vào DB 1 lần query
        await pool.query(
            `INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?), (?, 'model', ?)`,
            [sessionId, message, sessionId, reply]
        );

        // Cập nhật title nếu là tin đầu tiên
        if (history.length === 0) {
            const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
            await pool.query(
                `UPDATE chat_sessions SET title = ? WHERE id = ?`,
                [title, sessionId]
            );
        }

        res.json({ success: true, reply });
    } catch (err) {
        console.error("Groq error:", err);
        res.status(500).json({ success: false, message: "AI đang bận, thử lại nhé!" });
    }
});

// ── Xóa 1 phiên chat ──────────────────────────────────────
router.delete("/sessions/:sessionId", authMiddleware, async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM chat_sessions WHERE id = ? AND user_id = ?`,
            [req.params.sessionId, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;