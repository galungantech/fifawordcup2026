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
// FETCH API
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
// BUILD DASHBOARD HTML
// ==========================
function buildDashboardHTML(matches) {
    const rows = (matches || []).slice(0, 10).map(m => {
        let status = m.status;

        if (status === "FINISHED") status = `<span class="ft">FT</span>`;
        if (status === "IN_PLAY") status = `<span class="live">LIVE</span>`;

        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;

        const match = `${m.homeTeam?.name} ${score} ${m.awayTeam?.name}`;

        const group = (m.group || "-").replace("GROUP_", "");

        return `
        <tr>
            <td>${status}</td>
            <td>${match}</td>
            <td>${group}</td>
        </tr>`;
    }).join("");

    return `
    <h2>🏆 WORLD FOOTBALL DASHBOARD</h2>

    <table>
        <tr>
            <th>Status</th>
            <th>Match</th>
            <th>Group</th>
        </tr>
        ${rows}
    </table>
    `;
}

// ==========================
// SEND IMAGE TO TELEGRAM
// ==========================
async function sendImage(buffer) {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_CHAT_ID);
    form.append("photo", buffer, {
        filename: "dashboard.png"
    });

    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        form,
        {
            headers: form.getHeaders()
        }
    );
}

// ==========================
// RUN BOT
// ==========================
(async () => {
    try {
        const matches = await get(
            "https://api.football-data.org/v4/matches",
            "matches"
        );

        const html = buildDashboardHTML(matches?.matches || []);

        const image = await renderImage(html);

        await sendImage(image);

        console.log("✅ Dashboard image sent");
    } catch (e) {
        console.log("❌ ERROR:", e.message);
    }
})();
