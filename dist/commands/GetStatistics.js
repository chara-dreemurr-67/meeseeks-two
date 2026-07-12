"use strict";
import { ChatInputCommandInteraction, SlashCommandBuilder, User, EmbedBuilder, MessageFlags } from "discord.js";
import FetchMeeseeksAPI from "../helpers/FetchMeeseeksAPI.js";
import timers from "timers/promises";
var FailedReasons;
(function (FailedReasons) {
    FailedReasons[FailedReasons["PlayerNotFound"] = 0] = "PlayerNotFound";
    FailedReasons[FailedReasons["GuildNotFound"] = 1] = "GuildNotFound";
})(FailedReasons || (FailedReasons = {}));
const LookForPlayer = async (User, ServerID) => {
    const Output = {
        Status: false
    };
    for (let i = 0; i < 1000; i++) {
        const Res = await FetchMeeseeksAPI(ServerID, i);
        if (!Res.ok) {
            Output.Reason = FailedReasons.GuildNotFound;
            break;
        }
        const Leaderboard = await Res.json();
        if (i === 0) {
            Output.Top1EXP = Leaderboard.players[0];
            Output.RoleRewards = Leaderboard.role_rewards;
            Output.EXPPerMessage = Leaderboard.xp_per_message;
        }
        const PlayerIndex = Leaderboard.players.findIndex(Player => Player.username === User || Player.id === User);
        if (PlayerIndex !== -1) {
            Output.Status = true;
            Output.Player = Leaderboard.players[PlayerIndex];
            Output.Rank = PlayerIndex + i * 1000 + 1;
            Output.ServerName = Leaderboard.guild.name;
            break;
        }
        if (i === 999) {
            Output.Reason = FailedReasons.PlayerNotFound;
            break;
        }
        await timers.setTimeout(500);
    }
    return Output;
};
const ProgressBar = (Percent, Length = 20) => {
    Percent = Math.max(0, Math.min(1, Percent));
    const Filled = Math.round(Percent * Length);
    return "█".repeat(Filled) + "░".repeat(Length - Filled);
};
// const GetTotalExp = (Level: number) => (5 * (91 + Level + 27 * Level ** 2 + 2 * Level ** 3)) / 6;
const FormatDuration = (MS, IncludeSlashes = false) => {
    const TotalSeconds = Math.floor(MS / 1000);
    const Days = Math.floor(TotalSeconds / 86400);
    const Hours = Math.floor((TotalSeconds % 86400) / 3600);
    const Minutes = Math.floor((TotalSeconds % 3600) / 60);
    const Seconds = TotalSeconds % 60;
    return (`${String(Days).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
        `${String(Hours).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
        `${String(Minutes).padStart(2, '0')}${IncludeSlashes ? "\\" : ""}:` +
        `${String(Seconds).padStart(2, '0')}`);
};
const Average = (...Numbers) => Numbers.reduce((Total, Num) => Total + Num, 0) / Numbers.length;
const GetStatistcString = (Statistic) => {
    /**
     * This will also never run.
     */
    if (!Statistic.Player || !Statistic.Rank || !Statistic.Top1EXP || !Statistic.EXPPerMessage)
        return "";
    const CurrentEXP = Statistic.Player.detailed_xp[0];
    const NextLevel = Statistic.Player.detailed_xp[1];
    const ToNextLevel = NextLevel - CurrentEXP;
    const MessagesLeft = Math.ceil(ToNextLevel / Average(...Statistic.EXPPerMessage));
    return (`${Statistic.Player.username}, ` +
        `RANK #${Statistic.Rank} LEVEL ${Statistic.Player.level}, ` +
        `${CurrentEXP}/${NextLevel} EXP ` +
        `${((CurrentEXP / NextLevel) * 100).toFixed(2)}%, ` +
        `Total EXP: ${Statistic.Player.xp}, Total msg: ${Statistic.Player.message_count}, ` +
        `Time spent: ${FormatDuration(Statistic.Player.message_count * 60000, true)}, ` +
        `${ToNextLevel} EXP of ` +
        `${MessagesLeft} message${MessagesLeft > 1 ? "s" : ""} left till LEVEL ${Statistic.Player.level + 1}, ` +
        `${((Statistic.Player.xp / Statistic.Top1EXP.xp) * 100).toFixed(2)}% of ${Statistic.Top1EXP.username}`);
};
const Cooldowns = {};
export default {
    Command: new SlashCommandBuilder()
        .setName("getstatistics")
        .setDescription("Get your or someone else's progress to a specific level.")
        .addUserOption(Option => Option
        .setName("who")
        .setDescription("User to get progress of. Default is yourself.")
        .setRequired(false))
        .addStringOption(Option => Option
        .setName("where")
        .setDescription("Server to get progress on. Default is whatever server you're using the command in.")
        .setRequired(false))
        .addBooleanOption(Option => Option
        .setName("ephemeral")
        .setDescription("Whether to turn the message into a \"Only you can see this\" message. Default is true.")
        .setRequired(false)),
    Action: async (Interaction) => {
        const Who = Interaction.options.getUser("who", false) ?? Interaction.user;
        const Where = Interaction.options.getString("where", false) ?? Interaction.guildId;
        const IsEphemeral = Interaction.options.getBoolean("ephemeral", false) ?? true;
        await Interaction.deferReply({
            flags: IsEphemeral ? MessageFlags.Ephemeral : undefined
        });
        const CDEnds = Cooldowns[Interaction.user.id];
        const Now = Date.now();
        if (CDEnds && CDEnds > Now) {
            const Remaining = ((CDEnds - Now) / 1000).toFixed(1);
            await Interaction.editReply({
                content: `Please wait ${Remaining}s before using this command again.`,
            });
            return;
        }
        if (!Where) {
            await Interaction.editReply({ content: "No server specified!", allowedMentions: { repliedUser: false } });
            return;
        }
        Cooldowns[Interaction.user.id] = Date.now() + 7500;
        setTimeout(() => delete Cooldowns[Interaction.user.id], 7500);
        const Result = await LookForPlayer(Who.id, Where);
        if (!Result.Status) {
            let ErrorMessage;
            switch (Result.Reason) {
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
            await Interaction.editReply({ content: ErrorMessage, allowedMentions: { repliedUser: false } });
            return;
        }
        /**
         * Technically this if statement will never run but typescript won't stop harassing if it's not here so it has to be here.
         */
        if (!Result.Player || !Result.Rank || !Result.RoleRewards || !Result.Top1EXP || !Result.ServerName) {
            await Interaction.editReply({ content: "How does this even happened.", allowedMentions: { repliedUser: false } });
            return;
        }
        const Player = Result.Player;
        const Top1 = Result.Top1EXP;
        const RoleRewards = Result.RoleRewards;
        const Index = RoleRewards.findIndex(Reward => Reward.rank > Player.level) - 1;
        const Color = Player.level < (RoleRewards.at(0)?.rank ?? -1) || !RoleRewards.length
            ? 0xffffff
            : RoleRewards[Index !== -2 ? Index : RoleRewards.length - 1].role.color;
        const LevelPercentage = Player.detailed_xp[0] / Player.detailed_xp[1];
        const ToTop1Percentage = Player.xp / Top1.xp;
        const Embed = new EmbedBuilder()
            .setColor(Color)
            .setAuthor({
            name: Player.username,
            url: `https://discord.com/users/${Player.id}`,
            iconURL: Who.displayAvatarURL({ size: 256 })
        })
            .setThumbnail(Who.displayAvatarURL({ size: 512 }))
            .setTitle(Result.ServerName)
            .setDescription(`Total messages: ${Player.message_count}, ` +
            `Time spent: ${FormatDuration(Player.message_count * 600000)}`)
            .addFields({
            name: "Level",
            value: Player.level.toLocaleString(),
            inline: true
        }, {
            name: "Rank",
            value: `#${Result.Rank}`,
            inline: true
        }, {
            name: "Total EXP",
            value: Player.xp.toLocaleString(),
            inline: true
        }, {
            name: `Progress to level ${Player.level + 1}`,
            value: `\`${ProgressBar(LevelPercentage)}\` ${(LevelPercentage * 100).toFixed(2)}%\n` +
                `${Player.detailed_xp[0].toLocaleString()} / ${Player.detailed_xp[1].toLocaleString()} EXP\n`
        }, {
            name: `Progress to #1 (${Top1.username})`,
            value: `\`${ProgressBar(ToTop1Percentage)}\` ${(ToTop1Percentage * 100).toFixed(2)}%\n` +
                `${Player.xp.toLocaleString()} / ${Top1.xp.toLocaleString()} EXP\n`
        }, {
            name: "Statistic",
            value: "```\n" + GetStatistcString(Result) + "\n```"
        });
        await Interaction.editReply({
            embeds: [Embed],
            allowedMentions: { repliedUser: false }
        });
    }
};
//# sourceMappingURL=GetStatistics.js.map