import type { ChatInputCommandInteraction, Message } from 'discord.js';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { get as httpsGet } from 'node:https';
import {
    createConfigForGuild,
    getConfigForGuild,
    getSettings,
    resetConfigForGuild,
    updateConfigForGuild
} from './db';

import { token } from './config';
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.login(token);

client.once('clientReady', client => {
    console.log('Started up successfully');
    client.user.setActivity('Fixing all the links!');
});

client.on(Events.GuildCreate, guild => {
    const data = getConfigForGuild(guild);
    if (!data) {
        createConfigForGuild(guild, true, false);
    }
})

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "settings"){
        await settings(interaction);
    }   
    if (interaction.commandName === "reset"){
        await reset(interaction);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const fixedLinks = fixLinks(message.content);
    if (fixedLinks.length > 0) {
        const tiktokShortLinks = fixedLinks.filter(link => link.kind === 'tiktokShortened')
                                           .map(link => link.origin);
        if (tiktokShortLinks.length > 0) {
            const redirects = await resolveTikTokShortLinks(tiktokShortLinks);
            const finalLinks: Array<FixedLink> = [];
            for (const link of fixedLinks) {
                const redirect = redirects[link.origin];
                if (redirect) {
                    if (redirect === 'https://www.tiktok.com/') {
                        console.log(`Link expired: ${link.origin}`);
                        // Link has expired
                        continue;
                    }
                    const url = new URL(redirect);
                    url.host = url.host.replace(/\btiktok\.com$/, 'tnktok.com');
                    url.search = '';
                    link.replace = url.toString();
                }
                finalLinks.push(link);
            }
            await reply(message, finalLinks);
        } else {
            await reply(message, fixedLinks);
        }
    }
});

async function reply(message: Message, links: FixedLink[]) {
    console.log('Replacing:');
    for (const link of links) {
        console.log(`- ${link.origin} => ${link.replace}`);
    }
    const reply = links.map(link => link.replace).join('\n');

    if (!message.inGuild()) return;
    const settings = getSettings(message);
    if (!settings) {
        console.warn(`No settings found for guild ${message.guildId}`);
        return;
    }
    if (settings.embed){
        await message.suppressEmbeds(true)
        await message.reply(reply);
    }
    if (settings.delMsg){
        await message.reply(reply);
        await message.delete();
    }
}

type LinkKind = 'twitter' | 'instagram' | 'tiktok' | 'tiktokShortened' | 'x.com' | 'reddit' | 'furaffinity';
interface FixedLink {
    kind: LinkKind;
    origin: string;
    replace: string;
}

// See vxtiktok source for their handling of TikTok URLs:
// https://github.com/dylanpdx/vxtiktok/blob/main/vxtiktok.py

const r = String.raw;
const linkPattern = [
    r`(?<!<|\|)https://(www\.)?twitter\.com/([a-zA-Z0-9_]{1,15}/status/[0-9]+)`, // Captures 1 and 2
    r`(?<!<|\|)https://(www\.)?instagram\.com/((?:p|reel)/[a-zA-Z0-9_\-]+)`, // Captures 3 and 4
    r`(?<!<|\|)https://(www\.)?tiktok\.com/(@[a-zA-Z0-9_.\-]*[a-zA-Z0-9_\-]/video/[0-9]+)`, // Captures 5 and 6
    r`(?<!<|\|)https://(www\.)?tiktok\.com/(t/[a-zA-Z0-9_\-]{9})`, // Captures 7 and 8
    r`(?<!<|\|)https://(www\.)?x\.com/([a-zA-Z0-9_]{1,15}/status/[0-9]+)`, // Captures 9 and 10
    r`(?<!<|\|)https://(www\.|old\.)?reddit\.com/r/([a-zA-Z0-9_]{1,25}/(?:comments|s)/[a-zA-Z0-9_]{1,25})`, // Captures 11 and 12
    r`(?<!<|\|)https://(www\.)?furaffinity\.net/view/([0-9]+)` // Captures 13 and 14
].join('|');
const linkRe = new RegExp(linkPattern, 'gi');

function fixLinks(message: string): FixedLink[] {
    const matches = [...message.matchAll(linkRe)];
    const fixedLinks: Array<FixedLink> = [];
    if (matches.length > 0) {
        for (const match of matches) {
            const origin = match[0];
            let kind: LinkKind;
            let replace: string;
            if (match[2] != null) {
                kind = 'twitter';
                replace = `https://${match[1] || ''}fxtwitter.com/${match[2]}`;
            } else if (match[4] != null) {
                kind = 'instagram';
                replace = `https://${match[3] || ''}eeinstagram.com/${match[4]}`;
            } else if (match[6] != null) {
                kind = 'tiktok';
                replace = `https://${match[5] || ''}tnktok.com/${match[6]}`;
            } else if (match[8] != null) {
                kind = 'tiktokShortened';
                replace = `https://${match[7] || ''}tnktok.com/${match[8]}`;
            } else if (match[10] != null){
                kind = 'x.com';
                replace = `https://${match[9] || ''}fxtwitter.com/${match[10]}`;
            } else if (match[12] != null){
                kind = 'reddit';
                replace = `https://${match[11] || ''}rxddit.com/r/${match[12]}`;
            } else if (match[14] != null){
                kind = 'furaffinity';
                replace = `https://${match[13] || ''}vxfuraffinity.net/view/${match[14]}`;
            }
            else {
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

async function resolveTikTokShortLink(url: string): Promise<ResolvedLink> {
    return await new Promise((resolve, reject) => {
        httpsGet(url, resp => {
            resolve({ origin: url, redirect: resp.headers.location });
        }).on('error', err => {
            console.error(`Error: GET ${url}: `, err);
            resolve({ origin: url });
        });
    });
}

async function resolveTikTokShortLinks(urls: string[]): Promise<Record<string, string | undefined>> {
    const redirects = await Promise.all(urls.map(resolveTikTokShortLink));
    return redirects.reduce((map: Record<string, string | undefined>, curr) => {
        map[curr.origin] = curr.redirect;
        return map;
    }, {})
}

async function settings(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        interaction.reply("We're not in a server! Settings only apply in a server.");
        return;
    }

    const embed = interaction.options.getBoolean("embed", true);
    const delMsg = interaction.options.getBoolean("delete", true);

    let data = getConfigForGuild(interaction.guild);

    if (data){
        updateConfigForGuild(interaction.guild, embed, delMsg);
    }
    else {
        createConfigForGuild(interaction.guild, embed, delMsg);
    }

    // Load config again to show user what got saved
    data = getConfigForGuild(interaction.guild);

    interaction.reply(`Your settings have been set!\n- Embed Removal: ${Boolean(data?.embed)}\n- Original Message Deletion: ${Boolean(data?.delMsg)}`);
}

async function reset(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        interaction.reply("We're not in a server. There are no settings to reset!");
        return;
    }
    const data = getConfigForGuild(interaction.guild);
    if (data) {
        resetConfigForGuild(interaction.guild)
        interaction.reply(`Your settings have been reset!\n- Embed Removal: true\n- Original Message Deletion: false`);
    }
    else {
        interaction.reply(`You don't seem to have any settings set. This is a problem. Please contact @glenmerlin`)
    }
};
