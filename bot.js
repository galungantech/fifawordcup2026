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
        const d = new Date(m.utcDate);
        
        // Format Tanggal: "20 Jun"
        const dateStr = d.toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short"
        });

        // Format Waktu: "07.00"
        const timeStr = d.toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit"
        }).replace(":", ".");

        const dateTimeFormatted = `${dateStr} ${timeStr} WIB`;
        const match = `${m.homeTeam?.name} vs ${m.awayTeam?.name}`;

        return `<tr><td>${dateTimeFormatted}</td><td>${match}</td></tr>`;
    }).join("\n");

    return renderHTMLTable(`
<tr><th>Tanggal & Waktu</th><th>Match</th></tr>
${rows}
`);
}

// ==========================
// FORMAT STANDINGS (HTML VERSION)
// ==========================
async function getStandings() {
    const data = await get(
        "https://api.football-data.org/v4/competitions/WC/standings",
        "standings"
    );
    return data?.standings || [];
}

function formatStandings(standings) {
    if (!standings || !standings.length) return "\nKlasemen belum tersedia\n";

    let html = "";
    let count = 0;

    standings.forEach(group => {
        if (group.type !== "TOTAL" || !group.group) return;

        // Batasi hanya menampilkan 4 grup pertama agar tidak over-character
        if (count >= 4) return;
        count++;

        const groupName = group.group.replace("GROUP_", "");

        const rows = (group.table || []).slice(0, 4).map(t => {
            const teamName = t.team?.shortName || t.team?.name || "-";
            return `<tr><td>${t.position}</td><td>${teamName}</td><td>${t.playedGames}</td><td>${t.points}</td></tr>`;
        }).join("\n");

        const tableHtml = renderHTMLTable(`
<tr><th>#</th><th>TEAM</th><th>P</th><th>PTS</th></tr>
${rows}
`);
        
        html += `\n🏆 GROUP ${groupName}\n${tableHtml}`;
    });

    return html;
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

    // Tambahan info Klasemen
    msg += "\n📊 KLASEMEN";
    const standingsData = await getStandings();
    msg += formatStandings(standingsData);

    if (msg.length > 3900) {
        msg = msg.slice(0, 3900) + "\n...(cut)";
    }

    return msg;
}

// ==========================
// SEND TELEGRAM
// ==========================
async function sendTelegram(text) {
    // Escape karakter khusus MarkdownV2 untuk teks statis di luar tabel agar tidak memicu error parsing
    const escapedText = text
        .replace(/-/g, "\\-")
        .replace(/\./g, "\\.")
        .replace(/\!/g, "\\!");

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            text: escapedText,
            parse_mode: "MarkdownV2",
            reply_markup: {
                inline_keyboard: [
                    [{"text": "🔴 Tonton Live Streaming", "url": "https://t.me/KotakBiasa?livestream"}],
                    [{"text": "🏆 Klasemen Lengkap FIFA", "url": "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings"}],
                    [{"text": "📰 Berita Terbaru FIFA", "url": "https://www.fifa.com/en/tournaments/mens/worldcup/2026"}]
                ]
            }
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
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
