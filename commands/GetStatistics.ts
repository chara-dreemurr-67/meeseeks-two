import { ChatInputCommandInteraction, SlashCommandBuilder, User, EmbedBuilder, MessageFlags } from "discord.js";
import type { MeeseeksLeaderboard, Players, RoleRewards } from "../types/MeeseeksLeaderboard.js";
import type { Command } from "../types/Command.js";
import FetchMeeseeksAPI from "../helpers/FetchMeeseeksAPI.js";
import timers from "timers/promises";

enum FailedReasons {
    APIError,
    GuildNotFound,
    PlayerNotFound,
    UserCancelled
}

interface Failed {
    Status: false;
    Reason: FailedReasons;
}

interface Succeeded {
    Status: true;
    ServerName: string;
    RoleRewards: RoleRewards[];
    EXPPerMessage: [number, number];
    Top1EXP: Players;
    Player: Players;
    Rank: number;
}

type LookForResult = 
    | Failed
    | Succeeded
;

const LookForPlayer = async (User: string, ServerID: string, Signal: AbortSignal): Promise<LookForResult> => {
    let ServerName!: string;
    let RoleRewards!: RoleRewards[];
    let EXPPerMessage!: [number, number];
    let Top1EXP!: Players;
    let Player!: Players;
    let Rank!: number;
    
    try {
        for(let i = 0; i < 1000; i++) {
            const Res: Response = await FetchMeeseeksAPI(ServerID, i, Signal);
            if(Res.status === 404) {
                return {
                    Status: false,
                    Reason: FailedReasons.GuildNotFound
                }
            }
            if(!Res.ok) {
                return {
                    Status: false,
                    Reason: FailedReasons.APIError
                }
            }
    
            const Leaderboard: MeeseeksLeaderboard = await Res.json() as MeeseeksLeaderboard;
            if(i === 0) {
                Top1EXP = Leaderboard.players[0];
                RoleRewards = Leaderboard.role_rewards;
                EXPPerMessage = Leaderboard.xp_per_message;
                ServerName = Leaderboard.guild.name;
            }
            
            const PlayerIndex: number = Leaderboard.players.findIndex(Player => Player.username === User || Player.id === User);
            if(PlayerIndex !== -1) {
                Player = Leaderboard.players[PlayerIndex];
                Rank = PlayerIndex + i * 1000 + 1;
                break;
            }
    
            if(Leaderboard.players.length < 1000) {
                return {
                    Status: false,
                    Reason: FailedReasons.PlayerNotFound
                }
            }
    
            await timers.setTimeout(500, undefined, { signal: Signal });
        }
    }
    catch(Err) {
        if(Err instanceof Error && Err.name === "AbortError") {
            return {
                Status: false,
                Reason: FailedReasons.UserCancelled
            }
        }

        throw Err;
    }
    return {
        Status: true,
        ServerName,
        RoleRewards,
        EXPPerMessage,
        Top1EXP,
        Player,
        Rank
    };
};
const ProgressBar = (Percent: number, Length: number = 20) => {
    Percent = Math.max(0, Math.min(1, Percent));
    const Filled: number = Math.round(Percent * Length);
    return "█".repeat(Filled) + "░".repeat(Length - Filled);
};
const GetTotalExp = (Level: number) => (5 * (91 * Level + 27 * Level ** 2 + 2 * Level ** 3)) / 6;
const FormatDuration = (MS: number, IncludeSlashes: boolean = false) => {
    const TotalSeconds: number = Math.floor(MS / 1000);

    const Days: number = Math.floor(TotalSeconds / 86400);
    const Hours: number = Math.floor((TotalSeconds % 86400) / 3600);
    const Minutes: number = Math.floor((TotalSeconds % 3600) / 60);
    const Seconds: number = TotalSeconds % 60;

    return (
        `${String(Days).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
        `${String(Hours).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
        `${String(Minutes).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
        `${String(Seconds).padStart(2, '0')}`
    );
};
const Average = (...Numbers: number[]): number => Numbers.reduce((Total: number, Num: number): number => Total + Num, 0) / Numbers.length;
const GetStatistcString = (Statistic: Succeeded) => {
    const CurrentEXP: number = Statistic.Player.detailed_xp[0];
    const NextLevel: number = Statistic.Player.detailed_xp[1];
    const ToNextLevel: number = NextLevel - CurrentEXP;
    const MessagesLeft: number = Math.ceil(ToNextLevel / Average(...Statistic.EXPPerMessage));
    
    return (
        `${Statistic.Player.username}, ` +
        `RANK #${Statistic.Rank} LEVEL ${Statistic.Player.level}, ` +
        `${CurrentEXP}/${NextLevel} EXP ` +
        `${((CurrentEXP / NextLevel) * 100).toFixed(2)}%, ` +
        `Total EXP: ${Statistic.Player.xp}, Total msg: ${Statistic.Player.message_count}, ` +
        `Time spent: ${FormatDuration(Statistic.Player.message_count * 60000, true)}, ` +
        `${ToNextLevel} EXP of ` +
        `${MessagesLeft} message${MessagesLeft > 1 ? "s" : ""} left till LEVEL ${Statistic.Player.level + 1}, ` +
        `${((Statistic.Player.xp / Statistic.Top1EXP.xp) * 100).toFixed(2)}% of ${Statistic.Top1EXP.username}`
    );
};

const Cooldowns: Record<string, number> = {};

export default {
    Command: new SlashCommandBuilder()
        .setName("getstatistics")
        .setDescription("Get your or someone else's progress to a specific level.")
        .addUserOption(Option => 
            Option
                .setName("who")
                .setDescription("User to get progress of. Default is yourself.")
                .setRequired(false)
        )
        .addStringOption(Option => 
            Option
                .setName("where")
                .setDescription("Server to get progress on. Default is whatever server you're using the command in.")
                .setRequired(false)
        )
        .addBooleanOption(Option => 
            Option
                .setName("ephemeral")
                .setDescription("Whether to turn the message into a \"Only you can see this\" message. Default is true.")
                .setRequired(false)
        )
    ,
    Action: async (Interaction: ChatInputCommandInteraction, Signal: AbortSignal | undefined): Promise<void> => {
        const Start: number = Date.now();

        const Who: User = Interaction.options.getUser("who", false) ?? Interaction.user;
        const Where: string | null = Interaction.options.getString("where", false) ?? Interaction.guildId;
        const IsEphemeral: boolean = Interaction.options.getBoolean("ephemeral", false) ?? true;
        const UserID: string = Interaction.user.id;

        const CDEnds: number = Cooldowns[UserID];
        const Now: number = Date.now();
        if(CDEnds && CDEnds > Now) {
            const Remaining: string = ((CDEnds - Now) / 1000).toFixed(1);
            await Interaction.reply({
                content: `Please wait ${Remaining}s before using this command again.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if(!Where) {
            await Interaction.reply({
                content: `No server specified!`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        await Interaction.deferReply({
            flags: IsEphemeral ? MessageFlags.Ephemeral : undefined
        });
        
        const Result: LookForResult = await LookForPlayer(Who.id, Where, Signal!);
        Cooldowns[UserID] = Date.now() + 7500;
        setTimeout(() => delete Cooldowns[UserID], 7500);
        if(!Result.Status) {
            let ErrorMessage: string;

            switch(Result.Reason) {
                case FailedReasons.GuildNotFound:
                    ErrorMessage = `Server ${Where} doesn't exist or doesn't use MEE6 leveling.`;
                    break;
                case FailedReasons.PlayerNotFound:
                    ErrorMessage = `User ${Who.id}(${Who.username}) isn't in ${Where} or isn't in the top 1000000 of the server.`;
                    break;
                case FailedReasons.UserCancelled:
                    ErrorMessage = "Command ended due to user canceling.";
                    break;
                case FailedReasons.APIError:
                    ErrorMessage = "API Error.";
                    break;
            }

            await Interaction.followUp({
                content: ErrorMessage!,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
            await Interaction.deleteReply().catch(() => {});
            return;
        }

        const Player: Players = Result.Player;
        const Top1: Players = Result.Top1EXP;
        const RoleRewards: RoleRewards[] = Result.RoleRewards;
        const CurrentEXP: number = Result.Player.detailed_xp[0];
        const NextLevel: number = Result.Player.detailed_xp[1];
        const ToNextLevel: number = NextLevel - CurrentEXP;
        const TotalEXP: number = Player.xp;
        const TotalToNextLevel: number = GetTotalExp(Player.level + 1);

        const Index: number = RoleRewards.findIndex(Reward => Reward.rank > Player.level);
        const Color: number = RoleRewards.length && Player.level > RoleRewards[0].rank
            ? RoleRewards[Index !== -1 ? Index -1 : RoleRewards.length - 1].role.color
            : 0xffffff
        ;
        const LevelPercentage: number = CurrentEXP / NextLevel;
        const OverallPercentage: number = TotalEXP / TotalToNextLevel;
        const ToTop1Percentage: number = TotalEXP / Top1.xp;
        const MessagesLeft: number = Math.ceil(ToNextLevel / Average(...Result.EXPPerMessage));

        const Embed: EmbedBuilder = new EmbedBuilder()
            .setColor(Color)
            .setAuthor({
                name: Player.username,
                url: `https://discord.com/users/${Player.id}`,
                iconURL: Who.displayAvatarURL({ size: 256 })
            })
            .setThumbnail(Who.displayAvatarURL({ size: 512 }))
            .setTitle(Result.ServerName)
            .setDescription(
                `Total messages: ${Player.message_count}, ` +
                `Time spent: ${FormatDuration(Player.message_count * 60000)}`
            )
            .addFields(
                {
                    name: "Level",
                    value: Player.level.toLocaleString(),
                    inline: true
                },
                {
                    name: "Rank",
                    value: `#${Result.Rank}`,
                    inline: true
                },
                {
                    name: "Total EXP",
                    value: TotalEXP.toLocaleString(),
                    inline: true
                },
                {
                    name: `Progress to level ${Player.level + 1}`,
                    value:
                        `\`${ProgressBar(LevelPercentage)}\` ${(LevelPercentage * 100).toFixed(2)}%\n` +
                        `${CurrentEXP.toLocaleString()} / ${NextLevel.toLocaleString()} EXP ` +
                        `(${MessagesLeft} message${MessagesLeft > 1 ? "s" : ""})`
                },
                {
                    name: `Overall progress to level ${Player.level + 1}`,
                    value:
                        `\`${ProgressBar(OverallPercentage)}\` ${(OverallPercentage * 100).toFixed(2)}%\n` +
                        `${TotalEXP.toLocaleString()} / ${TotalToNextLevel.toLocaleString()} EXP `
                },
                {
                    name: `Progress to #1 (${Top1.username})`,
                    value:
                        `\`${ProgressBar(ToTop1Percentage)}\` ${(ToTop1Percentage * 100).toFixed(2)}%\n` +
                        `${TotalEXP.toLocaleString()} / ${Top1.xp.toLocaleString()} EXP` 
                },
                {
                    name: "Statistic",
                    value: "```\n" + GetStatistcString(Result) + "\n```"
                }
            )
            .setFooter({
                text: `Finishes in ${((Date.now() - Start) / 1000).toFixed(1)}s`
            })
        ;

        await Interaction.editReply({ 
            embeds: [Embed],
            allowedMentions: { repliedUser: false }
        });
    },
    Cancelable: {
        Pool: new Map(),
        Message: "Your previous request is still running. Please wait until it finishes."
    }
} satisfies Command;