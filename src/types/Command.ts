import {
    type ChatInputCommandInteraction,
    type SlashCommandBuilder,
    type SlashCommandOptionsOnlyBuilder,
    Client
} from "discord.js";
import InteractionTypes from "./InteractionTypes.js";
import type { InteractionHandler, InteractionHandlersRegistry, InteractionMap } from "#types/InteractionHandler";

export default abstract class Command {
    public readonly InteractionHandlers: InteractionHandlersRegistry = {
        [InteractionTypes.Autocomplete]: new Map(),
        [InteractionTypes.Button]: new Map(),
        [InteractionTypes.StringMenu]: new Map(),
        [InteractionTypes.UserMenu]: new Map(),
        [InteractionTypes.RoleMenu]: new Map(),
        [InteractionTypes.ChannelMenu]: new Map(),
        [InteractionTypes.MentionableMenu]: new Map()
    }

    public abstract readonly Command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    
    public readonly Administrator: boolean = false;
    public readonly Cancelable: boolean = false;

    public readonly Pool?: Map<string, AbortController>;
    public readonly CancelMessage?: string;
    
    public abstract Action(
        Interaction: ChatInputCommandInteraction,
        { Signal, Client }: { Signal?: AbortSignal; Client?: Client }
    ): Promise<any>; // Caller doesn't use return type.
    
    public GetInteractionHandler<T extends InteractionTypes>(
        InteractionType: T,
        Name: string
    ): InteractionHandler<InteractionMap[T]> | undefined {
        return this.InteractionHandlers[InteractionType].get(Name);
    }
};