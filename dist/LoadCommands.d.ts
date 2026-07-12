import type { Command } from "./types/Command.js";
declare const CommandRegistry: {
    [CommandName: string]: Command;
};
export default CommandRegistry;
