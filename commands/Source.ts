import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import Command from "../types/Command.js";

export default new Command(
    new SlashCommandBuilder()
        .setName("source")
        .setDescription("Prints the link to the GitHub repository of this bot.")
    ,
    async (Interaction: ChatInputCommandInteraction): Promise<void> => {
        await Interaction.reply({
            content: "https://github.com/chara-dreemurr-67/meeseeks-two",
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }
);