// * Includes
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});
const { token } = require('../.config.json');
console.log("starting")

// * Startup
client.once("ready", ()=> {
    console.log("Started up successfully");
    client.user.setActivity(`Fixing all the links!`);
})

client.on("messageCreate", (message:any)=> {
    if (message.author.bot) return;
    const matches = [...message.content.matchAll(/https:\/\/twitter\.com\/([a-zA-Z0-9_]{1,15}\/status\/[0-9]+)|https:\/\/(?:www\.)?instagram\.com\/((?:p|reel)\/[a-zA-Z0-9_]+)|https:\/\/(?:www\.)tiktok\.com\/(t\/[a-zA-Z0-9]{9})/gi)];
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
    if (links.length > 0){
        message.reply(links.join('\n'));
    }
})
client.login(token);
