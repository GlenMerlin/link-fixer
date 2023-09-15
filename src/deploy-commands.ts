#!/usr/bin/env ts-node

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { clientID, token } from './config';

const commands = [
    new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Allows you to tweak per-server configs for link-fixer')
        .addBooleanOption(option => 
            option.setName('embed')
                .setDescription('remove the embed from the original message?')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('delete')
                .setDescription('delete the original message?')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Resets all settings for your server back to default')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(clientID),
            { body: commands },
        );

        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }
})();