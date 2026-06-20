const axios = require('axios');

// Token dari GitHub Secrets
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN; // Token baru dari email

// Mengambil tanggal hari ini (Format: YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

async function getFootballData() {
    try {
        // Mengambil data jadwal & hasil pertandingan hari ini untuk semua liga utama yang didukung tier gratis
        const response = await axios.get('https://api.football-data.org/v4/matches', {
            headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN },
            params: {
                dateFrom: today,
                dateTo: today
            }
        });

        const matches = response.data.matches;
        
        if (!matches || matches.length === 0) {
            console.log('Tidak ada pertandingan untuk hari ini.');
            return `📅 *Jadwal Pertandingan (${today})*\n\nTidak ada jadwal pertandingan utama untuk hari ini.`;
        }

        // Batasi maksimal 15 pertandingan agar pas di layar Telegram
        const limitedMatches = matches.slice(0, 15);

        let message = `🏆 *Hasil & Jadwal Pertandingan (${today})*\n\n`;
        message += `\` Status | Pertandingan         \`\n`;
        message += `\`------------------------------\`\n`;

        limitedMatches.forEach(match => {
            let status = match.status;
            
            // Konversi status agar lebih singkat dan rapi
            if (status === 'FINISHED') status = 'FT';
            else if (status === 'IN_PLAY') status = 'LIVE';
            else if (status === 'PAUSED') status = 'HT';
            else if (status === 'TIMED' || status === 'SCHEDULED') {
                // Jika belum mulai, ambil jamnya saja
                const dateObj = new Date(match.utcDate);
                status = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
            }
            status = status.padEnd(6);

            const home = match.homeTeam.shortName || match.homeTeam.name;
            const away = match.awayTeam.shortName || match.awayTeam.name;
            
            const homeScore = match.score.fullTime.home !== null ? match.score.fullTime.home : '-';
            const awayScore = match.score.fullTime.away !== null ? match.score.fullTime.away : '-';
            
            // Potong teks jika nama tim terlalu panjang supaya tabel tidak berantakan
            let matchText = `${home} ${homeScore} - ${awayScore} ${away}`;
            if (matchText.length > 20) {
                matchText = matchText.substring(0, 17) + '...';
            }
            matchText = matchText.padEnd(20);
            
            message += `\` ${status} | ${matchText} \`\n`;
        });

        return message;

    } catch (error) {
        console.error('Gagal mengambil data:', error.message);
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
