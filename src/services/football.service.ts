import { RedisKey } from "ioredis";
import redis from "../configs/redis.config";
import { FootballAPIResponse, RedisResponse } from "../types/type";

const API_URL = process.env.FOOTBALL_API_URL || 'https://v3.football.api-sports.io'


export const fetchFootballAPI = async (url: string) => {
    try {
        const key = process.env.FOOTBALL_API_KEY;
        if (!key) {
            throw new Error("API KEY not configured!");
        }

        const headers = {
            "x-rapidapi-key": key,
            "x-rapidapi-host": "v3.football.api-sports.io",
        };

        const response = await fetch(url, { method: "GET", headers });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.message || "Something went wrong!");
        }

        if (data.errors && data.errors.length != 0) {
            return { "error": data.errors }
        }
        return { "data": data.response }
    }
    catch (e) {
        return { "error": e }
    }
};


// Helper functions

export const getValueFromCache = async (key: RedisKey, maxAge: number | null) => {
    let cache = await redis.get(key)
    if (cache) {
        try {
            const cacheObj: RedisResponse = JSON.parse(cache)
            if (cacheObj && cacheObj.createdAt) {
                if (maxAge === null) {
                    return cacheObj
                }
                const timeDiff = Date.now() - cacheObj.createdAt;
                if (maxAge != null && timeDiff < maxAge * 1000) {
                    return cacheObj
                }
            }
        }
        catch {
            return null
        }
    }
    return null
}


// Functions to fetch data from API
export const getLiveMatches = async (
    realTime: boolean,
    TTL: number,
    maxAge: number | null
): Promise<FootballAPIResponse> => {
    if (!realTime) {
        const cache = await getValueFromCache("fixtures-live-all", maxAge);
        if (cache) {
            console.log("Cached - Live")
            return { data: cache.data };
        }
    }

    const url = `${API_URL}/fixtures?live=all`;
    const liveData = await fetchFootballAPI(url);

    if (liveData.data) {
        await redis.set(
            "fixtures-live-all",
            JSON.stringify({
                data: liveData.data,
                createdAt: Date.now()
            }),
            "EX",
            TTL
        );
    }
    console.log("RealTime - Live")
    return liveData;
};


export const getMatchesByDate = async (
    date: Date,
    realTime: boolean,
    TTL: number,
    maxAge: number | null
): Promise<FootballAPIResponse> => {
    const dateString = date.toISOString().split("T")[0];

    if (!realTime) {
        const cache = await getValueFromCache(`fixture-${dateString}`, maxAge);
        if (cache) {
            console.log("Cached - Fixtures ", dateString)
            return { data: cache.data };
        }
    }

    const url = `${API_URL}/fixtures?date=${dateString}`;
    const liveData = await fetchFootballAPI(url);
    console.log("Live - Fixtures ", dateString)

    if (liveData.data) {
        await redis.set(
            `fixture-${dateString}`,
            JSON.stringify({
                data: liveData.data,
                createdAt: Date.now()
            }),
            "EX",
            TTL
        );
    }

    return liveData;
}

export const getLeagueStandings = async (
    league: string,
    season: string,
    realTime: boolean,
    TTL: number,
    maxAge: number | null
): Promise<FootballAPIResponse> => {
    let test = false
    if (!realTime) {
        const cache = await getValueFromCache(`standing-${league}-${season}`, maxAge);
        if (cache) {
            console.log("Cached - Standings", season, league)
            return { data: cache.data };
        }
    }

    const url = `${API_URL}/standings?league=${league}&season=${season}`;
    const liveData = await fetchFootballAPI(url);

    if (liveData.data) {
        await redis.set(
            `standing-${league}-${season}`,
            JSON.stringify({
                data: liveData.data,
                createdAt: Date.now()
            }),
            "EX",
            TTL
        );
    }
    console.log("Live - Standings -", test, season, league)
    return liveData;
};

export const getHeadToHead = async (
    team1: string,
    team2: string,
    realTime: boolean,
    TTL: number,
    maxAge: number | null
): Promise<FootballAPIResponse> => {
    const key1 = `h2h-${team1}-${team2}`;
    const key2 = `h2h-${team2}-${team1}`;


    if (!realTime) {
        const cache1 = await getValueFromCache(key1, maxAge);
        if (cache1) {
            console.log("Cached - H2H", team1, team2)
            return { data: cache1.data };
        }
        const cache2 = await getValueFromCache(key2, maxAge);
        if (cache2) {
            console.log("Cached - H2H", team1, team2)
            return { data: cache2.data };
        }
    }

    const url = `${API_URL}/fixtures/headtohead?h2h=${team1}-${team2}`;
    const liveData = await fetchFootballAPI(url);

    if (liveData.data) {
        await redis.set(
            `h2h-${team2}-${team1}`,
            JSON.stringify({
                data: liveData.data,
                createdAt: Date.now()
            }),
            "EX",
            TTL
        );
    }
    console.log("Live - H2H", team1, team2)
    return liveData;
};



export const getTeamFixtures = async (
    team: string,
    realTime: boolean,
    TTL: number,
    maxAge: number | null
): Promise<FootballAPIResponse> => {
    if (!realTime) {
        const cache = await getValueFromCache(`streak-${team}`, maxAge);
        if (cache) {
            console.log("Cached - Streak", team)
            return { data: cache.data };

        }
    }

    const url = `${API_URL}/fixtures?team=${team}&last=5&status=ft`;
    const liveData = await fetchFootballAPI(url);

    if (liveData.data) {
        await redis.set(
            `streak-${team}`,
            JSON.stringify({
                data: liveData.data,
                createdAt: Date.now()
            }),
            "EX",
            TTL
        );
    }
    console.log("Live - Streak", team)

    return liveData;
}


export const getFixtureEvent = async (
    fixture: string,
    realTime: boolean,
    TTL: number,
    maxAge: number | null
): Promise<FootballAPIResponse> => {
    if (!realTime) {
        const cache = await getValueFromCache(`event-${fixture}`, maxAge);
        if (cache) {
            console.log("Cached - Events", fixture)
            return { data: cache.data };
        }
    }

    const url = `${API_URL}/fixtures/events?fixture=${fixture}`;
    const liveData = await fetchFootballAPI(url);

    if (liveData.data) {
        await redis.set(
            `event-${fixture}`,
            JSON.stringify({
                data: liveData.data,
                createdAt: Date.now()
            }),
            "EX",
            TTL
        );
    }
    console.log("Live - Events", fixture)

    return liveData;
};



export const getFixtureStatistics = async (
    fixture: string,
    realTime: boolean,
    TTL: number,
    maxAge: number | null
): Promise<FootballAPIResponse> => {
    if (!realTime) {
        const cache = await getValueFromCache(`statistics-${fixture}`, maxAge);
        if (cache) {
            console.log("Cached - Statistics", fixture)
            return { data: cache.data };
        }
    }

    const url = `${API_URL}/fixtures/statistics?fixture=${fixture}`;
    const liveData = await fetchFootballAPI(url);

    if (liveData.data) {
        await redis.set(
            `statistics-${fixture}`,
            JSON.stringify({
                data: liveData.data,
                createdAt: Date.now()
            }),
            "EX",
            TTL
        );
    }
    console.log("Live - Statistics", fixture)
    return liveData;
};