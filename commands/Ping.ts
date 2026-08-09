import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import Command from "../types/Command.js";

export default new Command(
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check if the bot is alive or not.")
    ,
    async (Interaction: ChatInputCommandInteraction): Promise<void> => {
        await Interaction.reply({
            content: "It is alive!",
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }
);