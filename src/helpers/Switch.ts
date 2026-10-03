type ValueOrFunction<T> = T | (() => T);

/**
 * An attempt of adding a so-called switch expression.
 * 
 * @throws If switch-ing isn't exhaustive (e.g. {@link Resolver} doesn't cover all possible value of {@link Value} and a {@link Default} function or value wasn't provided).
 */
const Switch = <T extends PropertyKey, R>(
    Value: T,
    Resolver: Record<T, ValueOrFunction<R>>,
    Default?: ValueOrFunction<R>
): R => {
    if(Value in Resolver) {
        return typeof Resolver[Value] === "function" 
            ? Resolver[Value]()
            : Resolver[Value] as R
        ;
    }

    if(Default != undefined) {
        return typeof Default === "function" 
            ? (Default as () => R)() 
            : Default
        ;
    }

    const Err: Error = new Error("Fallthrough statement.");
    Err.name = "FallthroughError";
    throw Err;
};

export default Switch;