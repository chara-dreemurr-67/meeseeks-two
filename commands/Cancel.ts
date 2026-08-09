import { AutocompleteInteraction, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import Command, { InteractionTypes } from "../types/Command.js";
import CommandManager from "../singletons/CommandManager.js";

export default new Command(
    new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Cancel a running command in case you got fed up with it taking too long to finish.")
        .addStringOption(Option => 
            Option
                .setName("command")
                .setDescription("Command to cancel. Only running, cancelable commands can be canceled.")
                .setAutocomplete(true)
                .setRequired(true)
        )
    ,
    async (Interaction: ChatInputCommandInteraction): Promise<void> => {
        const Target: string = Interaction.options.getString("command", true);
        const Command: Command | undefined = CommandManager.Get(Target);

        if(!Command) {
            await Interaction.reply({
                content: `Command "${Interaction.commandName}" doesn't exist.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if(!Command.Cancelable) {
            await Interaction.reply({
                content: `Command "${Interaction.commandName}" is not cancelable.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const Controller: AbortController | undefined = Command.Cancelable.Pool.get(Interaction.user.id);

        if(!Controller) {
            await Interaction.reply({
                content: `Command "${Interaction.commandName}" is currently not running.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        Controller.abort();
        await Interaction.reply({
            content: `Cancelled "${Target}".`,
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }
)
.AddInteractionHandler(
    InteractionTypes.Autocomplete,
    "command",
    async (Interaction: AutocompleteInteraction): Promise<void> => {
        await Interaction.respond(
            [...CommandManager.Values()]
                .filter(
                    Command => 
                        Command.Cancelable &&
                        Command.Cancelable.Pool.has(Interaction.user.id) &&
                        Command.Command.name.toLowerCase().includes(Interaction.options.getFocused().trim().toLowerCase())
                )
                .map(Command => ({
                    name: Command.Command.name,
                    value: Command.Command.name
                }))
        );
    }
);