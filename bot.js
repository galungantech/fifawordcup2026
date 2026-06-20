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
function formatTime(dateString) {
    return new Date(dateString).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function shorten(text, max = 24) {
    if (!text) return '-';
    return text.length > max ? text.substring(0, max - 3) + '...' : text;
}

// SAFE REQUEST (ANTI CRASH)
async function safeGet(url, label) {
    try {
        const res = await axios.get(url, { headers });
        return res.data;
    } catch (err) {
        console.error(`❌ ${label}:`, err.response?.status, err.response?.data || err.message);
        return null;
    }
}

// ==========================================
// MAIN REPORT
// ==========================================
async function getFootballReport() {

    let msg = '⚽ *Football Report*\n\n';

    // ==========================================
    // MATCHES TODAY
    // ==========================================
    const matchesToday = await safeGet(
        'https://api.football-data.org/v4/matches',
        'matchesToday'
    );

    msg += '🌍 *Pertandingan Hari Ini*\n';

    (matchesToday?.matches || []).slice(0, 5).forEach(m => {
        const home = shorten(m.homeTeam?.name);
        const away = shorten(m.awayTeam?.name);

        const hs = m.score?.fullTime?.home ?? '-';
        const as = m.score?.fullTime?.away ?? '-';

        msg += `• ${home} ${hs}-${as} ${away}\n`;
    });

    msg += '\n';

    // ==========================================
    // CHAMPIONS LEAGUE
    // ==========================================
    const cl = await safeGet(
        'https://api.football-data.org/v4/competitions/CL/matches',
        'CL matches'
    );

    msg += '🏆 *Champions League*\n';

    (cl?.matches || []).slice(0, 5).forEach(m => {
        msg += `• ${shorten(m.homeTeam?.name)} vs ${shorten(m.awayTeam?.name)}\n`;
    });

    msg += '\n';

    // ==========================================
    // TEAM 86 SCHEDULED
    // ==========================================
    const team86 = await safeGet(
        'https://api.football-data.org/v4/teams/86/matches?status=SCHEDULED',
        'team86'
    );

    msg += '📅 *Team 86 Jadwal*\n';

    (team86?.matches || []).slice(0, 5).forEach(m => {
        msg += `• ${formatTime(m.utcDate)}\n`;
        msg += `  ${shorten(m.homeTeam?.name)} vs ${shorten(m.awayTeam?.name)}\n`;
    });

    msg += '\n';

    // ==========================================
    // NOTE: PERSONS ENDPOINT REMOVED (403 SOURCE)
    // ==========================================
    msg += '⚽ *Person 2019 Matches*\n';
    msg += '• Endpoint tidak tersedia / dibatasi API (dihapus untuk stabilitas)\n\n';

    // ==========================================
    // PREMIER LEAGUE
    // ==========================================
    const pl = await safeGet(
        'https://api.football-data.org/v4/competitions/PL/matches?matchday=11',
        'PL matchday'
    );

    msg += '🏴 *Premier League MD11*\n';

    (pl?.matches || []).slice(0, 5).forEach(m => {
        msg += `• ${shorten(m.homeTeam?.name)} vs ${shorten(m.awayTeam?.name)}\n`;
    });

    msg += '\n';

    // ==========================================
    // STANDINGS (FIXED: optional-safe)
    // ==========================================
    const standings = await safeGet(
        'https://api.football-data.org/v4/competitions/BL1/standings',
        'Bundesliga standings'
    );

    msg += '📊 *Bundesliga Top 5*\n';

    const table =
        standings?.standings?.find(s => s.type === 'TOTAL')?.table || [];

    table.slice(0, 5).forEach(t => {
        msg += `${t.position}. ${shorten(t.team?.name, 18)} (${t.points} pts)\n`;
    });

    msg += '\n';

    // ==========================================
    // TOP SCORERS
    // ==========================================
    const scorers = await safeGet(
        'https://api.football-data.org/v4/competitions/SA/scorers',
        'Serie A scorers'
    );

    msg += '👟 *Serie A Top Scorers*\n';

    (scorers?.scorers || []).slice(0, 5).forEach((s, idx) => {
        msg += `${idx + 1}. ${shorten(s.player?.name, 20)} (${s.goals} gol)\n`;
    });

    // ==========================================
    // LIMIT TELEGRAM 4096
    // ==========================================
    if (msg.length > 3900) {
        msg = msg.substring(0, 3900) + '\n\n...(dipotong)';
    }

    return msg;
}

// ==========================================
// SEND TELEGRAM
// ==========================================
async function sendTelegram(text) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'Markdown'
            }
        );

        console.log('✅ Pesan berhasil dikirim');
    } catch (err) {
        console.error('❌ Telegram error:', err.response?.data || err.message);
    }
}

// ==========================================
// RUN
// ==========================================
(async () => {
    const report = await getFootballReport();
    await sendTelegram(report);
})();
