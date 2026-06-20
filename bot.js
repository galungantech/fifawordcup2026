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
// TABLE MATCH RESULT (Menggunakan format tabel HTML murni)
// ==========================================
function formatMatchTable(matches) {
    let rows = "";

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

        rows += `<tr><td>${statusText}</td><td>${home} ${scoreText} ${away}</td><td>${groupText}</td></tr>\n`;
    });

    // Mengembalikan bungkus tabel utuh agar lolos validasi HTML Telegram
    return `<table>\n<tr><th>Status</th><th>Pertandingan</th><th>Grup</th></tr>\n${rows}</table>`;
}

// ==========================================
// TABLE SCHEDULE (Menggunakan format tabel HTML murni)
// ==========================================
function formatScheduleTable(matches) {
    let rows = "";

    (matches || []).slice(0, 8).forEach(m => {
        const time = formatTime(m.utcDate);
        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        rows += `<tr><td>${time}</td><td>${home} vs ${away}</td></tr>\n`;
    });

    // Mengembalikan bungkus tabel utuh agar lolos validasi HTML Telegram
    return `<table>\n<tr><th>Waktu (WIB)</th><th>Pertandingan</th></tr>\n${rows}</table>`;
}

// ==========================================
// DASHBOARD BUILDER (Tetap Utuh Seperti Aslinya)
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
// SEND TELEGRAM (Diperbaiki Properti "text" Agar Tidak Kosong)
// ==========================================
async function sendTelegram(htmlContent) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: htmlContent, // Menggunakan properti "text" standar Telegram API
                parse_mode: "HTML"
            }
        );

        console.log("✅ Telegram HTML Table Berhasil Dikirim!");
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
