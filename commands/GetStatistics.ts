import { ChatInputCommandInteraction, SlashCommandBuilder, User, EmbedBuilder, Faces, MessageFlags } from "discord.js";
import { Command } from "../types/Command";
import { MeeseeksLeaderboard, Players, RoleRewards } from "../types/MeeseeksLeaderboard";
import FetchMeeseeksAPI from "../helpers/FetchMeeseeksAPI";
import timers from "timers/promises";

enum FailedReasons {
    PlayerNotFound,
    GuildNotFound
}

interface LookForResult {
    /**
     * True = found, False = not found;
     */
    Status: boolean;
    Reason?: FailedReasons;
    RoleRewards?: RoleRewards[];
    EXPPerMessage?: [number, number];
    Top1EXP?: Players;
    Player?: Players;
    Rank?: number;
}

const LookForPlayer = async (User: string, ServerID: string): Promise<LookForResult> => {
    const Output: LookForResult = {
        Status: false
    };
    
    for(let i = 0; i < 1000; i++) {
        const Res: Response = await FetchMeeseeksAPI(ServerID, i);
        if(!Res.ok) {
            Output.Reason = FailedReasons.GuildNotFound;
            break;
        }

        const Leaderboard: MeeseeksLeaderboard = await Res.json();
        if(i === 0) {
            Output.Top1EXP = Leaderboard.players[0];
            Output.RoleRewards = Leaderboard.role_rewards;
            Output.EXPPerMessage = Leaderboard.xp_per_message;
        }
        
        const PlayerIndex: number = Leaderboard.players.findIndex(Player => Player.username === User || Player.id === User);
    
        if(PlayerIndex !== -1) {
            Output.Status = true;
            Output.Player = Leaderboard.players[PlayerIndex];
            Output.Rank = PlayerIndex + i * 1000 + 1;
            break;
        }

        if(i === 999) {
            Output.Reason = FailedReasons.PlayerNotFound;
            break;
        }

        await timers.setTimeout(500);
    }
    return Output;
};
const ProgressBar = (Percent: number, Length: number = 20) => {
    Percent = Math.max(0, Math.min(1, Percent));
    const Filled: number = Math.round(Percent * Length);
    return "█".repeat(Filled) + "░".repeat(Length - Filled);
};
const GetTotalExp = (Level: number) => (5 * (91 + Level + 27 * Level ** 2 + 2 * Level ** 3)) / 6;
const FormatDuration = (MS: number, IncludeSlashes: boolean = false) => {
    const TotalSeconds = Math.floor(MS / 1000);

    const Days = Math.floor(TotalSeconds / 86400);
    const Hours = Math.floor((TotalSeconds % 86400) / 3600);
    const Minutes = Math.floor((TotalSeconds % 3600) / 60);
    const Seconds = TotalSeconds % 60;

    return `${String(Days).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
           `${String(Hours).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
           `${String(Minutes).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
           `${String(Seconds).padStart(2, '0')}`;
};
const Average = (...Numbers: number[]): number => Numbers.reduce((Total: number, Num: number): number => Total + Num, 0) / Numbers.length;
const GetStatistcString = (Statistic: LookForResult) => {
    if(!Statistic.Player || !Statistic.Rank || !Statistic.Top1EXP || !Statistic.EXPPerMessage) 
        return "";
    
    return `${
        Statistic.Player.username
    }, RANK #${
        Statistic.Rank
    } LEVEL ${
        Statistic.Player.level
    }, ${
        Statistic.Player.detailed_xp[0]
    }/${
        Statistic.Player.detailed_xp[1]
    } EXP ${
        ((Statistic.Player.detailed_xp[0] / Statistic.Player.detailed_xp[1]) * 100).toFixed(2)
    }%, Total EXP: ${
        Statistic.Player.xp
    }, Total msg: ${
        Statistic.Player.message_count
    }, Time spent: ${
        FormatDuration(Statistic.Player.message_count * 60000, true)
    }, ${
        Statistic.Player.detailed_xp[1] - Statistic.Player.detailed_xp[0]
    } EXP of ${
        Math.ceil((Statistic.Player.detailed_xp[1] - Statistic.Player.detailed_xp[0]) / Average(...Statistic.EXPPerMessage))
    } messages left till LEVEL ${
        Statistic.Player.level + 1
    }, ${
        ((Statistic.Player.xp / Statistic.Top1EXP.xp) * 100).toFixed(2)
    }% of ${
        Statistic.Top1EXP.username
    }`;
};

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
                .setDescription("Server to get progress. Default is whatever server you're using the command in.")
                .setRequired(false)
        )
        .addBooleanOption(Option => 
            Option
                .setName("ephemeral")
                .setDescription("Whether to turn the message into a \"Only you can see this\" message. Default is true.")
                .setRequired(false)
        )
    ,
    Action: async (Interaction: ChatInputCommandInteraction): Promise<void> => {
        const Who: User = Interaction.options.getUser("who", false) ?? Interaction.user;
        const Where: string | undefined = Interaction.options.getString("where", false) ?? Interaction.guild?.id;
        if(!Where) {
            await Interaction.reply({ content: "No server specified!", allowedMentions: { repliedUser: false }});
            return;
        }

        const Result: LookForResult = await LookForPlayer(Who.id, Where);
        if(!Result.Status) {
            let ErrorMessage: string;

            switch(Result.Reason) {
                case FailedReasons.GuildNotFound:
                    ErrorMessage = `Server ${Where} doesn't exist or doesn't use MEE6 leveling.`;
                    break;
                case FailedReasons.PlayerNotFound:
                    ErrorMessage = `User ${Who.id}(${Who.username}) isn't in ${Where} or isn't in the top 1000000 of the server.`;
                    break;
                default:
                    ErrorMessage = "Something went wrong, please try again later.";
                    break;
            }

            await Interaction.reply({ content: ErrorMessage, allowedMentions: { repliedUser: false }, flags: MessageFlags.Ephemeral });
            return;
        }

        if(!Result.Player || !Result.Rank || !Result.RoleRewards || !Result.Top1EXP) {
            await Interaction.reply({ content: "Something went wrong, please try again later.", allowedMentions: { repliedUser: false }, flags: MessageFlags.Ephemeral });
            return;
        }

        let Color: number = 0xffffff;
        for(const Reward of Result.RoleRewards) {
            if(Reward.rank >= Result.Player.level) {
                Color = Reward.role.color;
                break;
            }
        }

        const LevelPercentage: number = Result.Player.detailed_xp[0] / Result.Player.detailed_xp[1];
        const ToTop1Percentage: number = Result.Player.xp / Result.Top1EXP.xp;

        const Embed: EmbedBuilder = new EmbedBuilder()
            .setColor(Color)
            .setAuthor({
                name: Result.Player.username,
                iconURL: Who.displayAvatarURL({ size: 256 })
            })
            .setThumbnail(Who.displayAvatarURL({ size: 512 }))
            .setTitle(`Level ${Result.Player.level}`)
            .addFields(
                {
                    name: "Rank",
                    value: `#${Result.Rank}`,
                    inline: true
                },
                {
                    name: "Total EXP",
                    value: Result.Player.xp.toLocaleString(),
                    inline: true
                },
                {
                    name: "Progress to next level",
                    value:
                        `\`${ProgressBar(LevelPercentage)}\` ${(LevelPercentage * 100).toFixed(2)}%\n` +
                        `${Result.Player.detailed_xp[0].toLocaleString()} / ${Result.Player.detailed_xp[1].toLocaleString()} EXP\n`
                },
                {
                    name: `Progress to #1 (${Result.Top1EXP.username})`,
                    value:
                        `\`${ProgressBar(ToTop1Percentage)}\` ${(ToTop1Percentage * 100).toFixed(2)}%\n` +
                        `${Result.Player.xp.toLocaleString()} / ${Result.Top1EXP.xp.toLocaleString()} EXP\n` 
                },
                {
                    name: "Statistic",
                    value: `\`\`\`\n${GetStatistcString(Result)}\n\`\`\``
                }
            )
            .setFooter({
                text: `Total messages: ${Result.Player.message_count}, Time spent: ${FormatDuration(Result.Player.message_count * 600000)}`
            })
        ;
        
        await Interaction.deferReply({
            flags: Interaction.options.getBoolean("ephemeral", false) ? MessageFlags.Ephemeral : undefined
        })

        await Interaction.editReply({ 
            embeds: [Embed],
            allowedMentions: { repliedUser: false }
        });
    }
} satisfies Command;