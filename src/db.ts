import type { Guild, Message } from 'discord.js';
import type { NumberBool } from './util';
import { boolToNum } from './util';
import { boolean, coerce, create, literal, nonempty, string, type, union } from 'superstruct';
import Database from 'better-sqlite3';

// `0 | 1`
const numberBool = union([literal(0), literal(1)]);

// Should turn `boolean` values into `0 | 1`
const numberOrBool = coerce(numberBool, boolean(), Boolean);

const rawGuildConfigSchema = type({
    guild_id: nonempty(string()),
    embed: numberOrBool,
    delMsg: numberOrBool
});

interface GuildConfig {
    guildId: string;
    embed: boolean;
    delMsg: boolean;
}

function configFromRaw(raw: typeof rawGuildConfigSchema.TYPE): GuildConfig {
    return {
        guildId: raw.guild_id,
        embed: Boolean(raw.embed),
        delMsg: Boolean(raw.delMsg)
    }
}

const db = new Database('../db.sqlite');

export function createConfigForGuild(guild: Guild, embed: boolean, delMsg: boolean): void {
    const insert = db.prepare<[string, NumberBool, NumberBool]>(`INSERT INTO config (guild_id, embed, delMsg) VALUES(?, ?, ?)`);
    insert.run(guild.id, boolToNum(embed), boolToNum(delMsg));
}

export function updateConfigForGuild(guild: Guild, embed: boolean, delMsg: boolean): void {
    const update = db.prepare<[NumberBool, NumberBool, string]>(`UPDATE config SET embed = ?, delMsg = ? WHERE guild_id = ?`)
    update.run(boolToNum(embed), boolToNum(delMsg), guild.id);
}

export function resetConfigForGuild(guild: Guild): void {
    updateConfigForGuild(guild, true, false);
}

export function getConfigForGuild(guild: Guild): GuildConfig | null {
    const query = db.prepare<[string]>(`SELECT * FROM config WHERE guild_id = ?`);
    const data = query.get(guild.id);
    if (!data) return null;
    
    // Try to construct a config from the input data.
    // If the database is corrupted somehow, fail early.
    const configData = create(data, rawGuildConfigSchema);
    
    return configFromRaw(configData);
}

export function getSettings(message: Message<true>): GuildConfig | null {
    return getConfigForGuild(message.guild);
}
