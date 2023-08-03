import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import * as https from 'https';

const { token } = require('../.config.json');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.login(token);

client.once('ready', client => {
    console.log('Started up successfully');
    client.user.setActivity('Fixing all the links!');
});

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
    await message.suppressEmbeds(true);
    message.reply(reply);
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

function settings(interaction: any) {
    interaction.reply("you used the settings command!");
}

function reset(interaction: any) {
    interaction.reply("Reset your settings!");
}

