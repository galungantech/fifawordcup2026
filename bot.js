const axios = require("axios");

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!RAPIDAPI_KEY) {
    console.error("❌ RAPIDAPI_KEY belum diset");
    process.exit(1);
}

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io"
    },
    timeout: 10000
});

// SAFE REQUEST
async function safeGet(url, params = {}, label = "") {
    try {
        const res = await api.get(url, { params });
        return res.data.response;
    } catch (err) {
        console.log(`❌ ${label} error:`, err.response?.data || err.message);
        return null;
    }
}

// TELEGRAM
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

// DASHBOARD
async function buildDashboard() {
    let msg = "🏆 *WORLD CUP STYLE DASHBOARD*\n\n";

    // FIXTURES (fallback aman)
    const fixtures = await safeGet("/fixtures", {
        season: 2026
    }, "fixtures");

    msg += "📅 *Fixtures*\n";

    if (fixtures) {
        fixtures.slice(0, 5).forEach(f => {
            msg += `• ${f.teams.home.name} vs ${f.teams.away.name}\n`;
        });
    } else {
        msg += "• Data tidak tersedia\n";
    }

    msg += "\n";

    // STANDINGS (lebih aman tanpa league fixed)
    const standings = await safeGet("/standings", {
        season: 2026
    }, "standings");

    msg += "📊 *Standings*\n";

    if (standings?.length) {
        msg += "Data tersedia (lihat API plan)\n";
    } else {
        msg += "• Standings tidak tersedia untuk season ini\n";
    }

    msg += "\n";

    // TOP SCORERS (safe fallback)
    const scorers = await safeGet("/players/topscorers", {
        season: 2026
    }, "scorers");

    msg += "⚽ *Top Scorers*\n";

    if (scorers?.length) {
        scorers.slice(0, 5).forEach((p, i) => {
            msg += `${i + 1}. ${p.player.name} (${p.statistics?.[0]?.goals?.total || 0})\n`;
        });
    } else {
        msg += "• Data top scorer tidak tersedia\n";
    }

    return msg;
}

// RUN
(async () => {
    try {
        const dashboard = await buildDashboard();
        await sendTelegram(dashboard);
        console.log("✅ Sent");
    } catch (err) {
        console.error("❌ Fatal:", err.response?.data || err.message);
    }
})();
