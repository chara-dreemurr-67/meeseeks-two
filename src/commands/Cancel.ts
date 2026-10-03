import type {
    SlashCommandOptionsOnlyBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction
} from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import Command from "#types/Command";
import CommandManager from "#CommandManager";
import InteractionRegistry from "../decorators/InteractionRegistry.js";
import InteractionTypes from "#types/InteractionTypes";

export default class Cancel extends Command {
    public readonly Command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Cancel a running command in case you got fed up with it taking too long to finish.")
        .addStringOption(Option => 
            Option
                .setName("command")
                .setDescription("Command to cancel. Only running, cancelable commands can be canceled.")
                .setAutocomplete(true)
                .setRequired(true)
        )
    ;

    public async Action(Interaction: ChatInputCommandInteraction): Promise<any> {
        const Target: string = Interaction.options.getString("command", true);
        const Command: Command | undefined = CommandManager.CommandRegistry.get(Target);

        if(!Command) {
            return await Interaction.reply({
                content: `Command "${Interaction.commandName}" doesn't exist.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
        }
    
        if(!Command.Cancelable) {
            return await Interaction.reply({
                content: `Command "${Interaction.commandName}" is not cancelable.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
        }
    
        const Controller: AbortController | undefined = Command.Pool!.get(Interaction.user.id);
    
        if(!Controller) {
            return await Interaction.reply({
                content: `Command "${Interaction.commandName}" is currently not running.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
        }
        
        Controller.abort();
        return await Interaction.reply({
            content: `Cancelled "${Target}".`,
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }

    @InteractionRegistry(InteractionTypes.Autocomplete, "command")
    public async command(Interaction: AutocompleteInteraction): Promise<void> {
        return await Interaction.respond([...
            CommandManager.CommandRegistry.values()
                .filter(
                    Command =>
                        Command.Cancelable &&
                        Command.Pool?.has(Interaction.user.id) &&
                        Command.Command.name.toLowerCase().includes(Interaction.options.getFocused().trim().toLowerCase())
                )
                .map(Command => ({ name: Command.Command.name, value: Command.Command.name }))
        ]);
    }
}