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
// TABLE MATCH RESULT (Hanya Mengubah Tampilan Baris Garis)
// ==========================================
function formatMatchTable(matches) {
    let out =
`┌──────────┬──────────────────────────────┬──────┐
│  STATUS  │         PERTANDINGAN         │ GRUP │
├──────────┼──────────────────────────────┼──────┤
`;

    (matches || []).slice(0, 8).forEach(m => {
        let statusText = m.status || "FT";
        if (statusText === "FINISHED") statusText = "✅ FT";
        if (statusText === "IN_PLAY") statusText = "🔴 LIVE";
        
        const status = pad(statusText, 8);

        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;

        const match = pad(`${home} ${score} ${away}`, 28);
        
        let groupText = m.group || "-";
        if (groupText.includes("GROUP_")) groupText = groupText.replace("GROUP_", "");
        const group = pad(groupText, 4);

        out += `│ ${status} │ ${match} │ ${group} │\n`;
    });

    out += `└──────────┴──────────────────────────────┴──────┘`;
    return `<pre>${out}</pre>`;
}

// ==========================================
// TABLE SCHEDULE (Hanya Mengubah Tampilan Baris Garis)
// ==========================================
function formatScheduleTable(matches) {
    let out =
`┌──────────────┬─────────────────────────────────────────┐
│ WAKTU (WIB)  │              PERTANDINGAN               │
├──────────────┼─────────────────────────────────────────┤`;

    (matches || []).slice(0, 8).forEach(m => {
        const time = formatTime(m.utcDate);
        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        const match = pad(`${home} vs ${away}`, 39);

        out += `\n│ ${pad(time, 12)} │ ${match} │`;
    });

    out += `\n└──────────────┴─────────────────────────────────────────┘`;
    return `<pre>${out}</pre>`;
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
// SEND TELEGRAM (HTML MODE)
// ==========================================
async function sendTelegram(text) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: "HTML"
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
