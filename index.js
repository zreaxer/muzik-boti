require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const http = require('http');

// Render Web Service kapanmasın diye mini sunucu
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

// DisTube ile gelişmiş müzik yönetimi
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnEmpty: true,
    leaveOnFinish: false,
    savePreviousSongs: true,
    nsfw: false
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
            message.reply(`🔍 **${query}** sıraya ekleniyor...`);
            
            // DisTube doğrudan oynatma motorunu tetikler
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error('DISTUBE OYNATMA HATASI:', error);
            message.reply(`Şarkı oynatılırken bir hata oluştu: ${error.message}`);
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

// DisTube etkinlik mesajları
distube
    .on('playSong', (queue, song) => {
        queue.textChannel.send(`🎶 Şu an çalıyor: **${song.name}** - \`${song.formattedDuration}\``);
    })
    .on('addSong', (queue, song) => {
        queue.textChannel.send(`✅ Kuyruğa eklendi: **${song.name}** - \`${song.formattedDuration}\``);
    })
    .on('error', (channel, error) => {
        console.error('DISUBE GENEL HATA:', error);
        if (channel) channel.send(`Bir hata oluştu: \`${error.slice(0, 1970)}\``);
    });

client.login(process.env.TOKEN);