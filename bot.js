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
// TABLE BUILDER
// ==========================
function buildTable(headers, rows) {
    let html = `<tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr>`;

    rows.forEach(r => {
        html += `<tr>`;
        r.forEach(c => html += `<td>${c}</td>`);
        html += `</tr>`;
    });

    // Menggunakan renderHTMLTable dari renderEngine seperti kode pertama Anda
    return renderHTMLTable(html);
}

// ==========================
// MATCHES
// ==========================
function formatMatches(matches) {
    const rows = (matches || []).slice(0, 4).map(m => {
        let status = m.status;
        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        const homeScore = m.score?.fullTime?.home ?? "-";
        const awayScore = m.score?.fullTime?.away ?? "-";

        const match = `${home} ${homeScore}-${awayScore} ${away}`;
        const group = (m.group || "-").replace(/^GROUP_/, "");

        return [status, match, group];
    });

    return buildTable(["Status", "Match", "Grp"], rows);
}

// ==========================
// SCHEDULE
// ==========================
function formatSchedule(matches) {
    const rows = (matches || []).slice(0, 4).map(m => {
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

        const match = `${m.homeTeam?.name} vs ${m.awayTeam?.name}`;

        return [`${date} ${time}`, match];
    });

    return buildTable(["WIB", "Match"], rows);
}

// ==========================
// STANDINGS
// ==========================
async function getStandings() {
    const data = await get(
        "https://api.football-data.org/v4/competitions/WC/standings",
        "standings"
    );
    return data?.standings || [];
}

function formatStandings(standings) {
    if (!standings || !standings.length) return "Klasemen belum tersedia\n";

    let html = "";
    let count = 0;

    standings.forEach(group => {
        if (group.type !== "TOTAL") return;
        if (!group.group) return;

        // 🔥 LIMIT 4 GROUP SAJA
        if (count >= 4) return;
        count++;

        const groupName = group.group.replace(/^GROUP_/, "");

        const rows = (group.table || []).slice(0, 4).map(t => [
            t.position,
            t.team?.shortName || t.team?.name,
            t.playedGames,
            t.points
        ]);

        html += `<b>🏆 GROUP ${groupName}</b>\n`;
        html += buildTable(["#", "TEAM", "P", "PTS"], rows);
        html += "\n";
    });

    return html;
}

// ==========================
// LIVE BUTTONS
// ==========================
function buildLiveButtons(matches) {
    const live = (matches || []).filter(m =>
        ["IN_PLAY", "LIVE", "PAUSED"].includes(m.status)
    ).slice(0, 4);

    const buttons = [];

    if (live.length > 0) {
        live.forEach(m => {
            buttons.push([{
                text: `🔴 LIVE: ${m.homeTeam?.shortName || m.homeTeam?.name} vs ${m.awayTeam?.shortName || m.awayTeam?.name}`,
                url: "https://t.me/+JvcxUG8-HLgwM2Zl"
            }]);
        });
    }

    buttons.push([
        {
            text: "📺 Tonton Live Streaming",
            url: "https://t.me/+JvcxUG8-HLgwM2Zl"
        }
    ]);

    return buttons;
}

// ==========================
// DASHBOARD
// ==========================
async function buildDashboard() {
    const matches = await get("https://api.football-data.org/v4/matches", "matches");
    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");
    const standings = await getStandings();

    let msg = "<b>🏆 WORLD FOOTBALL DASHBOARD</b>\n\n";

    msg += "<b>📌 MATCH RESULTS</b>\n";
    msg += formatMatches(matches?.matches || []);
    msg += "\n";

    msg += "<b>📅 UPCOMING MATCHES</b>\n";
    msg += formatSchedule(matches?.matches || []);
    msg += "\n";

    msg += "<b>🏆 CHAMPIONS LEAGUE</b>\n";
    msg += formatSchedule(ucl?.matches || []);
    msg += "\n";

    msg += "<b>📊 KLASEMEN</b>\n";
    msg += formatStandings(standings);

    if (msg.length > 3900) {
        msg = msg.slice(0, 3900) + "\n...(cut)";
    }

    return {
        text: msg,
        buttons: buildLiveButtons(matches?.matches || [])
    };
}

// ==========================
// SEND TELEGRAM
// ==========================
async function sendTelegram(dashboardData) {
    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            text: dashboardData.text,
            parse_mode: "HTML", // Diubah ke HTML agar tag <table> dari renderEngine terbaca
            reply_markup: {
                inline_keyboard: dashboardData.buttons
            }
        }
    );
}

// ==========================
// RUN
// ==========================
(async () => {
    try {
        const dashboardData = await buildDashboard();
        await sendTelegram(dashboardData);
        console.log("✅ SENT");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
