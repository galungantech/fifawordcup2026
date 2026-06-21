const axios = require("axios");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 🔥 Ganti dengan URL GitHub Pages Anda sendiri
const WEB_APP_URL = "https://galungantech.github.io/fifawordcup2026/"; 

// ==========================
// KODE COBA KIRIM BARU (RUN ONCE TO GET ID)
// ==========================
async function sendNewRichMessage() {
    const text = `🏆 *FIFA World Cup 2026™*

_Piala Dunia 2026 kini telah memasuki fase grup\\! Jangan lewatkan aksi serunya\\._ \\- *Kotak Biasa*

Klik tombol di bawah untuk membuka Live Dashboard, jadwal lengkap, top skor, dan klasemen interaktif langsung di dalam Telegram\\.`;

    try {
        const res = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: "MarkdownV2",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "⚽ Buka Dashboard Interaktif",
                                web_app: {
                                    url: WEB_APP_URL
                                }
                            }
                        ],
                        [
                            {
                                text: "📺 Tonton Live Streaming",
                                url: "https://t.me/KotakBiasa?livestream"
                            }
                        ]
                    ]
                }
            }
        );
        console.log("✅ BERHASIL KIRIM PESAN BARU!");
        console.log("➡️ ID PESAN BARU ANDA ADALAH:", res.data.result.message_id);
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
        process.exit(1);
    }
}

// 🔥 Memanggil fungsi yang benar agar tidak memicu ReferenceError
sendNewRichMessage();
