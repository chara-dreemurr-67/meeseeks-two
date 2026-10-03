import { pathToFileURL } from "url";
import AsyncMap from "#helpers/AsyncMap";
import Command from "#types/Command";
import path from "path";
import fs from "fs/promises";

export default new class CommandManager {
    public readonly CommandRegistry: Map<string, Command> = new Map();
    
    private Loaded: boolean = false;

    public Register(Command: Command): void {
        this.CommandRegistry.set(Command.Command.name, Command);
    }

    public async LoadCommands(): Promise<void> {
        if(this.Loaded)
            return;

        this.Loaded = true;

        const PathToDir: string = path.join(import.meta.dirname, "..", "commands");
        const Extension: string = import.meta.filename.endsWith(".ts") ? ".ts" : ".js";
        await AsyncMap(
            (await fs.readdir(PathToDir)).filter(File => File.endsWith(Extension)),
            async File => {
                const ctor: new () => Command = (await import(pathToFileURL(path.join(PathToDir, File)).href)).default;
                const C: Command = new ctor();

                if(!(C instanceof Command)) 
                    throw new TypeError(`Command ${File} requires to be a child of the Command class.`);

                if(C.Cancelable) 
                    C.Command.setDescription(`${C.Command.description} (Cancelable)`);

                if(C.Administrator)
                    C.Command.setDescription(`${C.Command.description} (Administrator Command)`);
                this.Register(C);
            }
        );
    }
}();