import CommandManager from "#CommandManager";
import Env from "commaenv";

await CommandManager.LoadCommands();
Env.RegisterVariable("ADMINISTRATOR_IDS", Env.array("string").Default([]))
    .RegisterVariable("EMBED_EXPIRY_DURATION", Env.number().Default(900))
    .RegisterVariable("SOURCE", Env.string().Default("https://github.com/chara-dreemurr-67/claires-bot-template"))
    .RegisterVariable("DISCORD_TOKEN")
    .RegisterVariable("CLIENT_ID")
;