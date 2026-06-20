const axios = require('axios');

// Hanya butuh rahasia Telegram saja sekarang!
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Mendapatkan tanggal hari ini (Format: YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

async function getFootballData() {
    try {
        // Menggunakan API Publik Gratis tanpa perlu API Key/Token
        // Endpoint ini menyediakan data pertandingan yang diperbarui berkala
        const response = await axios.get('https://worldcupjson.net/matches/today');
        const matches = response.data;
        
        if (!matches || matches.length === 0) {
            console.log('Tidak ada pertandingan untuk hari ini.');
            return null;
        }

        // Mulai menyusun tabel ala Telegram
        let message = `🏆 *Hasil & Jadwal Pertandingan (${today})*\n\n`;
        message += `\` Status | Pertandingan         \`\n`;
        message += `\`------------------------------\`\n`;

        matches.forEach(match => {
            // Memformat status (misal: completed, in_progress, future)
            let status = 'NS';
            if (match.status === 'completed') status = 'FT';
            else if (match.status === 'in_progress') status = 'LIVE';
            else {
                // Jika belum mulai, ambil jamnya saja
                const dateObj = new Date(match.datetime);
                status = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
            }
            status = status.padEnd(6);

            const home = match.home_team.name || match.home_team.country;
            const away = match.away_team.name || match.away_team.country;
            
            // Jika belum mulai (future), skor dikosongkan (-)
            const homeScore = match.home_team.goals ?? '-';
            const awayScore = match.away_team.goals ?? '-';
            
            const matchText = `${home} ${homeScore} - ${awayScore} ${away}`.padEnd(20);
            message += `\` ${status} | ${matchText} \`\n`;
        });

        return message;

    } catch (error) {
        console.error('Gagal mengambil data dari API Publik:', error.message);
        // Fallback jika API utama down, kita bisa return info cetak kosong
        return `⚠️ Gagal memuat jadwal otomatis untuk hari ini.`;
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
