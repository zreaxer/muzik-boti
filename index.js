require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const play = require('play-dl');
const http = require('http');

// Render Web Service kapanmasın diye
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
            return message.reply('Lütfen bir şarkı ismi yaz!');
        }

        if (!voiceChannel) {
            return message.reply('Önce bir ses kanalına katılmalısın!');
        }

        try {
            message.reply(`🔍 SoundCloud üzerinde **${query}** aranıyor...`);

            // YouTube engeline takılmamak için doğrudan SoundCloud'da arama yapıyoruz
            let searchResults = await play.search(query, {
                source: { soundcloud: 'tracks' },
                limit: 1
            });

            if (!searchResults || searchResults.length === 0) {
                return message.reply('Aradığın şarkı SoundCloud üzerinde bulunamadı!');
            }

            const song = searchResults[0];

            let streamData = await play.stream(song.url);

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            const resource = createAudioResource(streamData.stream, {
                inputType: streamData.type
            });

            player.play(resource);
            connection.subscribe(player);

            message.channel.send(`🎶 Şu an çalıyor (SoundCloud): **${song.title}**`);
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