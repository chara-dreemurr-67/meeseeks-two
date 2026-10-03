import type { Client } from "discord.js";
import type Command from "#types/Command";
import { ButtonInteraction } from "discord.js";
import ButtonType from "#types/ButtonType";

type NavigationButtonHandler = (Interaction: ButtonInteraction, Type: ButtonType, Client: Client) => Promise<unknown>;

export default (Discriminator: string = "") => (
    Method: NavigationButtonHandler,
    Context: ClassMethodDecoratorContext<
        Command,
        NavigationButtonHandler
    >
): void => Context.addInitializer(function(): void {
    Object.values(ButtonType).forEach(ButtonType => {
        this.InteractionHandlers.Button.set(
            `${Discriminator}${ButtonType}`,
            (Interaction: ButtonInteraction, Client: Client): Promise<unknown> =>
                Method.call(this, Interaction, ButtonType, Client)
        );
    });
});