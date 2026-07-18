import dotenv from "dotenv";

dotenv.config();

export default {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN ?? "",
    CLIENT_ID: process.env.CLIENT_ID ?? "",
    ADMINISTRATOR_ID: process.env.ADMINISTRATOR_ID ?? ""
};