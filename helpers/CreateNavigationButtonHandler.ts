import { ButtonInteraction, Client } from "discord.js";
import { ButtonType } from "./ConstructNavigationButtonRow.js";

export default (
    Handler: (Interaction: ButtonInteraction, Type: ButtonType, Client: Client) => Promise<void>
): Record<ButtonType, (Interaction: ButtonInteraction, Client: Client) => Promise<void>> => ({
    [ButtonType.BackwardToStart]: async (Interaction: ButtonInteraction, Client: Client) => 
        await Handler(Interaction, ButtonType.BackwardToStart, Client)
    ,
    [ButtonType.Backward]: async (Interaction: ButtonInteraction, Client: Client) => 
        await Handler(Interaction, ButtonType.Backward, Client)
    ,
    [ButtonType.Forward]: async (Interaction: ButtonInteraction, Client: Client) => 
        await Handler(Interaction, ButtonType.Forward, Client)
    ,
    [ButtonType.ForwardToEnd]: async (Interaction: ButtonInteraction, Client: Client) => 
        await Handler(Interaction, ButtonType.ForwardToEnd, Client)
});