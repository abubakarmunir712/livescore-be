"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFixtureStatistics = exports.getFixtureEvent = exports.getTeamFixtures = exports.getHeadToHead = exports.getLeagueStandings = exports.getMatchesByDate = exports.getLiveMatches = exports.getValueFromCache = exports.fetchFootballAPI = void 0;
const redis_config_1 = __importDefault(require("../configs/redis.config"));
const API_URL = process.env.FOOTBALL_API_URL || 'https://v3.football.api-sports.io';
const fetchFootballAPI = async (url) => {
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
            return { "error": data.errors };
        }
        return { "data": data.response };
    }
    catch (e) {
        return { "error": e };
    }
};
exports.fetchFootballAPI = fetchFootballAPI;
// Helper functions
const getValueFromCache = async (key, maxAge) => {
    let cache = await redis_config_1.default.get(key);
    if (cache) {
        try {
            const cacheObj = JSON.parse(cache);
            if (cacheObj && cacheObj.createdAt) {
                if (maxAge === null) {
                    return cacheObj;
                }
                const timeDiff = Date.now() - cacheObj.createdAt;
                if (maxAge != null && timeDiff < maxAge * 1000) {
                    return cacheObj;
                }
            }
        }
        catch {
            return null;
        }
    }
    return null;
};
exports.getValueFromCache = getValueFromCache;
// Functions to fetch data from API
const getLiveMatches = async (realTime, TTL, maxAge) => {
    if (!realTime) {
        const cache = await (0, exports.getValueFromCache)("fixtures-live-all", maxAge);
        if (cache) {
            console.log("Cached - Live");
            return { data: cache.data };
        }
    }
    const url = `${API_URL}/fixtures?live=all`;
    const liveData = await (0, exports.fetchFootballAPI)(url);
    if (liveData.data) {
        await redis_config_1.default.set("fixtures-live-all", JSON.stringify({
            data: liveData.data,
            createdAt: Date.now()
        }), "EX", TTL);
    }
    console.log("RealTime - Live");
    return liveData;
};
exports.getLiveMatches = getLiveMatches;
const getMatchesByDate = async (date, realTime, TTL, maxAge) => {
    const dateString = date.toISOString().split("T")[0];
    if (!realTime) {
        const cache = await (0, exports.getValueFromCache)(`fixture-${dateString}`, maxAge);
        if (cache) {
            console.log("Cached - Fixtures ", dateString);
            return { data: cache.data };
        }
    }
    const url = `${API_URL}/fixtures?date=${dateString}`;
    const liveData = await (0, exports.fetchFootballAPI)(url);
    console.log("Live - Fixtures ", dateString);
    if (liveData.data) {
        await redis_config_1.default.set(`fixture-${dateString}`, JSON.stringify({
            data: liveData.data,
            createdAt: Date.now()
        }), "EX", TTL);
    }
    return liveData;
};
exports.getMatchesByDate = getMatchesByDate;
const getLeagueStandings = async (league, season, realTime, TTL, maxAge) => {
    let test = false;
    if (!realTime) {
        const cache = await (0, exports.getValueFromCache)(`standing-${league}-${season}`, maxAge);
        if (cache) {
            console.log("Cached - Standings", season, league);
            return { data: cache.data };
        }
    }
    const url = `${API_URL}/standings?league=${league}&season=${season}`;
    const liveData = await (0, exports.fetchFootballAPI)(url);
    if (liveData.data) {
        await redis_config_1.default.set(`standing-${league}-${season}`, JSON.stringify({
            data: liveData.data,
            createdAt: Date.now()
        }), "EX", TTL);
    }
    console.log("Live - Standings -", test, season, league);
    return liveData;
};
exports.getLeagueStandings = getLeagueStandings;
const getHeadToHead = async (team1, team2, realTime, TTL, maxAge) => {
    const key1 = `h2h-${team1}-${team2}`;
    const key2 = `h2h-${team2}-${team1}`;
    if (!realTime) {
        const cache1 = await (0, exports.getValueFromCache)(key1, maxAge);
        if (cache1) {
            console.log("Cached - H2H", team1, team2);
            return { data: cache1.data };
        }
        const cache2 = await (0, exports.getValueFromCache)(key2, maxAge);
        if (cache2) {
            console.log("Cached - H2H", team1, team2);
            return { data: cache2.data };
        }
    }
    const url = `${API_URL}/fixtures/headtohead?h2h=${team1}-${team2}`;
    const liveData = await (0, exports.fetchFootballAPI)(url);
    if (liveData.data) {
        await redis_config_1.default.set(`h2h-${team2}-${team1}`, JSON.stringify({
            data: liveData.data,
            createdAt: Date.now()
        }), "EX", TTL);
    }
    console.log("Live - H2H", team1, team2);
    return liveData;
};
exports.getHeadToHead = getHeadToHead;
const getTeamFixtures = async (team, realTime, TTL, maxAge) => {
    if (!realTime) {
        const cache = await (0, exports.getValueFromCache)(`streak-${team}`, maxAge);
        if (cache) {
            console.log("Cached - Streak", team);
            return { data: cache.data };
        }
    }
    const url = `${API_URL}/fixtures?team=${team}&last=5&status=ft`;
    const liveData = await (0, exports.fetchFootballAPI)(url);
    if (liveData.data) {
        await redis_config_1.default.set(`streak-${team}`, JSON.stringify({
            data: liveData.data,
            createdAt: Date.now()
        }), "EX", TTL);
    }
    console.log("Live - Streak", team);
    return liveData;
};
exports.getTeamFixtures = getTeamFixtures;
const getFixtureEvent = async (fixture, realTime, TTL, maxAge) => {
    if (!realTime) {
        const cache = await (0, exports.getValueFromCache)(`event-${fixture}`, maxAge);
        if (cache) {
            console.log("Cached - Events", fixture);
            return { data: cache.data };
        }
    }
    const url = `${API_URL}/fixtures/events?fixture=${fixture}`;
    const liveData = await (0, exports.fetchFootballAPI)(url);
    if (liveData.data) {
        await redis_config_1.default.set(`event-${fixture}`, JSON.stringify({
            data: liveData.data,
            createdAt: Date.now()
        }), "EX", TTL);
    }
    console.log("Live - Events", fixture);
    return liveData;
};
exports.getFixtureEvent = getFixtureEvent;
const getFixtureStatistics = async (fixture, realTime, TTL, maxAge) => {
    if (!realTime) {
        const cache = await (0, exports.getValueFromCache)(`statistics-${fixture}`, maxAge);
        if (cache) {
            console.log("Cached - Statistics", fixture);
            return { data: cache.data };
        }
    }
    const url = `${API_URL}/fixtures/statistics?fixture=${fixture}`;
    const liveData = await (0, exports.fetchFootballAPI)(url);
    if (liveData.data) {
        await redis_config_1.default.set(`statistics-${fixture}`, JSON.stringify({
            data: liveData.data,
            createdAt: Date.now()
        }), "EX", TTL);
        console.log("Live - Statistics", fixture);
    }
    else {
        console.log("Error - Statistics", fixture);
    }
    return liveData;
};
exports.getFixtureStatistics = getFixtureStatistics;
//# sourceMappingURL=football.service.js.map