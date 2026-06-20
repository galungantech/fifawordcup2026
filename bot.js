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
// TABLE MATCH RESULT (Menggunakan Format TR TD HTML)
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
        
        // Cek skor, jika belum tanding berikan "vs"
        let scoreText = `${m.score?.fullTime?.home ?? "-"} - ${m.score?.fullTime?.away ?? "-"}`;
        if (m.score?.fullTime?.home === null && m.score?.fullTime?.away === null) {
            scoreText = "vs";
        }

        let groupText = m.group || "-";
        if (groupText.includes("GROUP_")) groupText = groupText.replace("GROUP_", "");

        // Menyusun string persis seperti format TR TD yang kamu minta
        out += `<tr><td>${statusText}</td><td>${home} ${scoreText} ${away}</td><td>${groupText}</td></tr>\n`;
    });

    return out.trim();
}

// ==========================================
// TABLE SCHEDULE (Menggunakan Format TR TD HTML)
// ==========================================
function formatScheduleTable(matches) {
    let out = "";

    (matches || []).slice(0, 8).forEach(m => {
        const time = formatTime(m.utcDate);
        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        // Menyusun string jadwal ke format TR TD HTML
        out += `<tr><td>${time}</td><td>${home} vs ${away}</td></tr>\n`;
    });

    return out.trim();
}

// ==========================================
// DASHBOARD BUILDER
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
// SEND TELEGRAM (Kembali ke HTML Mode)
// ==========================================
async function sendTelegram(text) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: "HTML" // Diubah ke HTML agar tag <tr><td> tidak dianggap text biasa
            }
        );

        console.log("✅ Telegram sent");
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
