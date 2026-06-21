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
// GENERATE HTML FOR RICH_MESSAGE (WITH COLLAPSIBLE ACCORDION)
// ==========================
async function buildHtmlContent() {
    // 1. AMBIL DATA MATCH RESULTS
    const matchesData = await get("https://api.football-data.org/v4/matches", "matches");
    const matches = matchesData?.matches || [];

    let matchRows = matches.slice(0, 10).map(m => {
        let status = m.status === "FINISHED" ? "✅ FT" : (m.status === "IN_PLAY" ? "🔴 LIVE" : m.status);
        const score = `${m.score?.fullTime?.home ?? "-"}-${m.score?.fullTime?.away ?? "-"}`;
        const matchName = `${m.homeTeam?.name} ${score} ${m.awayTeam?.name}`;
        let group = (m.group || "-").replace("GROUP_", "");
        return `<tr><td>${status}</td><td>${matchName}</td><td>${group}</td></tr>`;
    }).join("\n");

    // 2. AMBIL DATA UPCOMING MATCHES
    let upcomingRows = matches.filter(m => m.status === "TIMED").slice(0, 5).map(m => {
        const d = new Date(m.utcDate);
        const dateStr = d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" });
        const timeStr = d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(":", ".");
        return `<tr><td>${dateStr} ${timeStr} WIB</td><td>${m.homeTeam?.name} vs ${m.awayTeam?.name}</td></tr>`;
    }).join("\n");
    if (!upcomingRows) upcomingRows = "<tr><td colspan='2'>Tidak ada jadwal terdekat</td></tr>";

    // 3. AMBIL DATA CHAMPIONS LEAGUE (UCL)
    const uclData = await get("https://api.football-data.org/v4/competitions/CL/matches", "ucl");
    const uclMatches = uclData?.matches || [];

    let uclRows = uclMatches.slice(0, 10).map(m => {
        const d = new Date(m.utcDate);
        const dateStr = d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" });
        const timeStr = d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).replace(":", ".");
        return `<tr><td>${dateStr} ${timeStr} WIB</td><td>${m.homeTeam?.name} vs ${m.awayTeam?.name}</td></tr>`;
    }).join("\n");

    // 4. AMBIL DATA KLASEMEN PIALA DUNIA (Semua Grup A-H)
    const standingsData = await get("https://api.football-data.org/v4/competitions/WC/standings", "standings");
    const standings = standingsData?.standings || [];
    
    let standingsHtml = "";

    standings.forEach(group => {
        if (group.type !== "TOTAL" || !group.group) return;

        // 🔥 Pembatas groupCount >= 4 sudah dihapus agar semua grup (A sampai H) keluar otomatis
        const groupName = group.group.replace("GROUP_", "");
        const rows = (group.table || []).slice(0, 4).map(t => {
            const teamName = t.team?.shortName || t.team?.name || "-";
            return `<tr><td>${t.position}</td><td>${teamName}</td><td>${t.playedGames}</td><td><b>${t.points}</b></td></tr>`;
        }).join("\n");

        standingsHtml += `
        <h4>🏆 GROUP ${groupName}</h4>
        <table border="1">
            <tr><th style="width: 10%">#</th><th style="width: 60%">TEAM</th><th style="width: 15%">P</th><th style="width: 15%">PTS</th></tr>
            ${rows}
        </table>`;
    });
    if (!standingsHtml) standingsHtml = "<p>Klasemen belum tersedia</p>";

    // Styling dasar CSS agar tabel rapi dan rata tengah
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
            text-align: center;
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

    // 🔥 Menggunakan tag <details> dan <summary> agar memunculkan panah collapse bawaan engine
    return `
    ${styleBlock}
    
    <h3>📌 MATCH RESULTS</h3>
    <table border="1">
        <tr><th style="width: 25%">Status</th><th style="width: 60%">Match</th><th style="width: 15%">Grp</th></tr>
        ${matchRows}
    </table>
    
    <details>
        <summary>📅 Jadwal Besok (Malam & Esok Pagi)</summary>
        <table border="1">
            <tr><th style="width: 35%">Tanggal & Waktu</th><th style="width: 65%">Match</th></tr>
            ${upcomingRows}
        </table>
    </details>

    <details>
        <summary>🏆 Champions League</summary>
        <table border="1">
            <tr><th style="width: 35%">Tanggal & Waktu</th><th style="width: 65%">Match</th></tr>
            ${uclRows}
        </table>
    </details>

    <details>
        <summary>📊 Klasemen Semua Grup (A - H)</summary>
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
                [{"text": "🔴 Tonton Live Streaming", "url": "https://t.me/JvcxUG8HLgwM2Zl?livestream"}],
                [{"text": "🏆 Klasemen Lengkap FIFA", "url": "https://www.fifa.com/en/tournaments/mens/worldcup/2026/standings"}],
                [{"text": "📰 Berita Terbaru FIFA", "url": "https://www.fifa.com/en/tournaments/mens/worldcup/2026"}]
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
