const axios = require('axios');

// Token Telegram tetap diambil dari GitHub Secrets
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Mendapatkan tanggal hari ini (Format: YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

async function getFootballData() {
    try {
        // Menggunakan API publik ScoreBat yang menyediakan data pertandingan & video highlight gratis secara real-time
        const response = await axios.get('https://www.scorebat.com/video-api/v3/feed/');
        const matches = response.data.response;
        
        if (!matches || matches.length === 0) {
            console.log('Tidak ada data pertandingan masuk.');
            return '📅 *Jadwal Pertandingan*\n\nBelum ada jadwal pertandingan terbaru untuk saat ini.';
        }

        // Ambil maksimal 10-15 pertandingan terbaru agar tidak melebihi batas karakter Telegram
        const limitedMatches = matches.slice(0, 12);

        // Mulai menyusun tabel ala Telegram
        let message = `🏆 *Hasil & Jadwal Pertandingan (${today})*\n\n`;
        message += `\` Status | Pertandingan         \`\n`;
        message += `\`------------------------------\`\n`;

        limitedMatches.forEach(match => {
            // Karena ScoreBat fokus ke laga yang baru selesai/live, status diatur default ke FT atau LIVE
            let status = 'FT'; 
            status = status.padEnd(6);

            // Memisahkan atau merapikan nama tim dari judul (Format ScoreBat biasanya: "Team A - Team B")
            let title = match.title || '';
            if (title.length > 20) {
                title = title.substring(0, 17) + '...'; // Potong jika nama klub terlalu panjang agar tabel tidak rusak
            }
            const matchText = title.padEnd(20);
            
            message += `\` ${status} | ${matchText} \`\n`;
        });

        return message;

    } catch (error) {
        console.error('Gagal mengambil data dari API Publik:', error.message);
        return `⚠️ Gagal memuat jadwal otomatis untuk hari ini.\nError: ${error.message}`;
    }
}

async function sendToTelegram(message) {
    if (!message) return;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
        console.log('Pesan berhasil dikirim ke Telegram!');
    } catch (error) {
        console.error('Gagal mengirim ke Telegram:', error.response?.data || error.message);
    }
}

async function run() {
    const tableMessage = await getFootballData();
    await sendToTelegram(tableMessage);
}

run();
