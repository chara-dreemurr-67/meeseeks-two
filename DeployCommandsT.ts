import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import CommandManager from "./CommandManager";

dotenv.config();
await CommandManager.LoadCommands();

const Rest: REST = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

await Rest.put(
    Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.SERVER_ID!
    ),
    { 
        body: [...CommandManager.Values()].map(Command => Command.Command.toJSON())
    }
); // Testing environment