import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types/Command.js";

export default {
    Command: new SlashCommandBuilder().setName("ping").setDescription("Check if the bot is alive or not."),
    Action: async (Interaction: ChatInputCommandInteraction) => { 
        await Interaction.reply({ content: "It is alive!", allowedMentions: { repliedUser: false } });
    }
} satisfies Command;