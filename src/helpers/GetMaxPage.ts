export default (Collection: ArrayLike<any>, PageSize: number) => Math.ceil(Collection.length / PageSize);
