import type { InteractionHandler, InteractionMap } from "#types/InteractionHandler";
import type Command from "#types/Command";
import InteractionTypes from "#types/InteractionTypes";

export default <T extends InteractionTypes>(Type: T, Name: string) => (
    Method: InteractionHandler<InteractionMap[T]>,
    Context: ClassMethodDecoratorContext<
        Command,
        InteractionHandler<InteractionMap[T]>
    >
): void => Context.addInitializer(function(): void {
    this.InteractionHandlers[Type].set(
        Name,
        Method.bind(this)
    );
});