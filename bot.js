const axios = require("axios");
const fs = require("fs");

// ==========================
// CONFIG
// ==========================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_MESSAGE_ID = process.env.TELEGRAM_MESSAGE_ID || 83; 
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
// GENERATE HTML FOR RICH_MESSAGE
// ==========================
// ==========================
// GENERATE HTML FOR RICH_MESSAGE (ENGLISH & INLINE ALIGN CENTER)
// ==========================
async function buildHtmlContent() {
    // 1. FETCH MATCH RESULTS
    const matchesData = await get("https://api.football-data.org/v4/matches", "matches");
    const matches = matchesData?.matches || [];

    let matchRows = matches.slice(0, 10).map(m => {
        let status = m.status === "FINISHED" ? "FT" : (m.status === "IN_PLAY" ? "LIVE" : m.status);
        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;
        const matchName = `${m.homeTeam?.name} ${score} ${m.awayTeam?.name}`;
        let group = (m.group || "-").replace("GROUP_", "");
        
        // Menggunakan atribut align="center" langsung pada td agar pasti rata tengah
        return `<tr align="center">
            <td align="center">${status}</td>
            <td align="center">${matchName}</td>
            <td align="center">${group}</td>
        </tr>`;
    }).join("\n");

    // 2. FETCH UPCOMING MATCHES (SCHEDULE)
    let upcomingRows = matches.filter(m => m.status === "TIMED").slice(0, 5).map(m => {
        const d = new Date(m.utcDate);
        const dateStr = d.toLocaleDateString("en-US", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" });
        const timeStr = d.toLocaleTimeString("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
        const dateTimeFormatted = `${dateStr} ${timeStr} WIB`;
        
        return `<tr align="center">
            <td align="center">${dateTimeFormatted}</td>
            <td align="center">${m.homeTeam?.name} vs ${m.awayTeam?.name}</td>
        </tr>`;
    }).join("\n");
    if (!upcomingRows) upcomingRows = `<tr align="center"><td colspan="2" align="center">No upcoming matches available</td></tr>`;

    // 3. FETCH CHAMPIONS LEAGUE (UCL)
    const uclData = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");
    const uclMatches = uclData?.matches || [];

    let uclRows = uclMatches.slice(0, 10).map(m => {
        const d = new Date(m.utcDate);
        const dateStr = d.toLocaleDateString("en-US", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" });
        const timeStr = d.toLocaleTimeString("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
        const dateTimeFormatted = `${dateStr} ${timeStr} WIB`;
        
        return `<tr align="center">
            <td align="center">${dateTimeFormatted}</td>
            <td align="center">${m.homeTeam?.name} vs ${m.awayTeam?.name}</td>
        </tr>`;
    }).join("\n");
    if (!uclRows) uclRows = `<tr align="center"><td colspan="2" align="center">No UCL matches available</td></tr>`;

    // 4. FETCH WORLD CUP STANDINGS (All Groups A-H)
    const standingsData = await get("https://api.football-data.org/v4/competitions/WC/standings", "standings");
    const standings = standingsData?.standings || [];
    
    let standingsHtml = "";

    standings.forEach(group => {
        if (group.type !== "TOTAL" || !group.group) return;

        const groupName = group.group.replace("GROUP_", "");
        const rows = (group.table || []).slice(0, 4).map(t => {
            const teamName = t.team?.shortName || t.team?.name || "-";
            return `<tr align="center">
                <td align="center">${t.position}</td>
                <td align="center">${teamName}</td>
                <td align="center">${t.playedGames}</td>
                <td align="center"><b>${t.points}</b></td>
            </tr>`;
        }).join("\n");

        standingsHtml += `
        <h4>🏆 GROUP ${groupName}</h4>
        <table border="1" width="100%">
            <tr align="center">
                <th align="center" style="width: 10%">#</th>
                <th align="center" style="width: 60%">TEAM</th>
                <th align="center" style="width: 15%">P</th>
                <th align="center" style="width: 15%">PTS</th>
            </tr>
            ${rows}
        </table>`;
    });
    if (!standingsHtml) standingsHtml = `<p align="center">Standings data not available</p>`;

    // Styling CSS Fallback
    const styleBlock = `
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-family: sans-serif;
            font-size: 13px;
        }
        th, td {
            border: 1px solid #2f3e4e;
            padding: 8px;
            text-align: center !important;
            vertical-align: middle;
        }
        th {
            background-color: #202b36;
            color: #8fa1b2;
            font-weight: bold;
        }
        summary {
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            margin-top: 15px;
            margin-bottom: 8px;
            padding: 4px;
            outline: none;
        }
        h3 {
            margin-top: 20px;
            margin-bottom: 8px;
            font-size: 15px;
            border-bottom: 1px dashed #2f3e4e;
            padding-bottom: 4px;
        }
        h4 {
            margin-top: 10px;
            margin-bottom: 5px;
            font-size: 13px;
        }
    </style>
    `;

    // Return HTML dengan menu berbahasa Inggris dan tag collapse <details>
    return `
    ${styleBlock}
    
    <h3>📌 MATCH RESULTS</h3>
    <table border="1" width="100%">
        <tr align="center">
            <th align="center" style="width: 25%">Status</th>
            <th align="center" style="width: 60%">Match</th>
            <th align="center" style="width: 15%">Grp</th>
        </tr>
        ${matchRows}
    </table>
    
    <details>
        <summary>📅 Schedule</summary>
        <table border="1" width="100%">
            <tr align="center">
                <th align="center" style="width: 35%">Date & Time</th>
                <th align="center" style="width: 65%">Match</th>
            </tr>
            ${upcomingRows}
        </table>
    </details>

    <details>
        <summary>🏆 Champions League</summary>
        <table border="1" width="100%">
            <tr align="center">
                <th align="center" style="width: 35%">Date & Time</th>
                <th align="center" style="width: 65%">Match</th>
            </tr>
            ${uclRows}
        </table>
    </details>

    <details>
        <summary>📊 Standings (All Groups A - H)</summary>
        ${standingsHtml}
    </details>
    `.trim();
}

// ==========================
// EXECUTE AND SEND RICH PAYLOAD
// ==========================
async function run() {
    console.log("🚀 Menyusun konten HTML untuk rich_message...");
    const htmlContent = await buildHtmlContent();

    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        message_id: parseInt(TELEGRAM_MESSAGE_ID),
        rich_message: {
            html: htmlContent
        },
        reply_markup: {
            inline_keyboard: [
                [{"text": "🔴 Watch Live Streaming", "url": "https://t.me/JvcxUG8HLgwM2Zl?livestream"}],
                [{"text": "🏆 FIFA Full Standings", "url": "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings"}],
                [{"text": "📰 FIFA Latest News", "url": "https://www.fifa.com/en/tournaments/mens/worldcup/2026"}]
            ]
        }
    };

    try {
        console.log("🚀 Mengirim update rich_message ke Telegram...");
        const res = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
            payload,
            { headers: { "Content-Type": "application/json" } }
        );

        if (res.data.ok) {
            console.log("✅ Berhasil! Pesan di channel sudah diperbarui.");
        } else {
            console.log("❌ Gagal! Response dari Telegram:", res.data);
        }
    } catch (e) {
        const telegramError = e.response?.data?.description || "";
        if (telegramError.includes("message is not modified")) {
            console.log("⚠️ INFO: Konten dashboard belum ada perubahan. Dilewati agar tidak error.");
        } else {
            console.log("❌ ERROR:", e.response?.data || e.message);
            process.exit(1);
        }
    }
}

run();
