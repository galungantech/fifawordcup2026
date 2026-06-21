const axios = require("axios");
const crypto = require("crypto");
const { renderHTMLTable } = require("./renderEngine");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MESSAGE_ID = 79;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = {
    "X-Auth-Token": FOOTBALL_DATA_TOKEN
};

// ==========================
// CACHE (ANTI SPAM EDIT)
// ==========================
let lastHash = "";

// ==========================
// FETCH
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
// HASH GENERATOR
// ==========================
function makeHash(text) {
    return crypto.createHash("md5").update(text).digest("hex");
}

// ==========================
// FORMAT MATCH
// ==========================
function formatMatches(matches) {
    return (matches || []).slice(0, 6).map(m => {

        let status = m.status;
        if (status === "FINISHED") status = "FT";
        if (status === "IN_PLAY") status = "LIVE";

        const home = m.homeTeam?.name || "-";
        const away = m.awayTeam?.name || "-";

        const hs = m.score?.fullTime?.home ?? "-";
        const as = m.score?.fullTime?.away ?? "-";

        return `<tr><td>${status}</td><td>${home} ${hs}-${as} ${away}</td></tr>`;
    }).join("\n");
}

// ==========================
// FORMAT SCHEDULE
// ==========================
function formatSchedule(matches) {
    return (matches || []).slice(0, 6).map(m => {

        const d = new Date(m.utcDate);

        const time = d.toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit"
        });

        return `<tr><td>${time}</td><td>${m.homeTeam?.name} vs ${m.awayTeam?.name}</td></tr>`;
    }).join("\n");
}

// ==========================
// BUILD MESSAGE
// ==========================
async function buildMessage() {

    const matches = await get("https://api.football-data.org/v4/matches", "matches");
    const ucl = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");

    let msg = `
🏆 WORLD FOOTBALL DASHBOARD

📌 MATCH RESULTS
${renderHTMLTable(`<tr><th>Status</th><th>Match</th></tr>${formatMatches(matches?.matches)}`)}

📅 UPCOMING
${renderHTMLTable(`<tr><th>Time</th><th>Match</th></tr>${formatSchedule(matches?.matches)}`)}

🏆 UCL
${renderHTMLTable(`<tr><th>Time</th><th>Match</th></tr>${formatSchedule(ucl?.matches)}`)}
`;

    return msg;
}

// ==========================
// EDIT MESSAGE (NO SPAM)
// ==========================
async function editMessage(text) {

    const hash = makeHash(text);

    if (hash === lastHash) {
        console.log("⏭ No change, skip edit");
        return;
    }

    lastHash = hash;

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: MESSAGE_ID,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true
        }
    );
}

// ==========================
// RUN LOOP (AUTO REFRESH)
// ==========================
async function run() {

    console.log("🚀 Fetch dashboard...");

    const text = await buildMessage();

    console.log("✏️ Updating message...");

    await editMessage(text);
}

// ==========================
// AUTO LOOP (SET INTERVAL)
// ==========================
run();
setInterval(run, 30000); // 🔥 refresh tiap 30 detik
