import type { Guild, Message } from 'discord.js';
import type { NumberBool } from './util';
import { numberBool } from './util';
import Database from 'better-sqlite3';

interface RawGuildConfig {
  guild_id: string;
  embed: NumberBool;
  delMsg: NumberBool;
}

interface GuildConfig {
  guildId: string;
  embed: boolean;
  delMsg: boolean;
}

function configFromRaw(raw: RawGuildConfig): GuildConfig {
  return {
    guildId: raw.guild_id,
    embed: Boolean(raw.embed),
    delMsg: Boolean(raw.delMsg)
  }
}

const db = new Database('/home/glenmerlin/link-fixer/db.sqlite');

export function createConfigForGuild(guild: Guild, embed: boolean, delMsg: boolean): void {
  const insert = db.prepare<[string, NumberBool, NumberBool]>(`INSERT INTO config (guild_id, embed, delMsg) VALUES(?, ?, ?)`);
  insert.run(guild.id, numberBool(embed), numberBool(delMsg));
}

export function updateConfigForGuild(guild: Guild, embed: boolean, delMsg: boolean): void {
  const update = db.prepare<[NumberBool, NumberBool, string]>(`UPDATE config SET embed = ?, delMsg = ? WHERE guild_id = ?`)
  update.run(numberBool(embed), numberBool(delMsg), guild.id);
}

export function resetConfigForGuild(guild: Guild): void {
  updateConfigForGuild(guild, true, false);
}

export function getConfigForGuild(guild: Guild): GuildConfig | null {
  const query = db.prepare<[string]>(`SELECT * FROM config WHERE guild_id = ?`);
  const data = query.get(guild.id) as RawGuildConfig | null;
  if (!data) return null;
  return configFromRaw(data);
}

export function getSettings(message: Message<true>): GuildConfig | null {
  return getConfigForGuild(message.guild);
}
