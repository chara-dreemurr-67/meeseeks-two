import type { SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction } from "discord.js";
import {
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import Command from "#types/Command";
import Env from "#Env";

export default class Source extends Command {
    public Command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
        .setName("source")
        .setDescription("Prints the link to the GitHub repository of this bot.")
    ;

    public async Action(Interaction: ChatInputCommandInteraction): Promise<void> {
        await Interaction.reply({
            content: Env.GetVariable("SOURCE"),
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }
}