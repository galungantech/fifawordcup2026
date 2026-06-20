const axios = require('axios');

// Mengambil variabel dari GitHub Secrets
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

// Konfigurasi Liga (Contoh: ID 1 untuk World Cup, sesuaikan kebutuhan)
const LEAGUE_ID = 1; 
const SEASON = 2026;

// Mendapatkan tanggal hari ini (Format: YYYY-MM-DD) sesuai zona waktu lokal
const today = new Date().toISOString().split('T')[0];

async function getFootballData() {
    try {
        const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
            params: {
                league: LEAGUE_ID,
                season: SEASON,
                date: today
            },
            headers: {
                'x-rapidapi-key': API_FOOTBALL_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });

        const fixtures = response.data.response;
        
        if (!fixtures || fixtures.length === 0) {
            console.log('Tidak ada pertandingan untuk hari ini.');
            return null;
        }

        // Mulai menyusun template tabel Telegram
        let message = `🏆 *Hasil & Jadwal Pertandingan (${today})*\n\n`;
        message += `\` Status | Pertandingan         \`\n`;
        message += `\`------------------------------\`\n`;

        fixtures.forEach(item => {
            // Mengambil status (FT, HT, atau Jam Pertandingan jika belum mulai)
            let status = item.fixture.status.short;
            if (status === 'NS') {
                // Jika belum mulai, tampilkan jamnya saja (HH:MM)
                const dateObj = new Date(item.fixture.date);
                status = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
            }
            status = status.padEnd(6);

            const home = item.teams.home.name;
            const away = item.teams.away.name;
            const homeScore = item.goals.home ?? '-';
            const awayScore = item.goals.away ?? '-';
            
            const matchText = `${home} ${homeScore} - ${awayScore} ${away}`.padEnd(20);
            message += `\` ${status} | ${matchText} \`\n`;
        });

        return message;

    } catch (error) {
        console.error('Gagal mengambil data dari API:', error.message);
        return null;
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
