import crypto from "crypto";

/**
 * Generate a unique uuid using {@link Prerequisite} to checks if that uuid already exists.
 * 
 * The chance of the generated UUID not being unique is slim to none but I just wanted to be sure.
 */
const GenerateUUID = (Prerequisite: (Token: string) => boolean): string => {
    let Token: string;
    
    do Token = crypto.randomUUID();
    while(Prerequisite(Token));
    
    return Token;
};

export default GenerateUUID;