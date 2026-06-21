const axios = require("axios");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
// Ganti angka 74 dengan ID pesan asli yang ingin di-update di room chat Anda
const TELEGRAM_MESSAGE_ID = process.env.TELEGRAM_MESSAGE_ID || 83; 

// 🔥 Masukkan URL hasil link GitHub Pages Anda di sini
const WEB_APP_URL = "https://galungantech.github.io/fifawordcup2026/"; 

// ==========================
// EDIT TELEGRAM RICH MESSAGE
// ==========================
async function updateTelegramMessage() {
    const text = `🏆 *FIFA World Cup 2026™*

_Piala Dunia 2026 kini telah memasuki fase grup! Jangan lewatkan aksi serunya\\._ \\- *Kotak Biasa*

Klik tombol di bawah untuk membuka Live Dashboard, jadwal lengkap, top skor, dan klasemen interaktif langsung di dalam Telegram\\.`;

    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                message_id: TELEGRAM_MESSAGE_ID,
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
        console.log("✅ SUCCESS: TELEGRAM RICH MESSAGE UPDATED");
    } catch (e) {
        const telegramError = e.response?.data?.description || "";
        
        // Pencegahan crash di GitHub Actions jika konten teks persis sama
        if (telegramError.includes("message is not modified")) {
            console.log("⚠️ INFO: Konten dashboard menu utama tidak berubah. Dilewati.");
        } else {
            console.log("❌ ERROR:", e.response?.data || e.message);
            process.exit(1);
        }
    }
}

updateTelegramMessage();
