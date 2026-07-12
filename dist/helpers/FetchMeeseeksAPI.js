const FetchMeeseeksAPI = async (ServerID, Page) => {
    const URL = `https://mee6.xyz/api/plugins/levels/leaderboard/${ServerID}?limit=1000&page=${Page}`;
    return await fetch(URL);
};
export default FetchMeeseeksAPI;
//# sourceMappingURL=FetchMeeseeksAPI.js.map