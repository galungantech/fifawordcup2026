const axios = require("axios");
const { renderImage } = require("./imageRenderer");

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
// FETCH SAFE
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
// BUILD HTML TABLE
// ==========================
function buildTable(headers, rows) {
    let html = `<table><tr>`;

    headers.forEach(h => {
        html += `<th>${h}</th>`;
    });

    html += `</tr>`;

    rows.forEach(r => {
        html += `<tr>`;
        r.forEach(c => {
            html += `<td>${c}</td>`;
        });
        html += `</tr>`;
    });

    html += `</table>`;
    return html;
}

// ==========================
// FORMAT MATCHES
// ==========================
function formatMatches(matches) {
    const rows = (matches || []).slice(0, 6).map(m => {
        let status = m.status;
        if (status === "FINISHED") status = `<span class="ft">FT</span>`;
        if (status === "IN_PLAY") status = `<span class="live">LIVE</span>`;

        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;
        const match = `${m.homeTeam?.name} ${score} ${m.awayTeam?.name}`;
        const group = (m.group || "-").replace("GROUP_", "");

        return [status, match, group];
    });

    return buildTable(
        ["STATUS", "MATCH", "GRP"],
        rows
    );
}

// ==========================
// FORMAT SCHEDULE
// ==========================
function formatSchedule(matches) {
    const rows = (matches || []).slice(0, 6).map(m => {
        const time = new Date(m.utcDate).toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit"
        });

        const match = `${m.homeTeam?.name} vs ${m.awayTeam?.name}`;

        return [time, match, m.group || "-"];
    });

    return buildTable(
        ["WIB", "MATCH", "GRP"],
        rows
    );
}

// ==========================
// DASHBOARD HTML
// ==========================
async function buildDashboardHTML() {

    const matches = await get("https://api.football-data.org/v4/matches", "matches");

    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");

    const html = `
<h2>⚽ WORLD FOOTBALL DASHBOARD</h2>

<h3>📌 MATCH RESULTS</h3>
${formatMatches(matches?.matches || [])}

<h3>📅 UPCOMING MATCHES</h3>
${formatSchedule(matches?.matches || [])}

<h3>🏆 CHAMPIONS LEAGUE</h3>
${formatSchedule(ucl?.matches || [])}
`;

    return html;
}

// ==========================
// SEND IMAGE TO TELEGRAM
// ==========================
async function sendTelegramImage(buffer) {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_CHAT_ID);
    form.append("photo", buffer, { filename: "dashboard.png" });

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        form,
        { headers: form.getHeaders() }
    );
}

// ==========================
// RUN
// ==========================
(async () => {
    try {
        const html = await buildDashboardHTML();

        const image = await renderImage(html);

        await sendTelegramImage(image);

        console.log("✅ IMAGE DASHBOARD SENT");
    } catch (e) {
        console.log("❌ ERROR:", e.message);
    }
})();
