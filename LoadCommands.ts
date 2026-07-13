import type { Command } from "./types/Command.js";
import fs from "fs";
import path from "path";

const CommandFiles = fs.readdirSync(path.join(import.meta.dirname, "commands"))
    .filter(file => file.endsWith(".ts") || file.endsWith(".js"))
;
const CommandRegistry: { [CommandName: string]: Command } = {};
for(const File of CommandFiles) {
    const Command: Command = (await import(`./commands/${File}`)).default;
    CommandRegistry[Command.Command.name] = Command;
    if(Command.Cancelable) {
        Command.Command.setDescription(`${Command.Command.description} (Cancelable)`);
    }
}

export default CommandRegistry;