import Env from "#Env";
import GenerateUUID from "#helpers/GenerateUUID";
import EventEmitter from "events";

export interface Embed {
    CommandName: string;
    ActionName: string;
    Timeout: NodeJS.Timeout;
    MetaID?: string;
    CoOwners?: string[];
}

type EmbedRegistry = Record<string, {
    [InteractionUUID: string]: Embed;
}>;

type MetaRegistry = Record<string, {
    Meta: any;
    Timeout: NodeJS.Timeout;
}>;

export default new class EmbedManager extends EventEmitter {
    public readonly EmbedRegistry: EmbedRegistry = {};
    public readonly MetaRegistry: MetaRegistry = {};

    public GetMeta<T>(OwnerID: string, EmbedID: string): T | undefined {
        const MetaID: string | undefined = this.EmbedRegistry[OwnerID]?.[EmbedID]?.MetaID;
        if(!MetaID)
            return;
        return this.MetaRegistry[MetaID].Meta;
    }

    public AddEmbed(
        OwnerID: string,
        CommandName: string,
        ActionName: string,
        MetaID?: string,
        CoOwners?: string[]
    ): string {
        this.EmbedRegistry[OwnerID] ??= {};
        const EmbedID: string = GenerateUUID(UUID => !!this.EmbedRegistry[OwnerID][UUID]);

        this.EmbedRegistry[OwnerID][EmbedID] = {
            CommandName,
            ActionName,
            Timeout: setTimeout((): void => {
                this.emit("LifeTimeEnded", EmbedID);
                delete this.EmbedRegistry[OwnerID][EmbedID];
            }, Env.GetVariable<number>("EMBED_EXPIRY_DURATION") * 1000),
            CoOwners
        }

        if(MetaID) {
            if(!this.MetaRegistry[MetaID])
                throw new TypeError(`Metadata ID "${MetaID}" does not exists.`);
            this.EmbedRegistry[OwnerID][EmbedID].MetaID = MetaID;
        }

        return EmbedID;
    }

    public RemoveEmbed(OwnerID: string, EmbedID: string): void {
        if(!this.EmbedRegistry[OwnerID]?.[EmbedID])
            return;

        clearTimeout(this.EmbedRegistry[OwnerID][EmbedID].Timeout);
        delete this.EmbedRegistry[OwnerID][EmbedID];
    }

    public RefreshInteraction(OwnerID: string, EmbedID: string): void {
        if(!this.EmbedRegistry[OwnerID]?.[EmbedID])
            return;
        clearTimeout(this.EmbedRegistry[OwnerID][EmbedID].Timeout);
        this.EmbedRegistry[OwnerID][EmbedID].Timeout = setTimeout((): void => {
            this.emit("LifeTimeEnded", EmbedID);
            delete this.EmbedRegistry[OwnerID][EmbedID];
        }, Env.GetVariable<number>("EMBED_EXPIRY_DURATION") * 1000);
    }

    public AddMeta(Meta: any): string {
        const MetaID: string = GenerateUUID(UUID => !!this.MetaRegistry[UUID]);
        this.MetaRegistry[MetaID] = {
            Meta,
            Timeout: setTimeout(
                () => delete this.MetaRegistry[MetaID], 
                (Env.GetVariable<number>("EMBED_EXPIRY_DURATION") + 300) * 1000
            )
        };
        return MetaID;
    }

    public RemoveMeta(MetaID: string): void {
        if(!this.MetaRegistry[MetaID])
            return;

        clearTimeout(this.MetaRegistry[MetaID].Timeout);
        delete this.MetaRegistry[MetaID];
    }

    public RefreshMeta(MetaID: string): void {
        if(!this.MetaRegistry[MetaID])
            return;

        clearTimeout(this.MetaRegistry[MetaID].Timeout);
        this.MetaRegistry[MetaID].Timeout = setTimeout(
            () => delete this.MetaRegistry[MetaID],
            (Env.GetVariable<number>("EMBED_EXPIRY_DURATION") + 300) * 1000
        );
    }
}();