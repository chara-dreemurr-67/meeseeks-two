import type { Embed } from "#EmbedManager";
import type { AutocompleteFocusedOption } from "discord.js";
import {
    Client as C,
    Events,
    GatewayIntentBits,
    MessageFlags,
} from "discord.js";
import type Command from "#types/Command";
import CommandManager from "#CommandManager";
import InteractionTypes from "#types/InteractionTypes";
import EmbedManager from "#EmbedManager";
import IsAdmin from "#helpers/IsAdmin";
import Env from "#Env";
import "./init.js";
import "./deploy.js";

const Client: C = new C({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages
    ]
});

Client.once(Events.ClientReady, Client => console.log(`Logged in as ${Client.user.tag}`));
Client.on(Events.InteractionCreate, async Interaction => {
    if(Interaction.isAutocomplete()) {
        const Command: Command | undefined = CommandManager.CommandRegistry.get(Interaction.commandName);

        if(
            !Command
            || Command.Administrator && !IsAdmin(Interaction.user.id)
        ) return;
        const FocusedOption: AutocompleteFocusedOption = Interaction.options.getFocused(true);
        return await Command.GetInteractionHandler(
            InteractionTypes.Autocomplete,
            FocusedOption.name
        )?.(Interaction, Client);
    }

    if(Interaction.isButton()) {
        const Embed: Embed = EmbedManager.EmbedRegistry[Interaction.user.id]?.[Interaction.customId];
        if(!Embed)
            return;
        
        return await CommandManager.CommandRegistry.get(Embed.CommandName)?.GetInteractionHandler(
            InteractionTypes.Button,
            Embed.ActionName
        )?.(Interaction, Client);
    }

    if(Interaction.isAnySelectMenu()) {
        const Embed: Embed = EmbedManager.EmbedRegistry[Interaction.user.id]?.[Interaction.customId];
        if(!Embed)
            return;

        let Type: InteractionTypes;

        switch(true) {
            case Interaction.isStringSelectMenu(): Type = InteractionTypes.StringMenu; break;
            case Interaction.isUserSelectMenu(): Type = InteractionTypes.UserMenu; break;
            case Interaction.isRoleSelectMenu(): Type = InteractionTypes.RoleMenu; break;
            case Interaction.isChannelSelectMenu(): Type = InteractionTypes.ChannelMenu; break;
            case Interaction.isMentionableSelectMenu(): Type = InteractionTypes.MentionableMenu; break;
            default: return;
        }

        return await CommandManager.CommandRegistry.get(Embed.CommandName)?.GetInteractionHandler(
            Type,
            Embed.ActionName
        )?.(Interaction, Client);
    }

    if(!Interaction.isChatInputCommand()) 
        return;

    const Command: Command | undefined = CommandManager.CommandRegistry.get(Interaction.commandName);
    if(!Command)
        return;

    if(Command.Administrator && !IsAdmin(Interaction.user.id)) {
        return await Interaction.reply({
            content: "You are not permitted to use this command.",
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }

    if(Command.Cancelable) {
        const Existing: AbortController | undefined = Command.Pool!.get(Interaction.user.id);
        if(Existing) {
            return await Interaction.reply({
                content: Command.CancelMessage ?? "This command is still running.",
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
        }
        
        Command.Pool!.set(Interaction.user.id, new AbortController());
    }

    try {
        console.log(`${Interaction.user.id}(${Interaction.user.username}) used ${Interaction.commandName}.`);
        await Command.Action(
            Interaction,
            {
                Signal: Command.Pool?.get(Interaction.user.id)?.signal,
                Client: Client
            }
        );
    }
    catch(Err) {
        console.error(Err);
        if(Interaction.deferred || Interaction.replied) {
            return await Interaction.editReply({
                content: "Something went wrong.",
                allowedMentions: { repliedUser: false }
            });
        }
        await Interaction.reply({
            content: "Something went wrong.",
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }
    finally {
        if(Command.Cancelable) {
            Command.Pool!.delete(Interaction.user.id);
        }
        return;
    }
});
Client.login(Env.GetVariable("DISCORD_TOKEN"));