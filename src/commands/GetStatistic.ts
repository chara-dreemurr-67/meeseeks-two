import type { RoleRewards, Players, MeeseeksLeaderboard } from "#types/MeeseeksLeaderboard";
import type { SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction, User } from "discord.js";
import {
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import Command, { type Cancelable } from "#types/Command";
import FetchMeeseeksAPI from "#helpers/FetchMeeseeksAPI";
import timers from "timers/promises";

interface LookForResult {
    ServerName: string;
    RoleRewards: RoleRewards[];
    EXPPerMessage: [number, number];
    Top1EXP: Players;
    Player: Players;
    Rank: number;
}

export default class GetStatistic extends Command {
    public readonly Command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
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
    ;

    public readonly Cancelable: Cancelable = {
        Pool: new Map(),
        CancelMessage: "Your previous request is still running. Please wait until it finishes."
    };
    public readonly Cooldowns: Map<string, number> = new Map();

    public async LookForPlayer(
        Interaction: ChatInputCommandInteraction,
        User: User,
        ServerID: string,
        Signal: AbortSignal
    ): Promise<LookForResult | undefined> {
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
                    await Interaction.editReply({
                        content: `Server ${ServerID} doesn't exist or doesn't use MEE6 leveling.`,
                        allowedMentions: { repliedUser: false }
                    });
                    return;
                }
                if(!Res.ok) {
                    await Interaction.editReply({
                        content: "API Error.",
                        allowedMentions: { repliedUser: false }
                    });
                    return;
                }
        
                const Leaderboard: MeeseeksLeaderboard = await Res.json() as MeeseeksLeaderboard;
                if(i === 0) {
                    Top1EXP = Leaderboard.players[0];
                    RoleRewards = Leaderboard.role_rewards;
                    EXPPerMessage = Leaderboard.xp_per_message;
                    ServerName = Leaderboard.guild.name;
                }
                
                const PlayerIndex: number = Leaderboard.players.findIndex(Player => Player.username === User.username || Player.id === User.id);
                if(PlayerIndex !== -1) {
                    Player = Leaderboard.players[PlayerIndex];
                    Rank = PlayerIndex + i * 1000 + 1;
                    break;
                }
        
                if(Leaderboard.players.length < 1000) {
                    await Interaction.editReply({
                        content: `User ${User.id}(${User.username}) isn't in ${ServerID} or isn't in the top 1000000 of the server.`,
                        allowedMentions: { repliedUser: false }
                    });
                    return;
                }
        
                await timers.setTimeout(500, undefined, { signal: Signal });
            }
        }
        catch(Err) {
            if(Err instanceof Error && Err.name === "AbortError") {
                await Interaction.editReply({
                    content: "Command ended due to user canceling.",
                    allowedMentions: { repliedUser: false }
                });
                return;
            }

            throw Err;
        }
        return {
            ServerName,
            RoleRewards,
            EXPPerMessage,
            Top1EXP,
            Player,
            Rank
        };
    }

    public ProgressBar(Percent: number, Length: number = 20): string {
        Percent = Math.max(0, Math.min(1, Percent));
        const Filled: number = Math.round(Percent * Length);
        return "█".repeat(Filled) + "░".repeat(Length - Filled);
    }

    public GetTotalExp(Level: number): number {
        return (5 * (91 * Level + 27 * Level ** 2 + 2 * Level ** 3)) / 6;
    }

    public FormatDuration(MS: number, IncludeSlashes: boolean = false): string {
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
    }

    public Average(...Numbers: number[]): number {
        return Numbers.reduce((Total: number, Num: number) => Total + Num, 0) / Numbers.length;
    }

    public GetStatistcString(Statistic: LookForResult): string {
        const CurrentEXP: number = Statistic.Player.detailed_xp[0];
        const NextLevel: number = Statistic.Player.detailed_xp[1];
        const ToNextLevel: number = NextLevel - CurrentEXP;
        const MessagesLeft: number = Math.ceil(ToNextLevel / this.Average(...Statistic.EXPPerMessage));
        
        return (
            `${Statistic.Player.username}, ` +
            `RANK #${Statistic.Rank} LEVEL ${Statistic.Player.level}, ` +
            `${CurrentEXP}/${NextLevel} EXP ` +
            `${((CurrentEXP / NextLevel) * 100).toFixed(2)}%, ` +
            `Total EXP: ${Statistic.Player.xp}, Total msg: ${Statistic.Player.message_count}, ` +
            `Time spent: ${this.FormatDuration(Statistic.Player.message_count * 60000, true)}, ` +
            `${ToNextLevel} EXP of ` +
            `${MessagesLeft} message${MessagesLeft > 1 ? "s" : ""} left till LEVEL ${Statistic.Player.level + 1}, ` +
            `${((Statistic.Player.xp / Statistic.Top1EXP.xp) * 100).toFixed(2)}% of ${Statistic.Top1EXP.username}`
        );
    }

    public async Action(Interaction: ChatInputCommandInteraction, { Signal }: { Signal: AbortSignal; }): Promise<any> {
        const Start: number = Date.now();

        const Who: User = Interaction.options.getUser("who", false) ?? Interaction.user;
        const Where: string | null = Interaction.options.getString("where", false) ?? Interaction.guildId;
        const IsEphemeral: boolean = Interaction.options.getBoolean("ephemeral", false) ?? true;
        const UserID: string = Interaction.user.id;

        const CDEnds: number | undefined = this.Cooldowns.get(UserID);
        const Now: number = Date.now();
        if(CDEnds && CDEnds > Now) {
            const Remaining: string = ((CDEnds - Now) / 1000).toFixed(1);
            return await Interaction.reply({
                content: `Please wait ${Remaining}s before using this command again.`,
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
        }

        if(!Where) {
            return await Interaction.reply({
                content: "No server specified.",
                allowedMentions: { repliedUser: false },
                flags: MessageFlags.Ephemeral
            });
        }
        
        await Interaction.deferReply({
            flags: IsEphemeral ? MessageFlags.Ephemeral : undefined
        });
        
        const Result: LookForResult | undefined = await this.LookForPlayer(Interaction, Who, Where, Signal);
        this.Cooldowns.set(UserID, Date.now() + 7500);
        setTimeout(() => this.Cooldowns.delete(UserID), 7500);

        if(!Result)
            return;

        const Player: Players = Result.Player;
        const Top1: Players = Result.Top1EXP;
        const RoleRewards: RoleRewards[] = Result.RoleRewards;
        const CurrentEXP: number = Result.Player.detailed_xp[0];
        const NextLevel: number = Result.Player.detailed_xp[1];
        const ToNextLevel: number = NextLevel - CurrentEXP;
        const TotalEXP: number = Player.xp;
        const TotalToNextLevel: number = this.GetTotalExp(Player.level + 1);

        const Index: number = RoleRewards.findIndex(Reward => Reward.rank > Player.level);
        const Color: number = RoleRewards.length && Player.level > RoleRewards[0].rank
            ? RoleRewards[Index !== -1 ? Index -1 : RoleRewards.length - 1].role.color
            : 0xffffff
        ;
        const LevelPercentage: number = CurrentEXP / NextLevel;
        const OverallPercentage: number = TotalEXP / TotalToNextLevel;
        const ToTop1Percentage: number = TotalEXP / Top1.xp;
        const MessagesLeft: number = Math.ceil(ToNextLevel / this.Average(...Result.EXPPerMessage));

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
                `Time spent: ${this.FormatDuration(Player.message_count * 60000)}`
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
                        `\`${this.ProgressBar(LevelPercentage)}\` ${(LevelPercentage * 100).toFixed(2)}%\n` +
                        `${CurrentEXP.toLocaleString()} / ${NextLevel.toLocaleString()} EXP ` +
                        `(${MessagesLeft} message${MessagesLeft > 1 ? "s" : ""})`
                },
                {
                    name: `Overall progress to level ${Player.level + 1}`,
                    value:
                        `\`${this.ProgressBar(OverallPercentage)}\` ${(OverallPercentage * 100).toFixed(2)}%\n` +
                        `${TotalEXP.toLocaleString()} / ${TotalToNextLevel.toLocaleString()} EXP `
                },
                {
                    name: `Progress to #1 (${Top1.username})`,
                    value:
                        `\`${this.ProgressBar(ToTop1Percentage)}\` ${(ToTop1Percentage * 100).toFixed(2)}%\n` +
                        `${TotalEXP.toLocaleString()} / ${Top1.xp.toLocaleString()} EXP` 
                },
                {
                    name: "Statistic",
                    value: "```\n" + this.GetStatistcString(Result) + "\n```"
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
    }
}