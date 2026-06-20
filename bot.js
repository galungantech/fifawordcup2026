const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN;

const headers = {
    'X-Auth-Token': FOOTBALL_DATA_TOKEN
};

function formatTime(dateString) {
    return new Date(dateString).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function shorten(text, max = 24) {
    if (!text) return '-';
    return text.length > max ? text.substring(0, max - 3) + '...' : text;
}

async function getFootballReport() {
    let msg = '⚽ *Football Report*\n\n';

    try {

        // ==========================================
        // MATCHES TODAY
        // ==========================================
        const matchesToday = await axios.get(
            'https://api.football-data.org/v4/matches',
            { headers }
        );

        msg += '🌍 *Pertandingan Hari Ini*\n';

        (matchesToday.data.matches || []).slice(0, 5).forEach(m => {
            const home = shorten(m.homeTeam.name);
            const away = shorten(m.awayTeam.name);

            const hs = m.score.fullTime.home ?? '-';
            const as = m.score.fullTime.away ?? '-';

            msg += `• ${home} ${hs}-${as} ${away}\n`;
        });

        msg += '\n';

        // ==========================================
        // CHAMPIONS LEAGUE
        // ==========================================
        const cl = await axios.get(
            'https://api.football-data.org/v4/competitions/CL/matches',
            { headers }
        );

        msg += '🏆 *Champions League*\n';

        (cl.data.matches || []).slice(0, 5).forEach(m => {
            msg += `• ${shorten(m.homeTeam.name)} vs ${shorten(m.awayTeam.name)}\n`;
        });

        msg += '\n';

        // ==========================================
        // TEAM 86 SCHEDULED
        // ==========================================
        const team86 = await axios.get(
            'https://api.football-data.org/v4/teams/86/matches?status=SCHEDULED',
            { headers }
        );

        msg += '📅 *Team 86 Jadwal*\n';

        (team86.data.matches || []).slice(0, 5).forEach(m => {
            msg += `• ${formatTime(m.utcDate)}\n`;
            msg += `  ${shorten(m.homeTeam.name)} vs ${shorten(m.awayTeam.name)}\n`;
        });

        msg += '\n';

        // ==========================================
        // PERSON 2019 MATCHES
        // ==========================================
        const person = await axios.get(
            'https://api.football-data.org/v4/persons/2019/matches?status=FINISHED',
            { headers }
        );

        msg += '⚽ *Person 2019 Matches*\n';

        (person.data.matches || []).slice(0, 5).forEach(m => {
            msg += `• ${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}\n`;
        });

        msg += '\n';

        // ==========================================
        // PREMIER LEAGUE MATCHDAY 11
        // ==========================================
        const pl = await axios.get(
            'https://api.football-data.org/v4/competitions/PL/matches?matchday=11',
            { headers }
        );

        msg += '🏴 *Premier League MD11*\n';

        (pl.data.matches || []).slice(0, 5).forEach(m => {
            msg += `• ${shorten(m.homeTeam.name)} vs ${shorten(m.awayTeam.name)}\n`;
        });

        msg += '\n';

        // ==========================================
        // BUNDESLIGA STANDINGS
        // ==========================================
        const standings = await axios.get(
            'https://api.football-data.org/v4/competitions/DED/standings',
            { headers }
        );

        msg += '📊 *Bundesliga Top 5*\n';

        const table =
            standings.data.standings?.find(
                s => s.type === 'TOTAL'
            )?.table || [];

        table.slice(0, 5).forEach(t => {
            msg += `${t.position}. ${shorten(t.team.name, 18)} (${t.points} pts)\n`;
        });

        msg += '\n';

        // ==========================================
        // SERIE A SCORERS
        // ==========================================
        const scorers = await axios.get(
            'https://api.football-data.org/v4/competitions/SA/scorers',
            { headers }
        );

        msg += '👟 *Serie A Top Scorers*\n';

        (scorers.data.scorers || []).slice(0, 5).forEach((s, idx) => {
            msg += `${idx + 1}. ${shorten(s.player.name, 20)} (${s.goals} gol)\n`;
        });

        // Telegram limit 4096
        if (msg.length > 3900) {
            msg = msg.substring(0, 3900);
            msg += '\n\n...(dipotong)';
        }

        return msg;

    } catch (err) {
        console.error(err.response?.data || err.message);
        return `⚠️ Gagal mengambil data\n${err.message}`;
    }
}

async function sendTelegram(text) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'Markdown'
            }
        );

        console.log('Pesan berhasil dikirim');
    } catch (err) {
        console.error(
            err.response?.data || err.message
        );
    }
}

(async () => {
    const report = await getFootballReport();
    await sendTelegram(report);
})();
