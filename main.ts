import { Client as C, GatewayIntentBits, Events, MessageFlags } from "discord.js";
import type { Command } from "./types/Command.js";
import dotenv from "dotenv";
import CommandManager from "./CommandManager.js";

dotenv.config();
await CommandManager.LoadCommands();

const Client: C = new C({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

Client.once(Events.ClientReady, Client => console.log(`Logged in as ${Client.user.tag}`));
Client.on(Events.InteractionCreate, async Interaction => {
    if(Interaction.isAutocomplete()) {
        const Command: Command | undefined = CommandManager.Get(Interaction.commandName);
        if(Command && Command.Autocomplete)
            await Command.Autocomplete(Interaction);
        return;
    }

    if(!Interaction.isChatInputCommand()) 
        return;

    const Command: Command | undefined = CommandManager.Get(Interaction.commandName);
    if(!Command)
        return;
    
    let Arg2: AbortController | undefined = undefined;
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
        
        const Controller: AbortController = new AbortController();
        Arg2 = Controller;
        Command.Cancelable.Pool.set(Interaction.user.id, Controller);
    }

    try {
        console.log(`${Interaction.user.id}(${Interaction.user.username}) used ${Interaction.commandName}.`);
        await Command.Action(Interaction, Arg2?.signal);
    }
    catch(Err) {
        console.error(Err);

        if(Interaction.replied || Interaction.deferred) {
            await Interaction.followUp({
                content: "Something went wrong.",
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
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
Client.login(process.env.DISCORD_TOKEN);