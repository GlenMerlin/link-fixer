import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import * as https from 'https';
const Database = require('better-sqlite3');

const { token } = require('../.config.json');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});
const db = new Database('db.sqlite');

client.login(token);

client.once('ready', client => {
    console.log('Started up successfully');
    client.user.setActivity('Fixing all the links!');
});

client.on(Events.GuildCreate, guild => {
    const existCheck = db.prepare(`SELECT * FROM config WHERE guild_id = ?`)
    const data = existCheck.get(guild.id)
    if (!data) {
        const insert = db.prepare(`INSERT INTO config (guild_id, embed, delMsg) VALUES(?, ?, ?)`);
        insert.run(guild.id, 1, 0);
    }
})

client.on(Events.InteractionCreate, async (interaction: any) => {
    if (interaction.commandName == "settings"){
        settings(interaction);
    }   
    if (interaction.commandName == "reset"){
        reset(interaction);
    }
});

client.on('messageCreate', message => {
    if (message.author.bot) return;
    const fixedLinks = fixLinks(message.content);
    if (fixedLinks.length > 0) {
        const tiktokShortLinks = fixedLinks.filter(link => link.kind === 'tiktokShortened')
                                           .map(link => link.origin);
        if (tiktokShortLinks.length > 0) {
            resolveTikTokShortLinks(tiktokShortLinks).then(redirects => {
                const finalLinks = [];
                for (const link of fixedLinks) {
                    const redirect = redirects[link.origin];
                    if (redirect != null) {
                        if (redirect === 'https://www.tiktok.com/') {
                            console.log(`Link expired: ${link.origin}`);
                            // Link has expired
                            continue;
                        }
                        const url = new URL(redirect);
                        url.host = url.host.replace(/\btiktok\.com$/, 'vxtiktok.com');
                        url.search = '';
                        link.replace = url.toString();
                    }
                    finalLinks.push(link);
                }
                reply(message, finalLinks);
            });
        } else {
            reply(message, fixedLinks);
        }
    }
});

async function reply(message: Message<boolean>, links: FixedLink[]) {
    console.log('Replacing:');
    for (const link of links) {
        console.log(`- ${link.origin} => ${link.replace}`);
    }
    const reply = links.map(link => link.replace).join('\n');
    const settings = await getSettings(message);
    if (settings.embed){
        await message.suppressEmbeds(true)
        message.reply(reply);
    }
    if (settings.delMsg){
        await message.reply(reply);
        await message.delete();
    }
}

type LinkKind = 'twitter' | 'instagram' | 'tiktok' | 'tiktokShortened';
interface FixedLink {
    kind: LinkKind;
    origin: string;
    replace: string;
}

// See vxtiktok source for their handling of TikTok URLs:
// https://github.com/dylanpdx/vxtiktok/blob/main/vxtiktok.py

const r = String.raw;
const linkPattern = [
    r`https://(www\.)?twitter\.com/([a-zA-Z0-9_]{1,15}/status/[0-9]+)`, // Captures 1 and 2
    r`https://(www\.)?instagram\.com/((?:p|reel)/[a-zA-Z0-9_\-]+)`, // Captures 3 and 4
    r`https://(www\.)?tiktok\.com/(@[a-zA-Z0-9_.]*[a-zA-Z0-9_]/video/[0-9]+)`, // Captures 5 and 6
    r`https://(www\.)?tiktok\.com/(t/[a-zA-Z0-9]{9})`, // Captures 7 and 8
].join('|');
const linkRe = new RegExp(linkPattern, 'gi');

function fixLinks(message: string): FixedLink[] {
    const matches = [...message.matchAll(linkRe)];
    const fixedLinks = [];
    if (matches.length > 0) {
        for (const match of matches) {
            const origin = match[0];
            let kind: LinkKind;
            let replace;
            if (match[2] != null) {
                kind = 'twitter';
                replace = `https://${match[1] || ''}fxtwitter.com/${match[2]}`;
            } else if (match[4] != null) {
                kind = 'instagram';
                replace = `https://${match[3] || ''}ddinstagram.com/${match[4]}`;
            } else if (match[6] != null) {
                kind = 'tiktok';
                replace = `https://${match[5] || ''}vxtiktok.com/${match[6]}`;
            } else if (match[8] != null) {
                kind = 'tiktokShortened';
                replace = `https://${match[7] || ''}vxtiktok.com/${match[8]}`;
            } else {
                console.error(`No pattern matched! ${JSON.stringify(message)}`);
                continue;
            }
            fixedLinks.push({ kind, origin, replace });
        }
    }
    return fixedLinks;
}

interface ResolvedLink {
    origin: string;
    redirect?: string;
}

function resolveTikTokShortLink(url: string): Promise<ResolvedLink> {
    return new Promise((resolve, reject) => {
        https.get(url, resp => {
            resolve({ origin: url, redirect: resp.headers.location });
        }).on('error', err => {
            console.error(`Error: GET ${url}: `, err);
            resolve({ origin: url });
        });
    });
}

function resolveTikTokShortLinks(urls: string[]): Promise<{ [origin: string]: string | undefined }> {
    return Promise.all(urls.map(resolveTikTokShortLink)).then(redirects =>
        redirects.reduce((map: { [origin: string]: string | undefined }, curr) => {
            map[curr.origin] = curr.redirect;
            return map;
        }, {})
    );
}

const settings = async <T extends { reply(arg0: string): unknown; guildId: string, options: { _hoistedOptions: { value: unknown }[] } }>(interaction: T) => {
    const embed = interaction.options._hoistedOptions[0].value ? 1:0, delMsg = interaction.options._hoistedOptions[1].value ? 1:0;

    const existCheck = db.prepare(`SELECT * FROM config WHERE guild_id = ?`);
    let data = await existCheck.get(interaction.guildId)

    if (data){
        const update = db.prepare(`UPDATE config SET embed = ?, delMsg = ? WHERE guild_id = ?`)
        update.run(embed, delMsg, interaction.guildId)
    }
    else {
        const insert = db.prepare(`INSERT INTO config (guild_id, embed, delMsg) VALUES(?, ?, ?)`);
        insert.run(interaction.guildId, embed, delMsg);
    }
    data = await existCheck.get(interaction.guildId);
    interaction.reply(`Your settings have been set!\n- Embed Removal: ${Boolean(data.embed)}\n- Original Message Deletion: ${Boolean(data.delMsg)}`);
}

const reset = async <T extends { reply(arg0: string): unknown; guildId: string }>(interaction: T) => {
    const existCheck = db.prepare(`SELECT * FROM config WHERE guild_id= ?`);
    const data = await existCheck.get(interaction.guildId)
    if (data) {
        const update = db.prepare(`UPDATE config SET embed = 1, delMsg = 0 WHERE guild_id = ?`);
        update.run(interaction.guildId)
        interaction.reply(`Your settings have been reset!\n- Embed Removal: True\n- Original Message Deletion: False`);
    }
    else {
        interaction.reply(`You don't seem to have any settings set. This is a problem. Please contact @glenmerlin`)
    }
};

async function getSettings(message: Message<boolean>) {
    const query = db.prepare(`SELECT * FROM config WHERE guild_id = ?`);
    const data = await query.get(message.guildId);
    return data;
}
