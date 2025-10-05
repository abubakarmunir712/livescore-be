import { RedisKey } from "ioredis";
import { FootballAPIResponse, RedisResponse } from "../types/type";
export declare const fetchFootballAPI: (url: string) => Promise<{
    error: any;
    data?: never;
} | {
    data: any;
    error?: never;
}>;
export declare const getValueFromCache: (key: RedisKey, maxAge: number | null) => Promise<RedisResponse | null>;
export declare const getLiveMatches: (realTime: boolean, TTL: number, maxAge: number | null) => Promise<FootballAPIResponse>;
export declare const getMatchesByDate: (date: Date, realTime: boolean, TTL: number, maxAge: number | null) => Promise<FootballAPIResponse>;
export declare const getLeagueStandings: (league: string, season: string, realTime: boolean, TTL: number, maxAge: number | null) => Promise<FootballAPIResponse>;
export declare const getHeadToHead: (team1: string, team2: string, realTime: boolean, TTL: number, maxAge: number | null) => Promise<FootballAPIResponse>;
export declare const getTeamFixtures: (team: string, realTime: boolean, TTL: number, maxAge: number | null) => Promise<FootballAPIResponse>;
export declare const getFixtureEvent: (fixture: string, realTime: boolean, TTL: number, maxAge: number | null) => Promise<FootballAPIResponse>;
export declare const getFixtureStatistics: (fixture: string, realTime: boolean, TTL: number, maxAge: number | null) => Promise<FootballAPIResponse>;
//# sourceMappingURL=football.service.d.ts.map