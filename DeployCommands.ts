import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import CommandManager from "./CommandManager.js";

dotenv.config();
await CommandManager.LoadCommands();

const Rest: REST = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

await Rest.put(
    Routes.applicationCommands(
        process.env.CLIENT_ID!
    ),
    {
        body: [...CommandManager.Values()].map(Command => Command.Command.toJSON())
    }
);