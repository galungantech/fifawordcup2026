const axios = require("axios");
const { renderHTMLTable } = require("./renderEngine");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = {
    "X-Auth-Token": FOOTBALL_DATA_TOKEN
};

// ==========================
// SAFE FETCH
// ==========================
async function get(url, label) {
    try {
        const res = await axios.get(url, { headers });
        return res.data;
    } catch (e) {
        console.log("❌", label, e.response?.status || e.message);
        return null;
    }
}

// ==========================
// FORMAT MATCH (HTML VERSION)
// ==========================
function formatMatches(matches) {
    const rows = (matches || []).slice(0, 10).map(m => {
        let status = m.status;

        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;

        const match = `${m.homeTeam?.name} ${score} ${m.awayTeam?.name}`;

        let group = m.group || "-";
        group = group.replace("GROUP_", "");

        return `<tr><td>${status}</td><td>${match}</td><td>${group}</td></tr>`;
    }).join("\n");

    return renderHTMLTable(`
<tr><th>Status</th><th>Match</th><th>Grp</th></tr>
${rows}
`);
}

// ==========================
// FORMAT SCHEDULE (HTML VERSION)
// ==========================
function formatSchedule(matches) {
    const rows = (matches || []).slice(0, 10).map(m => {
        const time = new Date(m.utcDate).toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit"
        });

        const match = `${m.homeTeam?.name} vs ${m.awayTeam?.name}`;

        return `<tr><td>${time}</td><td>${match}</td></tr>`;
    }).join("\n");

    return renderHTMLTable(`
<tr><th>WIB</th><th>Match</th></tr>
${rows}
`);
}

// ==========================
// DASHBOARD
// ==========================
async function buildDashboard() {
    let msg = "🏆 WORLD FOOTBALL DASHBOARD\n\n";

    const matches = await get(
        "https://api.football-data.org/v4/matches",
        "matches"
    );

    msg += "📌 MATCH RESULTS\n";
    msg += formatMatches(matches?.matches || []);

    msg += "\n📅 UPCOMING MATCHES\n";
    msg += formatSchedule(matches?.matches || []);

    const ucl = await get(
        "https://api.football-data.org/v4/competitions/CL/matches",
        "ucl"
    );

    msg += "\n🏆 CHAMPIONS LEAGUE\n";
    msg += formatSchedule(ucl?.matches || []);

    if (msg.length > 3900) {
        msg = msg.slice(0, 3900) + "\n...(cut)";
    }

    return msg;
}

// ==========================
// SEND TELEGRAM
// ==========================
async function sendTelegram(text) {
    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: "MarkdownV2"
        }
    );
}

// ==========================
// RUN
// ==========================
(async () => {
    try {
        const dashboard = await buildDashboard();
        await sendTelegram(dashboard);
        console.log("✅ SENT");
    } catch (e) {
        console.log("❌ ERROR:", e.message);
    }
})();
