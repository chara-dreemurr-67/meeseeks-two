import {
    Client as C,
    GatewayIntentBits,
    Events,
    MessageFlags,
    type AutocompleteFocusedOption
} from "discord.js";
import Command, { InteractionTypes } from "./types/Command.js";
import CommandManager from "./singletons/CommandManager.js";
import LoadEnv from "./singletons/LoadEnv.js";
import EmbedActionInteractionManager, { type Action } from "./singletons/EmbedActionInteractionManager.js";

await CommandManager.LoadCommands();

const Client: C = new C({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages
    ]
});

Client.once(Events.ClientReady, Client => console.log(`Logged in as ${Client.user.tag}`));
Client.on(Events.InteractionCreate, async Interaction => {
    if(Interaction.isAutocomplete()) {
        const Command: Command | undefined = CommandManager.Get(Interaction.commandName);
        if(Command) {
            if(Command.Administrator && !LoadEnv.ADMINISTRATOR_IDS.includes(Interaction.user.id)) 
                return;
            
            const FocusedOption: AutocompleteFocusedOption = Interaction.options.getFocused(true);
            const Handler = Command.GetInteractionHandler(
                InteractionTypes.Autocomplete,
                FocusedOption.name
            );

            if(!Handler)
                return;

            await Handler(Interaction, Client);
        }
        return;
    }

    if(Interaction.isButton()) {
        if(!EmbedActionInteractionManager.Registry[Interaction.user.id]) 
            return;
        
        const EmbedActionInteraction: Action = EmbedActionInteractionManager.Registry[Interaction.user.id][Interaction.customId];

        if(!EmbedActionInteraction) {
            await Interaction.reply({
                content: "This interaction has been expired, or it is not belong to you.",
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const Command: Command | undefined = CommandManager.Get(EmbedActionInteraction.CommandName);
        if(!Command) 
            return;

        const Handler = Command.GetInteractionHandler(
            InteractionTypes.Button,
            EmbedActionInteraction.ActionName
        );
        if(!Handler)
            return;

        return await Handler(Interaction, Client);
    }

    if(Interaction.isAnySelectMenu()) {
        const EmbedActionInteraction: Action = EmbedActionInteractionManager.Registry[Interaction.user.id][Interaction.customId];
        if(!EmbedActionInteraction)
            return;

        const Command: Command | undefined = CommandManager.Get(EmbedActionInteraction.CommandName);
        if(!Command)
            return;

        const ActionName: string = EmbedActionInteraction.ActionName;

        if(Interaction.isStringSelectMenu()) {
            const Handler = Command.GetInteractionHandler(
                InteractionTypes.StringMenu,
                ActionName
            );

            if(!Handler)
                return;

            await Handler(Interaction, Client);
        }
        else if(Interaction.isUserSelectMenu()) {
            const Handler = Command.GetInteractionHandler(
                InteractionTypes.UserMenu,
                ActionName
            );

            if(!Handler)
                return;
            
            await Handler(Interaction, Client);
        }
        else if(Interaction.isRoleSelectMenu()) {
            const Handler = Command.GetInteractionHandler(
                InteractionTypes.RoleMenu,
                ActionName
            );

            if(!Handler)
                return;
            
            await Handler(Interaction, Client);
        }
        else if(Interaction.isChannelSelectMenu()) {
            const Handler = Command.GetInteractionHandler(
                InteractionTypes.ChannelMenu,
                ActionName
            );

            if(!Handler)
                return;
            
            await Handler(Interaction, Client);
        }
        else if(Interaction.isMentionableSelectMenu()) {
            const Handler = Command.GetInteractionHandler(
                InteractionTypes.MentionableMenu,
                ActionName
            );

            if(!Handler)
                return;
            
            await Handler(Interaction, Client);
        }
        return;
    }

    if(!Interaction.isChatInputCommand()) 
        return;

    const Command: Command | undefined = CommandManager.Get(Interaction.commandName);
    if(!Command)
        return;
    
    if(Command.Cancelable) {
        const Existing: AbortController | undefined = Command.Cancelable.Pool.get(Interaction.user.id);
        if(Existing) {
            await Interaction.reply({
                content: Command.Cancelable.Message ?? "This command is still running.",
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        Command.Cancelable.Pool.set(Interaction.user.id, new AbortController());
    }

    try {
        console.log(`${Interaction.user.id}(${Interaction.user.username}) used ${Interaction.commandName}.`);
        if(Command.Administrator && !LoadEnv.ADMINISTRATOR_IDS.includes(Interaction.user.id)) {
            await Interaction.reply({
                content: "You are not permitted to use this command.",
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await Command.Action(Interaction, Command.Cancelable?.Pool.get(Interaction.user.id)?.signal, Client);
    }
    catch(Err) {
        console.error(Err);
        if(Interaction.deferred || Interaction.replied) {
            await Interaction.editReply({
                content: "Something went wrong.",
                allowedMentions: { repliedUser: false }
            });
            return;
        }
        await Interaction.reply({
            content: "Something went wrong.",
            allowedMentions: { repliedUser: false },
            flags: MessageFlags.Ephemeral
        });
    }
    finally {
        if(Command.Cancelable) {
            Command.Cancelable.Pool.delete(Interaction.user.id);
        }
    }
});
Client.login(LoadEnv.DISCORD_TOKEN);