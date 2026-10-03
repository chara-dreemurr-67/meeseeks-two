import type {
    CacheType,
    ChatInputCommandInteraction,
    Client,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction,
    RoleSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    ChannelSelectMenuInteraction,
    ButtonInteraction,
    AutocompleteInteraction
} from "discord.js";
import type InteractionTypes from "#types/InteractionTypes";

export type Interaction<Cached extends CacheType = CacheType> =
    | ChatInputCommandInteraction<Cached>
    | StringSelectMenuInteraction<Cached>
    | UserSelectMenuInteraction<Cached>
    | RoleSelectMenuInteraction<Cached>
    | MentionableSelectMenuInteraction<Cached>
    | ChannelSelectMenuInteraction<Cached>
    | ButtonInteraction<Cached>
    | AutocompleteInteraction<Cached>
;
export type InteractionHandlers<T extends Interaction> = Map<string, InteractionHandler<T>>;
export type InteractionHandler<T extends Interaction> = (Interaction: T, Client: Client) => Promise<unknown>;
export type InteractionMap = {
    [InteractionTypes.Autocomplete]: AutocompleteInteraction;
    [InteractionTypes.Button]: ButtonInteraction;
    [InteractionTypes.StringMenu]: StringSelectMenuInteraction;
    [InteractionTypes.UserMenu]: UserSelectMenuInteraction;
    [InteractionTypes.RoleMenu]: RoleSelectMenuInteraction;
    [InteractionTypes.ChannelMenu]: ChannelSelectMenuInteraction;
    [InteractionTypes.MentionableMenu]: MentionableSelectMenuInteraction;
};
export type InteractionHandlersRegistry = { [K in InteractionTypes]: InteractionHandlers<InteractionMap[K]> };