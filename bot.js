const axios = require('axios');

// Token dari GitHub Secrets
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

// Tanggal hari ini
const today = new Date().toISOString().split('T')[0];

function formatWIB(utcDate) {
    return new Date(utcDate).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
    });
}

function escapeMarkdown(text) {
    return text
        .replace(/\|/g, '\\|')
        .replace(/_/g, '\\_')
        .replace(/\*/g, '\\*')
        .replace(/`/g, '\\`');
}

async function getFootballData() {
    try {
        const response = await axios.get(
            'https://api.football-data.org/v4/matches',
            {
                headers: {
                    'X-Auth-Token': FOOTBALL_DATA_TOKEN
                },
                params: {
                    dateFrom: today,
                    dateTo: today
                }
            }
        );

        const matches = response.data.matches || [];

        if (matches.length === 0) {
            return `📅 Tidak ada pertandingan hari ini`;
        }

        const finishedMatches = [];
        const upcomingMatches = [];

        for (const match of matches) {
            const home =
                match.homeTeam.shortName ||
                match.homeTeam.tla ||
                match.homeTeam.name;

            const away =
                match.awayTeam.shortName ||
                match.awayTeam.tla ||
                match.awayTeam.name;

            const group =
                match.group ||
                match.stage ||
                '-';

            if (
                match.status === 'FINISHED' ||
                match.status === 'IN_PLAY' ||
                match.status === 'PAUSED'
            ) {
                let status = 'FT';

                if (match.status === 'IN_PLAY') {
                    status = 'LIVE';
                }

                if (match.status === 'PAUSED') {
                    status = 'HT';
                }

                const homeScore =
                    match.score.fullTime.home ??
                    match.score.halfTime.home ??
                    '-';

                const awayScore =
                    match.score.fullTime.away ??
                    match.score.halfTime.away ??
                    '-';

                finishedMatches.push({
                    status,
                    match: `${home} ${homeScore}-${awayScore} ${away}`,
                    group
                });
            } else {
                upcomingMatches.push({
                    time: formatWIB(match.utcDate),
                    match: `${home} vs ${away}`,
                    group
                });
            }
        }

        let message = '';

        if (finishedMatches.length > 0) {
            message += `🏆 Hasil Pertandingan Hari Ini (${new Date().toLocaleDateString('id-ID')})\n\n`;

            message += '| Status | Pertandingan | Grup |\n';
            message += '|--------|--------------|------|\n';

            finishedMatches.slice(0, 20).forEach(row => {
                message += `| ✅ ${escapeMarkdown(row.status)} | ${escapeMarkdown(row.match)} | ${escapeMarkdown(row.group)} |\n`;
            });

            message += '\n';
        }

        if (upcomingMatches.length > 0) {
            message += '📅 Jadwal Selanjutnya\n\n';

            message += '| Waktu (WIB) | Pertandingan | Grup |\n';
            message += '|-------------|--------------|------|\n';

            upcomingMatches
                .sort((a, b) => a.time.localeCompare(b.time))
                .slice(0, 20)
                .forEach(row => {
                    message += `| ${escapeMarkdown(row.time)} | ${escapeMarkdown(row.match)} | ${escapeMarkdown(row.group)} |\n`;
                });
        }

        return message;
    } catch (error) {
        console.error(error);
        return `⚠️ Gagal mengambil data pertandingan\n${error.message}`;
    }
}

async function sendToTelegram(message) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            }
        );

        console.log('Pesan berhasil dikirim');
    } catch (error) {
        console.error(
            'Gagal kirim:',
            error.response?.data || error.message
        );
    }
}

async function run() {
    const message = await getFootballData();
    await sendToTelegram(message);
}

run();
