require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const http = require('http');

// Render Web Service kapanmasın diye mini web sunucusu
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot aktif ve calisiyor!\n');
});

server.listen(process.env.PORT || 3000, () => {
    console.log('[LOG] Web sunucusu hazir.');
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// DisTube müzik yöneticisini başlatıyoruz
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnFinish: false,
    plugins: [new YtDlpPlugin()]
});

client.once('ready', () => {
    console.log(`🤖 Bot başarıyla giriş yaptı: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.startsWith('!play ')) {
        const query = message.content.slice(6).trim();
        const voiceChannel = message.member.voice.channel;

        if (!query) {
            return message.reply('Lütfen bir şarkı ismi veya link yaz!');
        }

        if (!voiceChannel) {
            return message.reply('Önce bir ses kanalına katılmalısın!');
        }

        try {
            message.reply(`🔍 **${query}** aranıyor ve çalınıyor...`);
            
            // DisTube doğrudan ses kanalına bağlanıp şarkıyı oynatır
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error('MÜZİK HATASI:', error);
            message.reply(`Müzik çalınırken bir hata oluştu: ${error.message}`);
        }
    }

    if (message.content === '!stop') {
        const queue = distube.getQueue(message.guild.id);
        if (queue) {
            distube.stop(message.guild.id);
            message.reply('⏹️ Müzik durduruldu ve kuyruk temizlendi.');
        } else {
            message.reply('Şu an çalan bir müzik yok.');
        }
    }
});

client.login(process.env.TOKEN);