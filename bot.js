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
// UTIL
// ==========================================
function shorten(text, max = 24) {
    if (!text) return '-';
    return text.length > max ? text.substring(0, max - 3) + '...' : text;
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// SAFE REQUEST
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
// DASHBOARD
// ==========================================
async function buildDashboard() {

    let msg = "🏆 *WORLD FOOTBALL DASHBOARD*\n\n";

    // ======================================
    // LIVE / TODAY MATCHES
    // ======================================
    const matches = await safeGet(
        'https://api.football-data.org/v4/matches',
        'matches'
    );

    msg += "📅 *Recent Matches*\n";

    (matches?.matches || []).slice(0, 5).forEach(m => {
        msg += `• ${shorten(m.homeTeam?.name)} ${m.score?.fullTime?.home ?? '-'}-${m.score?.fullTime?.away ?? '-'} ${shorten(m.awayTeam?.name)}\n`;
    });

    msg += "\n";

    // ======================================
    // CHAMPIONS LEAGUE (proxy world cup style)
    // ======================================
    const cl = await safeGet(
        'https://api.football-data.org/v4/competitions/CL/matches',
        'CL'
    );

    msg += "🏆 *Elite Matches (Champions League)*\n";

    (cl?.matches || []).slice(0, 5).forEach(m => {
        msg += `• ${shorten(m.homeTeam?.name)} vs ${shorten(m.awayTeam?.name)}\n`;
    });

    msg += "\n";

    // ======================================
    // PREMIER LEAGUE
    // ======================================
    const pl = await safeGet(
        'https://api.football-data.org/v4/competitions/PL/matches?matchday=11',
        'PL'
    );

    msg += "🏴 *Premier League Highlights*\n";

    (pl?.matches || []).slice(0, 5).forEach(m => {
        msg += `• ${shorten(m.homeTeam?.name)} vs ${shorten(m.awayTeam?.name)}\n`;
    });

    msg += "\n";

    // ======================================
    // BUNDESLIGA STANDINGS
    // ======================================
    const standings = await safeGet(
        'https://api.football-data.org/v4/competitions/BL1/standings',
        'standings'
    );

    const table = standings?.standings?.find(s => s.type === 'TOTAL')?.table || [];

    msg += "📊 *Bundesliga Top 5*\n";

    table.slice(0, 5).forEach(t => {
        msg += `${t.position}. ${shorten(t.team?.name, 18)} (${t.points})\n`;
    });

    msg += "\n";

    // ======================================
    // SERIE A TOP SCORERS
    // ======================================
    const scorers = await safeGet(
        'https://api.football-data.org/v4/competitions/SA/scorers',
        'scorers'
    );

    msg += "⚽ *Serie A Top Scorers*\n";

    (scorers?.scorers || []).slice(0, 5).forEach((s, i) => {
        msg += `${i + 1}. ${shorten(s.player?.name, 18)} (${s.goals})\n`;
    });

    // LIMIT TELEGRAM
    if (msg.length > 3900) {
        msg = msg.slice(0, 3900) + "\n...(cut)";
    }

    return msg;
}

// ==========================================
// TELEGRAM
// ==========================================
async function sendTelegram(text) {
    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: "Markdown"
        }
    );
}

// ==========================================
// RUN
// ==========================================
(async () => {
    try {
        const dashboard = await buildDashboard();
        await sendTelegram(dashboard);
        console.log("✅ Dashboard sent");
    } catch (err) {
        console.error("❌ Fatal:", err.response?.data || err.message);
    }
})();
