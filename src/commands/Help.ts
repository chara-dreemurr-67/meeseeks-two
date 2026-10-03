import type {
    SlashCommandOptionsOnlyBuilder,
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction
} from "discord.js";
import {
    EmbedBuilder,
    SlashCommandBuilder,
    MessageFlags
} from "discord.js";
import Command from "#types/Command";
import CommandManager from "#CommandManager";
import GetMaxPage from "#helpers/GetMaxPage";
import Paginate from "#helpers/Paginate";
import ButtonType from "#types/ButtonType";
import ConstructNavigationButtonRow from "#helpers/ConstructNavigationButtonRow";
import AddNavigationButtonHandler from "#decorators/AddNavigationButtonHandler";
import EmbedManager from "#EmbedManager";
import Switch from "#helpers/Switch";

interface InteractionMeta {
    CurrentPage: number;
    MaxPage: number;
    InteractionIDs: Record<ButtonType, string>;
}

export default class Help extends Command {
    public readonly Command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get a list of commands.")
    ;

    public async Action(Interaction: ChatInputCommandInteraction): Promise<void> {
        await Interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const UserID: string = Interaction.user.id;
        const Commands: Command[] = [...CommandManager.CommandRegistry.values()];
        const MaxPage: number = GetMaxPage(Commands, 25);

        if(MaxPage > 1) {
            const CommandPage: Command[] = Paginate(Commands, 1, 25);
            const CommandName: string = Interaction.commandName;
            const InteractionMeta: InteractionMeta = {
                CurrentPage: 1,
                MaxPage,
                InteractionIDs: {
                    [ButtonType.BackwardToStart]: "",
                    [ButtonType.Backward]: "",
                    [ButtonType.Forward]: "",
                    [ButtonType.ForwardToEnd]: ""
                }
            };
            const MetaID: string = EmbedManager.AddMeta(InteractionMeta);
            
            const InteractionIDs: Record<ButtonType, string> = {
                [ButtonType.BackwardToStart]: EmbedManager.AddEmbed(
                    UserID,
                    CommandName,
                    ButtonType.BackwardToStart,
                    MetaID
                ),
                [ButtonType.Backward]: EmbedManager.AddEmbed(
                    UserID,
                    CommandName,
                    ButtonType.Backward,
                    MetaID
                ),
                [ButtonType.Forward]: EmbedManager.AddEmbed(
                    UserID,
                    CommandName,
                    ButtonType.Forward,
                    MetaID
                ),
                [ButtonType.ForwardToEnd]: EmbedManager.AddEmbed(
                    UserID,
                    CommandName,
                    ButtonType.ForwardToEnd,
                    MetaID
                )
            };

            InteractionMeta.InteractionIDs = InteractionIDs;

            const Embed: EmbedBuilder = new EmbedBuilder()
                .setColor(0x00ffff)
                .setTitle("Help command.")
                .setDescription(`Page 1 / ${MaxPage}`)
                .addFields(
                    ...CommandPage.map(Command => ({
                        name: `/${Command.Command.name} ${
                            Command.Command.options.map(
                                Option => `[${Option.toJSON().name}${Option.toJSON().required ? "*" : ""}]`
                            ).join(" ")
                        }`.trim(),
                        value: `${Command.Command.description}`,
                        inline: true 
                    }))
                )
                .setFooter({ 
                    text: "* = required options, (Administrator Command) = commands only the bot administrators can run, (Cancelable) = long running commands that can be cancel with /cancel."
                })
            ;
            
            const ButtonRow: ActionRowBuilder<ButtonBuilder> = ConstructNavigationButtonRow(
                1, MaxPage, InteractionIDs,
            );

            await Interaction.editReply({
                embeds: [Embed],
                components: [ButtonRow],
                allowedMentions: { repliedUser: false }
            });
            return;
        }
        const Embed: EmbedBuilder = new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle("Help command.")
            .addFields(
                ...Commands.map(Command => ({
                    name: `/${Command.Command.name} ${
                        Command.Command.options.map(
                            Option => `[${Option.toJSON().name}${Option.toJSON().required ? "*" : ""}]`
                        ).join(" ")
                    }`.trim(),
                    value: `${Command.Command.description}`,
                    inline: true 
                }))
            )
            .setFooter({ 
                text: "* = required options, (Administrator Command) = commands only the bot administrators can run, (Cancelable) = long running commands that can be cancel with /cancel."
            })
        ;

        await Interaction.editReply({
            embeds: [Embed],
            allowedMentions: { repliedUser: false }
        });
    }

    @AddNavigationButtonHandler()
    public async NavButtonHandler(Interaction: ButtonInteraction, Type: ButtonType): Promise<void> {
        const InteractionMeta: InteractionMeta | undefined = EmbedManager.GetMeta<InteractionMeta>(
            Interaction.user.id, 
            Interaction.customId
        );
        
        if(!InteractionMeta)
            return;
        
        await Interaction.deferUpdate();

        const Commands: Command[] = [...CommandManager.CommandRegistry.values()];
        const MaxPage: number = GetMaxPage(Commands, 20);

        InteractionMeta.CurrentPage = Switch(Type, {
            [ButtonType.BackwardToStart]: 1,
            [ButtonType.Backward]: InteractionMeta.CurrentPage - 1,
            [ButtonType.Forward]: InteractionMeta.CurrentPage + 1,
            [ButtonType.ForwardToEnd]: MaxPage
        });

        const CommandPage: Command[] = Paginate(Commands, InteractionMeta.CurrentPage, 25);
        
        const Embed: EmbedBuilder = new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle("Help command.")
            .setDescription(`Page ${InteractionMeta.CurrentPage} / ${MaxPage}`)
            .addFields(
                ...CommandPage.map(Command => ({
                    name: `/${Command.Command.name} ${
                        Command.Command.options.map(
                            Option => `[${Option.toJSON().name}${Option.toJSON().required ? "*" : ""}]`
                        ).join(" ")
                    }`.trim(),
                    value: `${Command.Command.description}`,
                    inline: true 
                }))
            )
            .setFooter({ 
                text: "* = required options, (Administrator Command) = commands only the bot administrators can run, (Cancelable) = long running commands that can be cancel with /cancel."
            })
        ;
        
        const ButtonRow: ActionRowBuilder<ButtonBuilder> = ConstructNavigationButtonRow(
            InteractionMeta.CurrentPage, InteractionMeta.MaxPage, InteractionMeta.InteractionIDs,
        );

        await Interaction.update({
            embeds: [Embed],
            components: [ButtonRow],
            allowedMentions: { repliedUser: false }
        });
    }
}