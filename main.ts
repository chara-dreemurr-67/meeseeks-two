import { Client as C, GatewayIntentBits, Events } from "discord.js";
import type { Command } from "./types/Command.js";
import dotenv from "dotenv";
import CommandRegistry from "./LoadCommands.js";

dotenv.config();

const Client: C = new C({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

Client.once(Events.ClientReady, Client => console.log(`Logged in as ${Client.user.tag}`));
Client.on(Events.InteractionCreate, async Interaction => {
    if(!Interaction.isChatInputCommand()) 
        return;

    const Command: Command = CommandRegistry[Interaction.commandName];
    if(!Command)
        return;

    try {
        console.log(`${Interaction.user.id}(${Interaction.user.username}) used ${Interaction.commandName}.`);
        await Command.Action(Interaction);
    }
    catch(Err) {
        console.error(Err);

        if(Interaction.replied || Interaction.deferred) {
            await Interaction.followUp({
                content: "Something went wrong.",
                ephemeral: true,
            });
        } 
        else {
            await Interaction.reply({
                content: "Something went wrong.",
                ephemeral: true,
            });
        }
    }
});
Client.login(process.env.DISCORD_TOKEN);