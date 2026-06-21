const axios = require("axios");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MESSAGE_ID = 79; // WAJIB dari pesan pertama
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = { "X-Auth-Token": FOOTBALL_DATA_TOKEN };

// ==========================
// FETCH SAFE
// ==========================
async function get(url, label) {
    try {
        const res = await axios.get(url, { headers });
        return res.data;
    } catch (e) {
        return null;
    }
}

// ==========================
// FORMAT DATE
// ==========================
function nowWIB() {
    return new Date().toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// ==========================
// FORMAT MATCHES MONOSPACE
// ==========================
function formatMatches(matches) {
    return (matches || [])
        .slice(0, 4)
        .map(m => {
            let status = m.status;
            if (status === "FINISHED") status = "FT";
            if (status === "IN_PLAY") status = "LIVE";

            const home = m.homeTeam?.tla || m.homeTeam?.name?.slice(0,3).toUpperCase();
            const away = m.awayTeam?.tla || m.awayTeam?.name?.slice(0,3).toUpperCase();

            const hs = m.score?.fullTime?.home ?? "-";
            const aS = m.score?.fullTime?.away ?? "-";

            const group = (m.group || "-").replace("GROUP_", "");

            return `${status.padEnd(4)} | ${home} ${hs}-${aS} ${away} | GRP ${group}`;
        })
        .join("\n");
}

// ==========================
// FORMAT SCHEDULE
// ==========================
function formatSchedule(matches) {
    return (matches || [])
        .slice(0, 4)
        .map(m => {
            const t = new Date(m.utcDate).toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit"
            });

            const home = m.homeTeam?.tla || "???";
            const away = m.awayTeam?.tla || "???";

            const group = (m.group || "-").replace("GROUP_", "");

            return `${t} | ${home} vs ${away} | GRP ${group}`;
        })
        .join("\n");
}

// ==========================
// STANDINGS (4 GROUP SAJA)
// ==========================
function formatStandings(standings) {
    let out = [];
    let count = 0;

    for (const g of standings || []) {
        if (g.type !== "TOTAL") continue;
        if (!g.group) continue;
        if (count++ >= 4) break;

        const teams = g.table.slice(0, 4)
            .map(t => `${t.team?.tla} ${t.points}`)
            .join(" | ");

        out.push(`${g.group.replace("GROUP_", "")}: ${teams}`);
    }

    return out.join("\n");
}

// ==========================
// LIVE BUTTONS
// ==========================
function buildButtons(matches) {
    const live = (matches || [])
        .filter(m => ["IN_PLAY", "LIVE", "PAUSED"].includes(m.status))
        .slice(0, 3);

    const buttons = [];

    if (live.length) {
        for (const m of live) {
            buttons.push([{
                text: `🔴 ${m.homeTeam?.tla} vs ${m.awayTeam?.tla}`,
                url: "https://t.me/KotakBiasa?livestream"
            }]);
        }
    }

    buttons.push([
        { text: "🏆 Klasemen FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings" }
    ]);

    buttons.push([
        { text: "📰 Berita FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026" }
    ]);

    return buttons;
}

// ==========================
// BUILD TEXT DASHBOARD
// ==========================
function buildText(matches, ucl, standings) {

    return `
🏆 WORLD FOOTBALL DASHBOARD
📅 ${nowWIB()} (WIB)

📌 MATCH RESULTS
────────────────────
${formatMatches(matches)}
────────────────────

📅 UPCOMING
────────────────────
${formatSchedule(matches)}
────────────────────

🏆 UCL
────────────────────
${formatSchedule(ucl)}
────────────────────

📊 KLASEMEN
────────────────────
${formatStandings(standings)}
`;
}

// ==========================
// EDIT MESSAGE
// ==========================
async function editMessage(text, buttons) {
    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: MESSAGE_ID,
            text,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: buttons }
        }
    );
}

// ==========================
// RUN
// ==========================
(async () => {
    console.log("🚀 fetching...");

    const matches = (await get("https://api.football-data.org/v4/matches"))?.matches;
    const ucl = (await get("https://api.football-data.org/v4/competitions/CL/matches"))?.matches;
    const standings = (await get("https://api.football-data.org/v4/competitions/WC/standings"))?.standings;

    const text = buildText(matches, ucl, standings);
    const buttons = buildButtons(matches);

    console.log("✏️ editing...");
    await editMessage(text, buttons);

    console.log("✅ DONE");
})();
