const FetchMeeseeksAPI = async (ServerID: string, Page: number, Signal: AbortSignal): Promise<Response> => {
    const URL: string = `https://mee6.xyz/api/plugins/levels/leaderboard/${ServerID}?limit=1000&page=${Page}`;
    return await fetch(URL, { signal: Signal });
};

export default FetchMeeseeksAPI;