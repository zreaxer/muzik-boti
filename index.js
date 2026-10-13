require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');

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
        const url = message.content.split(' ')[1];
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply('Önce bir ses kanalına katılmalısın!');
        }

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
            const resource = createAudioResource(stream);

            player.play(resource);
            connection.subscribe(player);

            message.reply('🎶 Müzik çalınmaya başladı!');
        } catch (error) {
            console.error(error);
            message.reply('Müzik çalınırken bir hata oluştu.');
        }
    }

    if (message.content === '!stop') {
        player.stop();
        message.reply('⏹️ Müzik durduruldu.');
    }
});

client.login(process.env.TOKEN);