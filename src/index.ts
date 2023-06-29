import { Client, GatewayIntentBits } from 'discord.js';

const { token } = require('../.config.json');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', client => {
    console.log('Started up successfully');
    client.user.setActivity('Fixing all the links!');
});

client.on('messageCreate', message => {
    if (message.author.bot) return;
    const fixedLinks = fixLinks(message.content);
    if (fixedLinks.length > 0) {
        message.reply(fixedLinks.join('\n'));
    }
});

client.login(token);

function fixLinks(message: string): string[] {
    const matches = [...message.matchAll(/https:\/\/twitter\.com\/([a-zA-Z0-9_]{1,15}\/status\/[0-9]+)|https:\/\/(?:www\.)?instagram\.com\/((?:p|reel)\/[a-zA-Z0-9_]+)|https:\/\/(?:www\.)tiktok\.com\/(t\/[a-zA-Z0-9]{9})/gi)];
    const links = [];
    if (matches.length > 0) {
        for (const match of matches) {
            if (match[1]) {
                links.push(`https://fxtwitter.com/${match[1]}`);
            }
            if (match[2]) {
                links.push(`https://www.ddinstagram.com/${match[2]}`);
            }
            if (match[3]) {
                links.push(`https://www.vxtiktok.com/${match[3]}`);
            }
        }
    }
    return links;
}
