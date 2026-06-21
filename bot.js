const axios = require("axios");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MESSAGE_ID = 74;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = {
    "X-Auth-Token": FOOTBALL_DATA_TOKEN
};

// ==========================
// FETCH SAFE
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
    return (matches || [])
        .slice(0, 4)
        .map(m => {
            const home = m.homeTeam?.name;
            const away = m.awayTeam?.name;
            const hs = m.score?.fullTime?.home ?? "-";
            const as = m.score?.fullTime?.away ?? "-";

            let status = m.status;
            if (status === "FINISHED") status = "FT";
            if (status === "IN_PLAY") status = "LIVE";

            return `• ${status} | ${home} ${hs}-${as} ${away}`;
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

            return `• ${date} ${time} | ${m.homeTeam?.name} vs ${m.awayTeam?.name}`;
        })
        .join("\n");
}

// ==========================
// FORMAT STANDINGS
// ==========================
function formatStandings(standings) {
    let text = "";
    let count = 0;

    (standings || []).forEach(g => {
        if (g.type !== "TOTAL") return;
        if (!g.group) return;
        if (count >= 4) return;

        count++;

        const groupName = g.group.replace("GROUP_", "");

        text += `\n🏆 GROUP ${groupName}\n`;

        text += g.table.slice(0, 4).map(t =>
            `• ${t.position}. ${t.team?.name} (${t.points} pts)`
        ).join("\n");

        text += "\n";
    });

    return text;
}

// ==========================
// LIVE BUTTONS
// ==========================
function buildLiveButtons(matches) {

    const live = (matches || [])
        .filter(m => ["IN_PLAY", "LIVE", "PAUSED"].includes(m.status))
        .slice(0, 3);

    const buttons = [];

    live.forEach(m => {
        buttons.push([{
            text: `🔴 LIVE: ${m.homeTeam?.name}`,
            url: "https://t.me/KotakBiasa?livestream"
        }]);
    });

    buttons.push([
        {
            text: "📺 Live Streaming",
            url: "https://t.me/KotakBiasa?livestream"
        }
    ]);

    return buttons;
}

// ==========================
// BUILD TEXT DASHBOARD
// ==========================
async function buildDashboard() {

    const matches = await get("https://api.football-data.org/v4/matches", "matches");
    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");
    const standings = await get("https://api.football-data.org/v4/competitions/WC/standings", "standings");

    let text = `🏆 WORLD FOOTBALL DASHBOARD\n\n`;

    text += `📌 MATCH RESULTS\n${formatMatches(matches?.matches)}\n\n`;

    text += `📅 UPCOMING\n${formatSchedule(matches?.matches)}\n\n`;

    text += `🏆 UCL\n${formatSchedule(ucl?.matches)}\n\n`;

    text += `📊 STANDINGS\n${formatStandings(standings?.standings)}\n`;

    return { text, matches: matches?.matches || [] };
}

// ==========================
// EDIT MESSAGE TEXT
// ==========================
async function editMessage(text, buttons) {

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: MESSAGE_ID,
            text: text.slice(0, 3900),
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

        const { text, matches } = await buildDashboard();

        const buttons = buildLiveButtons(matches);

        console.log("✏️ Editing message...");
        await editMessage(text, buttons);

        console.log("✅ DONE (TEXT MODE, NO IMAGE)");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
