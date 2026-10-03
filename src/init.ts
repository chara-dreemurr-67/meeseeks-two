import CommandManager from "#CommandManager";
import Env, { VariableTypes } from "#Env";

await CommandManager.LoadCommands();
Env.RegisterVariable("ADMINISTRATOR_IDS", { Type: VariableTypes.Array, Default: [] })
    .RegisterVariable("EMBED_EXPIRY_DURATION", { Type: VariableTypes.Number, Default: 900 })
    .RegisterVariable("SOURCE", { Default: "https://github.com/chara-dreemurr-67/claires-bot-template" })
    .RegisterVariable("DISCORD_TOKEN")
    .RegisterVariable("CLIENT_ID")
;