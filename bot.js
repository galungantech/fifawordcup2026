const axios = require('axios');

// Mengambil variabel rahasia dari GitHub Secrets
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

if (!FOOTBALL_DATA_TOKEN) {
    console.error("❌ Error: FOOTBALL_DATA_TOKEN belum diset di GitHub Secrets!");
    process.exit(1);
}

const headers = {
    'X-Auth-Token': FOOTBALL_DATA_TOKEN
};

// Mendapatkan tanggal hari ini (Format: YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

// ==========================================
// UTIL (FORMAT WAKTU & GRUP)
// ==========================================
function formatTime(utcDate) {
    return new Date(utcDate).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function cleanGroupText(groupName) {
    if (!groupName) return "-";
    // Mengubah format "GROUP_A" menjadi "A" agar hemat ruang kolom
    return groupName.includes("GROUP_") ? groupName.replace("GROUP_", "") : groupName;
}

// ==========================================
// SAFE REQUEST API
// ==========================================
async function safeGet(url, label) {
    try {
        const res = await axios.get(url, { headers });
        return res.data;
    } catch (err) {
        console.log(`❌ Gagal mengambil data ${label}:`, err.response?.status || err.message);
        return null;
    }
}

// ==========================================
// FORMAT TABEL HASIL PERTANDINGAN (HTML NATIVE)
// ==========================================
function formatMatchTable(matches) {
    if (!matches || matches.length === 0) {
        return "<i>Tidak ada hasil pertandingan untuk hari ini.</i>";
    }

    let out = `<table>`;
    out += `<tr><th>Status</th><th>Pertandingan</th><th>Grup</th></tr>`;

    matches.slice(0, 10).forEach(m => {
        let statusText = m.status;
        
        // Pemetaan status ke format visual ikon
        if (statusText === 'FINISHED' || statusText === 'FT') {
            statusText = "✅ FT";
        } else if (statusText === 'IN_PLAY' || statusText === 'LIVE') {
            statusText = "🔴 LIVE";
        } else if (statusText === 'PAUSED' || statusText === 'HT') {
            statusText = "⏳ HT";
        } else {
            statusText = "⏱️ -";
        }

        const home = m.homeTeam?.shortName || m.homeTeam?.name || "-";
        const away = m.awayTeam?.shortName || m.awayTeam?.name || "-";
        const homeScore = m.score?.fullTime?.home ?? "-";
        const awayScore = m.score?.fullTime?.away ?? "-";

        const matchText = `${home} ${homeScore} - ${awayScore} ${away}`;
        const groupText = cleanGroupText(m.group);

        out += `<tr><td>${statusText}</td><td>${matchText}</td><td>${groupText}</td></tr>`;
    });

    out += `</table>`;
    return out;
}

// ==========================================
// FORMAT TABEL JADWAL PERTANDINGAN (HTML NATIVE)
// ==========================================
function formatScheduleTable(matches) {
    if (!matches || matches.length === 0) {
        return "<i>Tidak ada jadwal pertandingan untuk hari ini.</i>";
    }

    let out = `<table>`;
    out += `<tr><th>Waktu (WIB)</th><th>Pertandingan</th><th>Grup</th></tr>`;

    matches.slice(0, 10).forEach(m => {
        const time = formatTime(m.utcDate);
        const home = m.homeTeam?.shortName || m.homeTeam?.name || "-";
        const away = m.awayTeam?.shortName || m.awayTeam?.name || "-";
        
        const matchText = `${home} vs ${away}`;
        const groupText = cleanGroupText(m.group);

        out += `<tr><td>${time}</td><td>${matchText}</td><td>${groupText}</td></tr>`;
    });

    out += `</table>`;
    return out;
}

// ==========================================
// DASHBOARD BUILDER
// ==========================================
async function buildDashboard() {
    let msg = `🏆 <b>FOOTBALL UPDATE DASHBOARD</b>\n\n`;

    // Ambil data pertandingan global hari ini
    const dataMatches = await safeGet(
        `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`,
        'matches'
    );

    const allMatches = dataMatches?.matches || [];

    // Filter pertandingan yang sudah selesai/sedang jalan vs yang belum mulai
    const finishedOrLive = allMatches.filter(m => ['FINISHED', 'IN_PLAY', 'PAUSED'].includes(m.status));
    const upcomingMatches = allMatches.filter(m => ['TIMED', 'SCHEDULED'].includes(m.status));

    // 1. Bagian Hasil Pertandingan Hari Ini
    msg += `<b>📌 Hasil Pertandingan Hari Ini</b>\n`;
    msg += formatMatchTable(finishedOrLive);
    msg += `\n\n`;

    // 2. Bagian Jadwal Selanjutnya
    msg += `<b>📅 Jadwal Selanjutnya (Malam & Besok Pagi)</b>\n`;
    msg += formatScheduleTable(upcomingMatches);
    msg += `\n`;

    // Batasi panjang pesan jika terlalu panjang (Maksimal batas Telegram 4096 karakter)
    if (msg.length > 3900) {
        msg = msg.slice(0, 3900) + "\n\n<i>(Beberapa data dipotong karena batas karakter...)</i>";
    }

    return msg;
}

// ==========================================
// KIRIM KE TELEGRAM (HTML MODE)
// ==========================================
async function sendTelegram(text) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: "HTML" // Menggunakan HTML mode agar tag <table> terbaca otomatis
            }
        );
        console.log("✅ Data tabel berhasil dikirim ke Telegram!");
    } catch (err) {
        console.error("❌ Gagal mengirim ke Telegram:", err.response?.data || err.message);
    }
}

// ==========================================
// MAIN EXECUTION
// ==========================================
(async () => {
    try {
        console.log(`🤖 Memulai pemrosesan jadwal tanggal: ${today}`);
        const dashboard = await buildDashboard();
        await sendTelegram(dashboard);
    } catch (err) {
        console.error("❌ Fatal Error:", err.message);
    }
})();
