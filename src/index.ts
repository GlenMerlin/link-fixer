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

const linkPattern = [
    `https://(www\.)?twitter\.com/([a-zA-Z0-9_]{1,15}/status/[0-9]+)`, // Captures 1 and 2
    `https://(www\.)?instagram\.com/((?:p|reel)/[a-zA-Z0-9_]+)`, // Captures 3 and 4
    `https://(www\.)?tiktok\.com/(t/[a-zA-Z0-9]{9})`, // Captures 5 and 6
    `https://(www\.)?tiktok\.com/(@[a-zA-Z0-9_.]*[a-zA-Z0-9_]/video/[0-9]+)`, // Captures 7 and 8
].join('|').replace(`/`, `\/`);
const linkRe = new RegExp(linkPattern, 'gi');

function fixLinks(message: string): string[] {
    const matches = [...message.matchAll(linkRe)];
    const fixedLinks = [];
    if (matches.length > 0) {
        for (const match of matches) {
            const link = match[0];
            let fixed;
            if (match[2] != null) {
                fixed = `https://${match[1] || ''}fxtwitter.com/${match[2]}`;
            } else if (match[4] != null) {
                fixed = `https://${match[3] || ''}ddinstagram.com/${match[4]}`;
            } else if (match[6] != null) {
                fixed = `https://${match[5] || ''}vxtiktok.com/${match[6]}`;
            } else if (match[8] != null) {
                fixed = `https://${match[7] || ''}vxtiktok.com/${match[8]}`;
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
