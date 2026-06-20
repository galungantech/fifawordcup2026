const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

if (!FOOTBALL_DATA_TOKEN) {
    console.error("❌ FOOTBALL_DATA_TOKEN belum diset");
    process.exit(1);
}

const headers = {
    'X-Auth-Token': FOOTBALL_DATA_TOKEN
};

// ==========================================
// UTIL (TABLE FORMAT)
// ==========================================
function pad(text, size) {
    text = String(text ?? "-");
    return text.length > size ? text.slice(0, size - 1) + "…" : text + " ".repeat(size - text.length);
}

function formatTime(utcDate) {
    return new Date(utcDate).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ==========================================
// SAFE REQUEST
// ==========================================
async function safeGet(url, label) {
    try {
        const res = await axios.get(url, { headers });
        return res.data;
    } catch (err) {
        console.log(`❌ ${label}:`, err.response?.status || err.message);
        return null;
    }
}

// ==========================================
// TABLE MATCH RESULT (Format HTML Baris TR TD Murni)
// ==========================================
function formatMatchTable(matches) {
    let out = "";

    (matches || []).slice(0, 8).forEach(m => {
        let statusText = m.status || "FT";
        if (statusText === "FINISHED") statusText = "✅ FT";
        else if (statusText === "IN_PLAY") statusText = "🔴 LIVE";
        else if (statusText === "TIMED" || statusText === "SCHEDULED") statusText = "🔜 Segera";

        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";
        
        let scoreText = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;
        if (m.score?.fullTime?.home === null && m.score?.fullTime?.away === null) {
            scoreText = "vs";
        }

        let groupText = m.group || "-";
        if (groupText.includes("GROUP_")) groupText = groupText.replace("GROUP_", "");

        // Menghasilkan baris HTML murni yang akan disisipkan ke komponen Rich Message milikmu
        out += `<tr><td>${statusText}</td><td>${home} ${scoreText} ${away}</td><td>${groupText}</td></tr>\n`;
    });

    return out.trim();
}

// ==========================================
// TABLE SCHEDULE (Format HTML Baris TR TD Murni)
// ==========================================
function formatScheduleTable(matches) {
    let out = "";

    (matches || []).slice(0, 8).forEach(m => {
        const time = formatTime(m.utcDate);
        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        // Menghasilkan baris HTML murni yang akan disisipkan ke komponen Rich Message milikmu
        out += `<tr><td>${time}</td><td>${home} vs ${away}</td></tr>\n`;
    });

    return out.trim();
}

// ==========================================
// DASHBOARD BUILDER (Tetap Utuh Menyusun String)
// ==========================================
async function buildDashboard() {

    let msg = `🏆 WORLD FOOTBALL DASHBOARD\n\n`;

    // ======================================
    // MATCHES (GLOBAL)
    // ======================================
    const matches = await safeGet(
        'https://api.football-data.org/v4/matches',
        'matches'
    );

    msg += "📌 HASIL PERTANDINGAN\n";
    msg += formatMatchTable(matches?.matches || []);

    msg += "\n\n📅 JADWAL SELANJUTNYA\n";
    msg += formatScheduleTable(matches?.matches || []);

    msg += "\n";

    // ======================================
    // CHAMPIONS LEAGUE
    // ======================================
    const cl = await safeGet(
        'https://api.football-data.org/v4/competitions/CL/matches',
        'CL'
    );

    msg += "\n🏆 ELITE MATCHES (UCL)\n";
    msg += formatScheduleTable(cl?.matches || []);

    // LIMIT
    if (msg.length > 3900) {
        msg = msg.slice(0, 3900) + "\n...(dipotong)";
    }

    return msg;
}

// ==========================================
// SEND TELEGRAM (Menggunakan Rich Message Payload)
// ==========================================
async function sendTelegram(htmlContent) {
    try {
        // Karena sistemmu mendukung format rich_message, kita bungkus strukturnya sesuai payload suksesmu
        const payload = {
            chat_id: TELEGRAM_CHAT_ID,
            rich_message: {
                html: htmlContent
            }
        };

        // Ganti endpoint ke editMessageText jika bot ini tujuannya mengupdate pesan lama via ID
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            payload
        );

        console.log("✅ Rich Table Telegram sent");
    } catch (err) {
        console.error("❌ Telegram error:", err.response?.data || err.message);
    }
}

// ==========================================
// RUN
// ==========================================
(async () => {
    try {
        const dashboard = await buildDashboard();
        await sendTelegram(dashboard);
    } catch (err) {
        console.error("❌ Fatal:", err.response?.data || err.message);
    }
})();
