const axios = require("axios");

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
// BUILD HTML TABLE BLOCK
// ==========================
function buildTable(headers, rows) {
    let table = `<table border="1">`;

    table += `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;

    rows.forEach(r => {
        table += `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`;
    });

    table += `</table>`;
    return table;
}

// ==========================
// FORMAT MATCHES
// ==========================
function formatMatches(matches) {
    const rows = (matches || []).slice(0, 6).map(m => {
        let status = m.status;

        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;
        const match = `${m.homeTeam?.name} ${score} ${m.awayTeam?.name}`;
        const group = (m.group || "-").replace("GROUP_", "");

        return [status, match, group];
    });

    return buildTable(
        ["Status", "Match", "Grp"],
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
        ["Waktu", "Match", "Grp"],
        rows
    );
}

// ==========================
// STATIC DATA (SEPERTI BASH KAMU)
// ==========================
function getStaticData() {
    return {
        topSkor: buildTable(
            ["Gol", "Pemain", "Negara"],
            [
                ["3", "🐐 Lionel Messi", "🇦🇷 ARG"],
                ["3", "Jonathan David", "🇨🇦 CAN"],
                ["2", "Folarin Balogun", "🇺🇸 USA"]
            ]
        ),

        klasemenA: buildTable(
            ["Tim", "M", "Poin"],
            [
                ["🇲🇽 Meksiko", "2", "6"],
                ["🇰🇷 Korea Selatan", "2", "3"]
            ]
        ),

        fakta: `
<ul>
<li>📌 Format baru: <b>48 tim</b></li>
<li>🏟 Digelar di 3 negara</li>
<li>⚡ Gol tercepat: 71 detik</li>
</ul>`
    };
}

// ==========================
// BUILD DASHBOARD HTML
// ==========================
async function buildDashboard() {

    const matches = await get(
        "https://api.football-data.org/v4/matches",
        "matches"
    );

    const ucl = await get(
        "https://api.football-data.org/v4/competitions/CL/matches",
        "ucl"
    );

    const staticData = getStaticData();

    const html = `
<h2>⚽ Piala Dunia FIFA 2026</h2>
<h3>🗓 ${new Date().toLocaleDateString("id-ID")}</h3>

<hr>

<h3>🏆 Hasil Pertandingan Hari Ini</h3>
${formatMatches(matches?.matches || [])}

<br>

<h3>📅 Jadwal Besok</h3>
${formatSchedule(matches?.matches || [])}

<br>

<h3>🏆 Champions League</h3>
${formatSchedule(ucl?.matches || [])}

<br>

<h3>🥇 Top Skor</h3>
${staticData.topSkor}

<br>

<h3>📊 Klasemen Grup A</h3>
${staticData.klasemenA}

<br>

<h3>🎯 Fakta Menarik</h3>
${staticData.fakta}
`;

    return html;
}

// ==========================
// SEND TELEGRAM (HTML MODE)
// ==========================
async function sendTelegram(html) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: html,
                parse_mode: "HTML"
            }
        );

        console.log("✅ DASHBOARD SENT");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
}

// ==========================
// RUN
// ==========================
(async () => {
    const dashboard = await buildDashboard();
    await sendTelegram(dashboard);
})();
