import CommandRegistry from "./LoadCommands";
import dotenv from "dotenv";
import { REST, Routes } from "discord.js";

dotenv.config();

const Rest: REST = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

await Rest.put(
    Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.SERVER_ID!
    ),
    { 
        body: Object.values(CommandRegistry).map(Command => Command.Command.toJSON())
    }
); // Testing environment