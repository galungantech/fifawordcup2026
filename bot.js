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
// UTILS
// ==========================
function pad(str, size) {
    str = String(str ?? "-");
    return str.length > size ? str.slice(0, size - 1) + "…" : str + " ".repeat(size - str.length);
}

function timeWIB(date) {
    return new Date(date).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit"
    });
}

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
// TABLE RENDER ENGINE (CORE)
// ==========================
function renderTable(headers, rows) {
    const colWidths = headers.map((h, i) =>
        Math.max(
            h.length,
            ...rows.map(r => String(r[i] ?? "").length)
        )
    );

    const formatRow = (row) =>
        row.map((cell, i) => pad(cell, colWidths[i])).join(" | ");

    const line = colWidths.map(w => "-".repeat(w)).join("-|-");

    let out = "";
    out += formatRow(headers) + "\n";
    out += line + "\n";

    rows.forEach(r => {
        out += formatRow(r) + "\n";
    });

    return "```\n" + out + "```";
}

// ==========================
// MATCH TABLE
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

        return [status, match, group];
    });

    return renderTable(
        ["STATUS", "MATCH", "GRP"],
        rows
    );
}

// ==========================
// SCHEDULE TABLE
// ==========================
function formatSchedule(matches) {
    const rows = (matches || []).slice(0, 10).map(m => {
        return [
            timeWIB(m.utcDate),
            `${m.homeTeam?.name} vs ${m.awayTeam?.name}`
        ];
    });

    return renderTable(
        ["WIB", "MATCH"],
        rows
    );
}

// ==========================
// DASHBOARD BUILDER
// ==========================
async function buildDashboard() {
    let msg = "🏆 WORLD FOOTBALL DASHBOARD\n\n";

    const matches = await get(
        "https://api.football-data.org/v4/matches",
        "matches"
    );

    msg += "📌 MATCH RESULTS\n";
    msg += formatMatches(matches?.matches || []);

    msg += "\n\n📅 UPCOMING MATCHES\n";
    msg += formatSchedule(matches?.matches || []);

    const ucl = await get(
        "https://api.football-data.org/v4/competitions/CL/matches",
        "ucl"
    );

    msg += "\n\n🏆 CHAMPIONS LEAGUE\n";
    msg += formatSchedule(ucl?.matches || []);

    if (msg.length > 3900) {
        msg = msg.slice(0, 3900) + "\n...(cut)";
    }

    return msg;
}

// ==========================
// SEND TELEGRAM
// ==========================
async function sendTelegram(text) {
    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: "MarkdownV2"
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
        console.log("✅ Sent");
    } catch (e) {
        console.log("❌ Fatal:", e.message);
    }
})();
