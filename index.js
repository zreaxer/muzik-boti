require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const http = require('http');
const ffmpegPath = require('ffmpeg-static');

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

// Her sunucu için ayrı bir ses oynatıcı oluşturan yapı
const players = new Map();

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
            message.reply(`🔍 **${query}** aranıyor...`);

            const searchResult = await ytSearch(query);
            const videos = searchResult.videos;

            if (!videos || videos.length === 0) {
                return message.reply('Aradığın şarkı bulunamadı!');
            }

            const song = videos[0];

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            // Ses akışını güvenli şekilde alıyoruz
            const stream = ytdl(song.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });

            const resource = createAudioResource(stream, { 
                inputType: StreamType.Arbitrary 
            });

            let player = players.get(message.guild.id);
            if (!player) {
                player = createAudioPlayer();
                players.set(message.guild.id, player);
            }

            player.play(resource);
            connection.subscribe(player);

            message.channel.send(`🎶 Şu an çalıyor: **${song.title}**`);
        } catch (error) {
            console.error('MÜZİK ÇALMA HATASI:', error);
            message.reply(`Müzik çalınırken bir hata oluştu. Hata: ${error.message}`);
        }
    }

    if (message.content === '!stop') {
        const player = players.get(message.guild.id);
        if (player) {
            player.stop();
            message.reply('⏹️ Müzik durduruldu.');
        } else {
            message.reply('Şu an çalan bir müzik yok.');
        }
    }
});

client.login(process.env.TOKEN);