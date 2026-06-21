const axios = require("axios");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MESSAGE_ID = 78;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = { "X-Auth-Token": FOOTBALL_DATA_TOKEN };

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
// FORMAT MATCH
// ==========================
function formatMatches(matches) {
    return (matches || []).slice(0, 4).map(m => {
        let status = m.status;
        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const h = m.homeTeam?.name || "-";
        const a = m.awayTeam?.name || "-";

        const hs = m.score?.fullTime?.home ?? "-";
        const as = m.score?.fullTime?.away ?? "-";

        return `${status.padEnd(5)} ${h.padEnd(10)} ${hs}-${as} ${a}`;
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
// STANDINGS
// ==========================
function formatStandings(standings) {

    let out = "";

    let count = 0;

    for (const g of standings || []) {

        if (g.type !== "TOTAL" || !g.group) continue;
        if (count++ >= 2) break;

        out += `GROUP ${g.group.replace("GROUP_", "")}\n`;

        out += (g.table || []).slice(0, 4).map(t =>
            `${t.position}. ${t.team?.name.padEnd(10)} P${t.playedGames} P${t.points}`
        ).join("\n");

        out += "\n\n";
    }

    return out.trim();
}

// ==========================
// BUILD MESSAGE (MULTI BLOCK)
// ==========================
async function buildSections() {

    const matches = await get("https://api.football-data.org/v4/matches", "matches");
    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");
    const standings = await get("https://api.football-data.org/v4/competitions/WC/standings", "standings");

    return {
        matches: formatMatches(matches?.matches),
        schedule: formatSchedule(matches?.matches),
        ucl: formatSchedule(ucl?.matches),
        standings: formatStandings(standings?.standings),
        live: (matches?.matches || [])
            .filter(m => ["IN_PLAY", "LIVE"].includes(m.status))
            .map(m => `${m.homeTeam?.name} vs ${m.awayTeam?.name}`)
            .join("\n")
    };
}

// ==========================
// BUTTONS
// ==========================
function buildButtons(matches) {

    const live = (matches || []).filter(m =>
        ["IN_PLAY", "LIVE", "PAUSED"].includes(m.status)
    ).slice(0, 3);

    const btn = [];

    live.forEach(m => {
        btn.push([{
            text: `🔴 LIVE: ${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
            url: "https://t.me/KotakBiasa?livestream"
        }]);
    });

    btn.push([
        { text: "📺 Streaming", url: "https://t.me/KotakBiasa?livestream" }
    ]);

    btn.push([
        { text: "🏆 Klasemen FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings" }
    ]);

    return btn;
}

// ==========================
// SEND MESSAGE
// ==========================
async function send(text, buttons) {

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: MESSAGE_ID,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: buttons },

            text: `
🏆 <b>WORLD FOOTBALL DASHBOARD</b>

📌 MATCH RESULTS
<pre>${text.matches}</pre>

📅 UPCOMING MATCHES
<pre>${text.schedule}</pre>

🏆 UCL MATCHES
<pre>${text.ucl}</pre>

📊 STANDINGS
<pre>${text.standings}</pre>

🔴 LIVE NOW
<pre>${text.live || "-"}</pre>
`
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

        const data = await buildSections();
        const buttons = buildButtons(matches?.matches);

        console.log("✏️ Updating message...");
        await send(data, buttons);

        console.log("✅ DONE (MULTI MONOSPACE BLOCK)");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
