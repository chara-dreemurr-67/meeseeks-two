import { REST, Routes } from "discord.js";
import CommandManager from "#CommandManager";
import Env from "commaenv";
import "./init.js";

const Rest: REST = new REST({ version: "10" }).setToken(Env.GetVariable("DISCORD_TOKEN"));

await Rest.put(
    Routes.applicationCommands(
        Env.GetVariable("CLIENT_ID")
    ),
    {
        body: [...
            CommandManager.CommandRegistry.values()
                .map(Command => Command.Command.toJSON())
        ]
    }
);
