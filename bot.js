const axios = require("axios");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MESSAGE_ID = 78;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = {
    "X-Auth-Token": FOOTBALL_DATA_TOKEN
};

// ==========================
// FETCH
// ==========================
async function get(url, label) {
    try {
        const res = await axios.get(url, { headers });
        return res.data;
    } catch (e) {
        console.log("❌", label, e.message);
        return null;
    }
}

// ==========================
// FORMAT MATCHES
// ==========================
function formatMatches(matches) {
    return (matches || []).slice(0, 4).map(m => {

        let status = m.status;
        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        const hs = m.score?.fullTime?.home ?? "-";
        const as = m.score?.fullTime?.away ?? "-";

        return `${status.padEnd(5)} ${home} ${hs}-${as} ${away}`;
    }).join("\n");
}

// ==========================
// FORMAT SCHEDULE
// ==========================
function formatSchedule(matches) {
    return (matches || []).slice(0, 4).map(m => {

        const d = new Date(m.utcDate);

        const date = d.toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short"
        });

        const time = d.toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit"
        });

        return `${date} ${time} | ${m.homeTeam?.name} vs ${m.awayTeam?.name}`;
    }).join("\n");
}

// ==========================
// STANDINGS SIMPLE
// ==========================
function formatStandings(standings) {

    let out = "";

    let count = 0;

    for (const g of standings || []) {

        if (g.type !== "TOTAL" || !g.group) continue;
        if (count++ >= 2) break;

        out += `\nGROUP ${g.group.replace("GROUP_", "")}\n`;

        out += (g.table || []).slice(0, 4).map(t =>
            `${t.position}. ${t.team?.name} P${t.playedGames} P${t.points}`
        ).join("\n") + "\n";
    }

    return out;
}

// ==========================
// BUILD MESSAGE
// ==========================
async function buildMessage() {

    const matches = await get("https://api.football-data.org/v4/matches", "matches");
    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");
    const standings = await get("https://api.football-data.org/v4/competitions/WC/standings", "standings");

    return `
🏆 WORLD FOOTBALL DASHBOARD

📌 MATCH RESULTS
────────────────────
${formatMatches(matches?.matches)}

📅 UPCOMING
────────────────────
${formatSchedule(matches?.matches)}

🏆 UCL
────────────────────
${formatSchedule(ucl?.matches)}

📊 STANDINGS
────────────────────
${formatStandings(standings?.standings)}

`;
}

// ==========================
// LIVE BUTTONS
// ==========================
function buildButtons(matches) {

    const live = (matches || []).filter(m =>
        ["IN_PLAY", "LIVE", "PAUSED"].includes(m.status)
    ).slice(0, 3);

    const buttons = [];

    live.forEach(m => {
        buttons.push([{
            text: `🔴 LIVE: ${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
            url: "https://t.me/KotakBiasa?livestream"
        }]);
    });

    buttons.push([
        { text: "📺 Tonton Live Streaming", url: "https://t.me/KotakBiasa?livestream" }
    ]);

    buttons.push([
        { text: "🏆 Klasemen FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings" }
    ]);

    return buttons;
}

// ==========================
// SEND EDIT MESSAGE TEXT
// ==========================
async function editMessage(text, buttons) {

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: MESSAGE_ID,
            text: `<pre>${text}</pre>`,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: buttons
            }
        }
    );
}

// ==========================
// RUN
// ==========================
(async () => {
    try {

        console.log("🚀 Fetch data...");

        const matches = await get("https://api.football-data.org/v4/matches", "matches");

        const text = await buildMessage();
        const buttons = buildButtons(matches?.matches);

        console.log("✏️ Updating message...");
        await editMessage(text, buttons);

        console.log("✅ DONE (TEXT MODE MONOSPACE)");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
