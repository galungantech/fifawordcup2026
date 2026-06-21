const axios = require("axios");
const FormData = require("form-data");
const { renderImage } = require("./imageRenderer");

// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MESSAGE_ID = 74;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = { "X-Auth-Token": FOOTBALL_DATA_TOKEN };

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
// STATUS STYLE
// ==========================
function statusClass(status) {
    if (status === "IN_PLAY") return "live";
    if (status === "FINISHED") return "ft";
    return "upcoming";
}

function statusText(status) {
    if (status === "IN_PLAY") return "🔴 LIVE";
    if (status === "FINISHED") return "⚪ FT";
    return "⏳";
}

// ==========================
// LIVE MATCH
// ==========================
function liveMatch(matches) {
    const live = (matches || []).filter(m =>
        ["IN_PLAY", "PAUSED"].includes(m.status)
    )[0];

    if (!live) return "";

    return `
<div class="card live">
<div class="title">🔴 LIVE NOW</div>
${live.homeTeam?.name} ${live.score?.fullTime?.home ?? 0}
 - 
${live.score?.fullTime?.away ?? 0} ${live.awayTeam?.name}
</div>
`;
}

// ==========================
// MATCH LIST
// ==========================
function matchList(matches) {
    return (matches || []).slice(0, 5).map(m => `
<div class="card ${statusClass(m.status)}">
<div class="title">${statusText(m.status)} ${m.homeTeam?.name} vs ${m.awayTeam?.name}</div>
<div class="small">Score: ${m.score?.fullTime?.home ?? "-"} - ${m.score?.fullTime?.away ?? "-"}</div>
</div>
`).join("");
}

// ==========================
// UPCOMING
// ==========================
function upcoming(matches) {
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

        return `
<div class="card upcoming">
<div class="title">📅 ${date} ${time}</div>
<div>${m.homeTeam?.name} vs ${m.awayTeam?.name}</div>
</div>`;
    }).join("");
}

// ==========================
// STANDINGS TOP 4
// ==========================
function standingsHTML(standings) {

    const groups = (standings || [])
        .filter(s => s.type === "TOTAL")
        .slice(0, 4);

    let html = "";

    groups.forEach(g => {

        const group = (g.group || "-").replace("GROUP_", "");

        html += `
<div class="card">
<div class="title">🏆 GROUP ${group}</div>
<table>`;

        g.table.slice(0, 4).forEach(t => {
            html += `
<tr>
<td>${t.position}</td>
<td>${t.team.tla || t.team.name}</td>
<td>${t.points} pts</td>
</tr>`;
        });

        html += `</table></div>`;
    });

    return html;
}

// ==========================
// BUILD DASHBOARD
// ==========================
function buildDashboard(matches, standings) {

    return `
<h2>⚽ SOFASCORE LIVE</h2>

<div class="section">
${liveMatch(matches)}
${matchList(matches)}
</div>

<div class="section">
${upcoming(matches)}
</div>

<div class="section">
${standingsHTML(standings)}
</div>
`;
}

// ==========================
// LIVE BUTTONS
// ==========================
function buildButtons(matches) {

    const live = (matches || []).filter(m =>
        ["IN_PLAY", "PAUSED"].includes(m.status)
    );

    const buttons = [];

    live.slice(0, 3).forEach(m => {
        buttons.push([{
            text: `🔴 LIVE ${m.homeTeam?.name}`,
            url: "https://t.me/KotakBiasa?livestream"
        }]);
    });

    buttons.push([
        { text: "🏆 Klasemen FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings" }
    ]);

    buttons.push([
        { text: "📰 Berita FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026" }
    ]);

    return buttons;
}

// ==========================
// EDIT MESSAGE
// ==========================
async function editMessage(imageBuffer, buttons) {

    const form = new FormData();

    form.append("chat_id", TELEGRAM_CHAT_ID);
    form.append("message_id", MESSAGE_ID);

    form.append("media", JSON.stringify({
        type: "photo",
        media: "attach://photo",
        caption: "🏆 SOFASCORE LIVE DASHBOARD",
        parse_mode: "HTML"
    }));

    form.append("photo", imageBuffer, {
        filename: "dashboard.png",
        contentType: "image/png"
    });

    form.append("reply_markup", JSON.stringify({
        inline_keyboard: buttons
    }));

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageMedia`,
        form,
        { headers: form.getHeaders() }
    );
}

// ==========================
// RUN
// ==========================
(async () => {
    try {
        console.log("🚀 Fetch data...");

        const matchesRes = await get("https://api.football-data.org/v4/matches", "matches");
        const standingsRes = await get("https://api.football-data.org/v4/competitions/WC/standings", "standings");

        const matches = matchesRes?.matches || [];
        const standings = standingsRes?.standings || [];

        console.log("🖼 Render image...");
        const html = buildDashboard(matches, standings);
        const image = await renderImage(html);

        const buttons = buildButtons(matches);

        console.log("✏️ Editing message...");
        await editMessage(image, buttons);

        console.log("✅ SOFASCORE STYLE UPDATED");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
