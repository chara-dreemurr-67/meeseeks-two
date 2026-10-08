import Env from "commaenv";

/**
 * Check if the provided UserID is authorized to use the command.
 */
export default (UserID: string): boolean => Env.GetVariable<string[]>("ADMINISTRATOR_IDS").includes(UserID);