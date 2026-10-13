require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const play = require('play-dl');
const ytSearch = require('yt-search');
const http = require('http');

// Render Web Service ayakta kalsın diye
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
            return message.reply('Lütfen bir şarkı ismi veya link yaz!');
        }

        if (!voiceChannel) {
            return message.reply('Önce bir ses kanalına katılmalısın!');
        }

        try {
            message.reply(`🔍 **${query}** aranıyor...`);

            // 1. Adım: yt-search ile videoyu buluyoruz (Engelsiz arama)
            const searchResult = await ytSearch(query);
            const videos = searchResult.videos;

            if (!videos || videos.length === 0) {
                return message.reply('Aradığın şarkı bulunamadı!');
            }

            const song = videos[0];

            // 2. Adım: Ses kanalına bağlanıyoruz
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            // 3. Adım: play-dl ile akışı güvenli çekme denemesi
            let stream;
            try {
                let sourceData = await play.stream(song.url);
                stream = sourceData.stream;
            } catch (err) {
                console.log('Birinci akış yöntemi takıldı, alternatif deneniyor...');
                // Alternatif stream
                let altData = await play.stream(song.url, { discordPlayerCompatibility: true });
                stream = altData.stream;
            }

            const resource = createAudioResource(stream, { 
                inputType: StreamType.Arbitrary,
                inlineVolume: true 
            });

            player.play(resource);
            connection.subscribe(player);

            message.channel.send(`🎶 Şu an çalıyor: **${song.title}**`);
        } catch (error) {
            console.error('KRİTİK HATA:', error);
            message.reply(`Müzik çalınırken hata oluştu: ${error.message}`);
        }
    }

    if (message.content === '!stop') {
        player.stop();
        message.reply('⏹️ Müzik durduruldu.');
    }
});

client.login(process.env.TOKEN);