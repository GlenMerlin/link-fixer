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
        console.log('Replying');
        message.reply(fixedLinks.join('\n'));
    }
});

client.login(token);

const twitterPattern = `https://twitter\.com/([a-zA-Z0-9_]{1,15}/status/[0-9]+)`;       // Capture 1
const instagramPattern = `https://(?:www\.)?instagram\.com/((?:p|reel)/[a-zA-Z0-9_]+)`; // Capture 2
const tiktokPattern = `https://(?:www\.)tiktok\.com/(t/[a-zA-Z0-9]{9})`;                // Capture 3
const linkPattern = [twitterPattern, instagramPattern, tiktokPattern].join('|').replace(`/`, `\/`);
const linkRe = new RegExp(linkPattern, 'gi');

function fixLinks(message: string): string[] {
    const matches = [...message.matchAll(linkRe)];
    const fixedLinks = [];
    if (matches.length > 0) {
        for (const match of matches) {
            const link = match[0];
            let fixed;
            if (match[1] != null) {
                fixed = `https://fxtwitter.com/${match[1]}`;
            } else if (match[2] != null) {
                fixed = `https://www.ddinstagram.com/${match[2]}`;
            } else if (match[3] != null) {
                fixed = `https://www.vxtiktok.com/${match[3]}`;
            } else {
                console.error(`No pattern matched! ${JSON.stringify(message)}`);
                continue;
            }
            console.log(`Replaced ${link} with ${fixed}`);
            fixedLinks.push(fixed);
        }
    }
    return fixedLinks;
}
