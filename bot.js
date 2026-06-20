const axios = require("axios");
const FormData = require("form-data");
const { renderImage } = require("./imageRenderer");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MESSAGE_ID = 114; // <-- PENTING (simpan dari pesan pertama)
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
// TABLE BUILDER (HTML IMAGE)
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
// FORMAT MATCHES
// ==========================
function formatMatches(matches) {
    const rows = (matches || []).slice(0, 6).map(m => {
        let status = m.status;

        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;

        const match = `${m.homeTeam?.name} ${score} vs ${m.awayTeam?.name}`;

        const group = (m.group || "-").replace("GROUP_", "");

        return [status, match, group];
    });

    return buildTable(["STATUS", "MATCH", "GROUP"], rows);
}

// ==========================
// SCHEDULE
// ==========================
function formatSchedule(matches) {
    const rows = (matches || []).slice(0, 6).map(m => {

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
        const group = (m.group || "-").replace("GROUP_", "");

        return [`${date} ${time} WIB`, match, group];
    });

    return buildTable(
        ["TANGGAL & WAKTU", "MATCH", "GROUP"],
        rows
    );
}

// ==========================
// LIVE BUTTONS
// ==========================
function buildLiveButtons(matches) {

    const live = (matches || [])
        .filter(m =>
            ["IN_PLAY", "LIVE", "PAUSED"].includes(m.status)
        )
        .slice(0, 4); // sisakan ruang iklan

    const buttons = [];

    // ==========================
    // LIVE MATCH BUTTONS
    // ==========================
    if (live.length > 0) {
        live.forEach(m => {
            buttons.push([{
                text: `🔴 LIVE: ${m.homeTeam?.name} vs ${m.awayTeam?.name}`,
                url: "https://t.me/KotakBiasa?livestream"
            }]);
        });
    }

    // ==========================
    // SLOT IKLAN / STREAMING (SELALU ADA)
    // ==========================
    buttons.push([
        {
            text: "📺 Tonton Live Streaming",
            url: "https://t.me/KotakBiasa?livestream"
        }
    ]);

    return buttons;
}

// ==========================
// BUILD HTML IMAGE
// ==========================
async function buildDashboardHTML() {
    const matches = await get("https://api.football-data.org/v4/matches", "matches");
    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");

    return `
<h2>⚽ WORLD FOOTBALL DASHBOARD</h2>

<h3>📌 MATCH RESULTS</h3>
${formatMatches(matches?.matches || [])}

<h3>📅 UPCOMING</h3>
${formatSchedule(matches?.matches || [])}

<h3>🏆 UCL</h3>
${formatSchedule(ucl?.matches || [])}
`;
}

// ==========================
// EDIT MESSAGE MEDIA (GANTI GAMBAR)
// ==========================
async function editMessage(imageBuffer, caption, buttons) {

    const form = new FormData();

    form.append("chat_id", TELEGRAM_CHAT_ID);
    form.append("message_id", MESSAGE_ID);

    form.append("media", JSON.stringify({
        type: "photo",
        media: "attach://photo",
        caption: caption,
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

        const matchesData = await get("https://api.football-data.org/v4/matches", "matches");

        console.log("🖼 Render image...");
        const html = await buildDashboardHTML();
        const image = await renderImage(html);

        const buttons = [
            ...buildLiveButtons(matchesData?.matches || []),
            [
                { text: "🏆 Klasemen FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings" }
            ],
            [
                { text: "📰 Berita FIFA", url: "https://www.fifa.com/en/tournaments/mens/worldcup/2026" }
            ]
        ];

        console.log("✏️ Editing message...");
        await editMessage(image, "🏆 WORLD FOOTBALL DASHBOARD", buttons);

        console.log("✅ SUCCESS (EDIT MODE - NO SPAM)");
    } catch (e) {
        console.log("❌ ERROR:", e.response?.data || e.message);
    }
})();
