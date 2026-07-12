import fs from "fs";
import path from "path";
const CommandFiles = fs.readdirSync(path.join(import.meta.dirname, "commands"))
    .filter(file => file.endsWith(".ts") || file.endsWith(".js"));
const CommandRegistry = {};
for (const File of CommandFiles) {
    const Command = (await import(`./commands/${File}`)).default;
    CommandRegistry[Command.Command.name] = Command;
}
export default CommandRegistry;
//# sourceMappingURL=LoadCommands.js.map