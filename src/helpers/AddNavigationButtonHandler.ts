import ButtonType from "#types/ButtonType";
import type { InteractionHandler } from "#types/InteractionHandler";
import type {
    ButtonInteraction,
    Client
} from "discord.js";

export default (
    Handler: (Interaction: ButtonInteraction, Type: ButtonType, Client: Client) => Promise<unknown>,
    Discriminator: string = ""
): Map<string, InteractionHandler<ButtonInteraction>> => new Map(
    Object.entries(ButtonType).map(([, ButtonType]) => [
        `${Discriminator}${ButtonType}`,
        async (Interaction: ButtonInteraction, Client: Client) => await Handler(Interaction, ButtonType, Client)
    ])
);