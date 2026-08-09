import { EventEmitter } from "stream";
import GenerateUniqueUUID from "../helpers/GenerateUniqueUUID.js";
import LoadEnv from "./LoadEnv.js";

export interface Action {
    CommandName: string;
    ActionName: string;
    Meta: any;
    Timeout: NodeJS.Timeout;
};

interface Registry {
    [UserID: string]: {
        // assert type before usage
        [InteractionUUID: string]: Action;
    };
}
export default new class extends EventEmitter {
    public readonly Registry: Registry = {};

    public GetInteraction<T>(Owner: string, InteractionID: string): T | undefined {
        return this.Registry[Owner][InteractionID]?.Meta;
    }

    public AddInteraction(Owner: string, CommandName: string, ActionName: string, Meta: any): string {
        this.Registry[Owner] ??= {};

        const InteractionID: string = GenerateUniqueUUID(UUID => !!this.Registry[Owner][UUID]);
        this.Registry[Owner][InteractionID] = {
            CommandName,
            ActionName,
            Meta,
            Timeout: setTimeout((): void => {
                this.emit("LifeTimeEnded", InteractionID);
                delete this.Registry[Owner][InteractionID];

                if(Object.keys(this.Registry[Owner]).length === 0) {
                    delete this.Registry[Owner];
                }
            }, LoadEnv.EMBED_EXPIRY_DURATION * 1000)
        };

        return InteractionID;
    }

    public RemoveInteraction(Owner: string, InteractionID: string): void {
        if(!this.Registry[Owner])
            return;

        if(!this.Registry[Owner][InteractionID])
            return;

        clearTimeout(this.Registry[Owner][InteractionID]?.Timeout);
        delete this.Registry[Owner][InteractionID];
        if(Object.keys(this.Registry[Owner]).length === 0) {
            delete this.Registry[Owner];
        }
    }

    public RefreshInteraction(Owner: string, InteractionID: string): void {
        if(!this.Registry[Owner])
            return;

        if(!this.Registry[Owner][InteractionID])
            return;

        clearTimeout(this.Registry[Owner][InteractionID].Timeout);
        this.Registry[Owner][InteractionID].Timeout = setTimeout((): void => {
            this.emit("LifeTimeEnded", InteractionID);
            delete this.Registry[Owner][InteractionID];

            if(Object.keys(this.Registry[Owner]).length === 0) {
                delete this.Registry[Owner];
            }
        }, LoadEnv.EMBED_EXPIRY_DURATION * 1000);
    }
}();