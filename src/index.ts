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
    console.log("yep!"); // * DEBUG
    console.log(message.content); // * DEBUG
    const matches = [...message.content.matchAll(/https:\/\/twitter\.com\/([a-zA-Z0-9_]{1,15}\/status\/[0-9]+)|https:\/\/(?:www\.)?instagram\.com\/((?:p|reel)\/[a-zA-Z0-9_]+)/gi)];
    const links = [];
    if (matches.length > 0) {
        for (const match of matches) {
            if (match[1]) {
                links.push(`https://fxtwitter.com/${match[1]}`);
            }
            if (match[2]) {
                links.push(`https://www.ddinstagram.com/${match[2]}`);
            }
        }
    }
    if (links.length > 0){
        message.reply(links.join('\n'));
    }
})
client.login(token);