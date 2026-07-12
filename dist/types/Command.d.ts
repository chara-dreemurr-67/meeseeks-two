import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder } from "discord.js";
export interface Command {
    Command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    Action: (Interaction: ChatInputCommandInteraction) => Promise<void>;
    Autocomplete?: (Interaction: AutocompleteInteraction) => Promise<void>;
}
