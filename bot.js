const axios = require("axios");

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// =====================================
// API BASE
// =====================================
const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io"
    }
});

// =====================================
// TELEGRAM
// =====================================
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

// =====================================
// FIXTURES (REAL TIME)
// =====================================
async function getFixtures() {
    const res = await api.get("/fixtures", {
        params: {
            league: 1, // World Cup
            season: 2026
        }
    });

    return res.data.response || [];
}

// =====================================
// STANDINGS
// =====================================
async function getStandings() {
    const res = await api.get("/standings", {
        params: {
            league: 1,
            season: 2026
        }
    });

    return res.data.response?.[0]?.league?.standings || [];
}

// =====================================
// TOP SCORERS
// =====================================
async function getTopScorers() {
    const res = await api.get("/players/topscorers", {
        params: {
            league: 1,
            season: 2026
        }
    });

    return res.data.response || [];
}

// =====================================
// FORMAT
// =====================================
function shorten(t, n = 20) {
    if (!t) return "-";
    return t.length > n ? t.slice(0, n - 3) + "..." : t;
}

// =====================================
// DASHBOARD BUILDER
// =====================================
async function buildDashboard() {
    let msg = "🏆 *FIFA WORLD CUP 2026 DASHBOARD*\n\n";

    try {
        // FIXTURES
        const fixtures = await getFixtures();

        msg += "📅 *Fixtures*\n";
        fixtures.slice(0, 5).forEach(f => {
            msg += `• ${shorten(f.teams.home.name)} vs ${shorten(f.teams.away.name)}\n`;
        });

        msg += "\n";

        // STANDINGS
        const standings = await getStandings();

        msg += "📊 *Group Standings*\n";

        standings.slice(0, 1).forEach(group => {
            msg += `\n🏷 ${group[0].group}\n`;

            group.slice(0, 4).forEach(team => {
                msg += `${team.rank}. ${shorten(team.team.name, 18)} - ${team.points} pts\n`;
            });
        });

        msg += "\n";

        // TOP SCORERS
        const scorers = await getTopScorers();

        msg += "⚽ *Top Scorers*\n";

        scorers.slice(0, 5).forEach((p, i) => {
            msg += `${i + 1}. ${shorten(p.player.name, 18)} - ${p.statistics[0].goals.total} goals\n`;
        });

        if (msg.length > 3900) {
            msg = msg.slice(0, 3900) + "\n...(cut)";
        }

        return msg;

    } catch (err) {
        console.error(err.response?.data || err.message);
        return "⚠️ Failed to build dashboard";
    }
}

// =====================================
// RUN
// =====================================
(async () => {
    const dashboard = await buildDashboard();
    await sendTelegram(dashboard);
})();
