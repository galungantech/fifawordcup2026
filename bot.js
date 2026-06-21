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
// TABLE BUILDER (TEXT-BASED MONOSPACE)
// ==========================
function buildTable(headers, rows, widths) {
    // 1. Buat Header
    let tableText = headers.map((h, i) => h.padEnd(widths[i])).join(" | ") + "\n";
    
    // 2. Buat Garis Pembatas (---++---)
    let separator = widths.map(w => "-".repeat(w)).join("-+-");
    tableText += separator + "\n";

    // 3. Buat Baris Data
    rows.forEach(r => {
        tableText += r.map((c, i) => String(c).padEnd(widths[i])).join(" | ") + "\n";
    });

    // Proses lewat renderEngine jika diperlukan, lalu BUNGKUS dengan <pre> agar muncul kotak "copy" di Telegram
    const processedHtml = renderHTMLTable(tableText.trim());
    return `<pre>${processedHtml}</pre>`;
}

// ==========================
// MATCHES
// ==========================
function formatMatches(matches) {
    const rows = (matches || []).slice(0, 5).map(m => {
        let status = m.status;
        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        const homeScore = m.score?.fullTime?.home ?? "-";
        const awayScore = m.score?.fullTime?.away ?? "-";

        // Format skor: jika belum main tampilkan ---, jika sudah tampilkan angka 0-0
        const scoreStr = (m.score?.fullTime?.home !== null) ? `${homeScore}-${awayScore}` : "---";
        const match = `${home} ${scoreStr} ${away}`;
        const group = (m.group || "-").replace(/^GROUP_/, "");

        return [status, match, group];
    });

    // Tentukan lebar kolom agar sejajar rapi (Status, Match, Grp)
    return buildTable(["Status", "Match", "Grp"], rows, [6, 30, 3]);
}

// ==========================
// SCHEDULE
// ==========================
function formatSchedule(matches) {
    const rows = (matches || []).slice(0, 5).map(m => {
        const d = new Date(m.utcDate);

        const time = d.toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit"
        }).replace(".", "."); // Memastikan format jam menggunakan titik (contoh: 07.00)

        const match = `${m.homeTeam?.name} vs ${m.awayTeam?.name}`;

        return [time, match];
    });

    // Tentukan lebar kolom agar sejajar rapi (WIB, Match)
    return buildTable(["WIB", "Match"], rows, [5, 30]);
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

        if (count >= 4) return;
        count++;

        const groupName = group.group.replace(/^GROUP_/, "");

        const rows = (group.table || []).slice(0, 4).map(t => [
            t.position,
            t.team?.shortName || t.team?.name,
            t.playedGames,
            t.points
        ]);

        html += `🏆 GROUP ${groupName}\n`;
        // Tentukan lebar kolom untuk Klasemen (#, TEAM, P, PTS)
        html += buildTable(["#", "TEAM", "P", "PTS"], rows, [2, 15, 2, 3]);
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

    let msg = "🏆 WORLD FOOTBALL DASHBOARD\n\n";

    msg += "📌 MATCH RESULTS\n";
    msg += formatMatches(matches?.matches || []);
    msg += "\n";

    msg += "📅 UPCOMING MATCHES\n";
    msg += formatSchedule(matches?.matches || []);
    msg += "\n";

    msg += "🏆 CHAMPIONS LEAGUE\n";
    msg += formatSchedule(ucl?.matches || []);
    msg += "\n";

    msg += "📊 KLASEMEN\n";
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
            parse_mode: "HTML", // Wajib HTML agar tag <pre> dieksekusi sebagai monospace kotak
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
