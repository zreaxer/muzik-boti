require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const ytSearch = require('yt-search');
const http = require('http');

// Render Web Service kapanmasın diye
const httpHandler = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot aktif ve calisiyor!\n');
});

httpHandler.listen(process.env.PORT || 3000, () => {
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

const player = createAudioPlayer();

client.once('ready', () => {
    console.log(`🤖 Bot başarıyla giriş yaptı: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.startsWith('!play ')) {
        const query = message.content.slice(6).trim();
        const voiceChannel = message.member.voice.channel;

        if (!query) {
            return message.reply('Lütfen bir şarkı ismi yaz!');
        }

        if (!voiceChannel) {
            return message.reply('Önce bir ses kanalına katılmalısın!');
        }

        try {
            message.reply(`🔍 **${query}** aranıyor...`);

            // Güvenli arama
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

            // Akış hatası vermeyen optimize ytdl ayarları
            const stream = ytdl(song.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                dlChunkSize: 0,
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            });

            const resource = createAudioResource(stream, { 
                inputType: StreamType.Arbitrary 
            });

            player.play(resource);
            connection.subscribe(player);

            message.channel.send(`🎶 Şu an çalıyor: **${song.title}**`);
        } catch (error) {
            console.error('HATA:', error);
            message.reply(`Müzik çalınırken bir hata oluştu: ${error.message}`);
        }
    }

    if (message.content === '!stop') {
        player.stop();
        message.reply('⏹️ Müzik durduruldu.');
    }
});

client.login(process.env.TOKEN);