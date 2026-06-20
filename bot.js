const axios = require("axios");
const FormData = require("form-data");
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
// TABLE BUILDER
// ==========================
function buildTable(headers, rows) {
    let html = `<table><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr>`;

    rows.forEach(r => {
        html += `<tr>`;
        r.forEach(c => html += `<td>${c}</td>`);
        html += `</tr>`;
    });

    return html + `</table>`;
}

// ==========================
// MATCHES
// ==========================
function formatMatches(matches) {
    const rows = (matches || []).slice(0, 6).map(m => {
        let status = m.status;

        if (status === "FINISHED") status = `<span class="ft">FT</span>`;
        if (status === "IN_PLAY") status = `<span class="live">LIVE</span>`;

        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;
        const match = `${m.homeTeam?.name} ${score} ${m.awayTeam?.name}`;

        const group = (m.group || "-")
            .replace("GROUP_", "")
            .replace("GROUP-", "");

        return [status, match, group];
    });

    return buildTable(["STATUS", "MATCH", "GROUP"], rows);
}

// ==========================
// SCHEDULE (FIXED FORMAT)
// ==========================
function formatSchedule(matches) {
    const rows = (matches || []).slice(0, 6).map(m => {

        const dateObj = new Date(m.utcDate);

        const date = dateObj.toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short"
        });

        const time = dateObj.toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit"
        });

        const match = `${m.homeTeam?.name} vs ${m.awayTeam?.name}`;

        const group = (m.group || "-")
            .replace("GROUP_", "")
            .replace("GROUP-", "");

        const dateTime = `${date} ${time} WIB`;

        return [dateTime, match, group];
    });

    return buildTable(
        ["TANGGAL & WAKTU", "MATCH", "GROUP"],
        rows
    );
}

// ==========================
// HTML DASHBOARD
// ==========================
async function buildDashboardHTML() {

    const matches = await get("https://api.football-data.org/v4/matches", "matches");
    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");

    return `
<h2>⚽ WORLD FOOTBALL DASHBOARD</h2>

<h3>📌 MATCH RESULTS</h3>
${formatMatches(matches?.matches || [])}

<h3>📅 UPCOMING MATCHES</h3>
${formatSchedule(matches?.matches || [])}

<h3>🏆 CHAMPIONS LEAGUE</h3>
${formatSchedule(ucl?.matches || [])}
`;
}

// ==========================
// LIVE BUTTONS
// ==========================
function buildLiveButtons(matches) {
    const LIVE_STATUS = ["IN_PLAY", "LIVE", "INPROGRESS", "PAUSED"];

    const liveMatches = (matches || [])
        .filter(m => LIVE_STATUS.includes(m.status))
        .slice(0, 5);

    // ❗ kalau tidak ada LIVE → jangan paksa tombol fallback
    if (liveMatches.length === 0) {
        return [];
    }

    return liveMatches.map(m => ([
        {
            text: `🔴 LIVE: ${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
            url: "https://t.me/KotakBiasa?livestream"
        }
    ]));
}

// ==========================
// SEND IMAGE
// ==========================
async function sendTelegramImage(buffer, matches) {
    const form = new FormData();

    form.append("chat_id", TELEGRAM_CHAT_ID);

    form.append("photo", buffer, {
        filename: "dashboard.png",
        contentType: "image/png"
    });

    form.append("caption", "🏆 WORLD FOOTBALL DASHBOARD");

    form.append("reply_markup", JSON.stringify({
        inline_keyboard: [
            ...buildLiveButtons(matches),
            [
                {
                    text: "🏆 Klasemen FIFA",
                    url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings"
                }
            ],
            [
                {
                    text: "📰 Berita FIFA",
                    url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026"
                }
            ]
        ]
    }));

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        form,
        {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    );
}

// ==========================
// RUN
// ==========================
(async () => {
    try {
        console.log("🚀 Building dashboard...");

        const matchesData = await get("https://api.football-data.org/v4/matches", "matches");

        const html = await buildDashboardHTML();

        console.log("🖼 Rendering image...");
        const image = await renderImage(html);

        console.log("📤 Sending to Telegram...");
        await sendTelegramImage(image, matchesData?.matches || []);

        console.log("✅ SUCCESS");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
