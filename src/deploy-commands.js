const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientID, token } = require('../.config.json');
const { PermissionFlagsBits } = require('discord.js');

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
        .setDefaultMemberPermissions(PermissionFlagBits.Administrator)
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