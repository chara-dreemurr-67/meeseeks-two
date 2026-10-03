export default async <T, R>(Arr: T[], CallbackFn: (Value: T, Index: number, Arr: T[]) => Promise<R>): Promise<R[]> => 
    await Promise.all(Arr.map(CallbackFn))
;