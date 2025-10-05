"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.getMatchesByDateC = void 0;
exports.getUtcRangeForLocalDate = getUtcRangeForLocalDate;
exports.daysDiff = daysDiff;
const football_service_1 = require("../services/football.service");
const validStatuses = ["live", "upcoming", "finished"];
const getMatchesByDateC = async (req, res) => {
    const { date, timezone, status, start, search } = req.body;
    // --- validation ---
    if (!date || !status || timezone === undefined) {
        return res.status(400).json({
            error: "date, timezone and status are all required fields."
        });
    }
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
            error: "Invalid date format. Must be ISO string."
        });
    }
    if (typeof timezone !== "number" || timezone < -720 || timezone > 840) {
        return res.status(400).json({
            error: "Invalid timezone offset. Must be minutes between -720 and +840."
        });
    }
    let allMatches = [];
    // --- live matches ---
    if (status === "live") {
        const liveData = await (0, football_service_1.getLiveMatches)(false, 60, 60);
        if (liveData.error) {
            return res.status(500).json({ error: liveData.error });
        }
        allMatches = liveData.data;
    }
    else {
        // --- scheduled/finished etc matches ---
        const { startUtc, endUtc } = getUtcRangeForLocalDate(parsedDate, timezone);
        let data1 = await (0, football_service_1.getMatchesByDate)(startUtc, false, 3600 * 24 * 7, 3600 * 24 * 7);
        let data2 = { data: [], error: null };
        if (daysDiff(startUtc, endUtc) !== 0) {
            data2 = await (0, football_service_1.getMatchesByDate)(endUtc, false, 3600 * 24 * 7, 3600 * 24 * 7);
        }
        if (data1?.error || data2?.error) {
            return res.status(500).json({
                error: {
                    ...(data1?.error || {}),
                    ...(data2?.error || {})
                }
            });
        }
        allMatches = [...data1.data, ...data2.data];
    }
    // --- common filtering ---
    let filteredData = allMatches.filter((element) => {
        // for non-live: filter by date & status
        if (status !== "live") {
            const matchUtc = new Date(element.fixture.date);
            const matchLocal = new Date(matchUtc.getTime() - timezone * 60 * 1000);
            return (daysDiff(parsedDate, matchLocal) === 0 &&
                mapToStatus(element.fixture.status.short) === status);
        }
        // for live: just status check
        return mapToStatus(element.fixture.status.short) === "live";
    });
    // --- search filter ---
    if (search && search.trim() !== "") {
        const query = search.trim().toLowerCase();
        filteredData = filteredData.filter((m) => {
            return (m.league?.name?.toLowerCase().includes(query) ||
                m.league?.country?.toLowerCase().includes(query) ||
                m.teams?.home?.name?.toLowerCase().includes(query) ||
                m.teams?.away?.name?.toLowerCase().includes(query));
        });
    }
    // --- paging ---
    const startIdx = Math.max(Number(start) || 0, 0);
    const limit = 20;
    const endIdx = Math.min(startIdx + limit, filteredData.length);
    const pagedData = filteredData.slice(startIdx, startIdx + limit);
    // --- stats ---
    const dataStats = await (0, exports.getStats)(pagedData);
    return res.json({
        data: dataStats,
        total: filteredData.length,
        pageStart: startIdx,
        pageSize: limit,
        query: search || ""
    });
};
exports.getMatchesByDateC = getMatchesByDateC;
// custom concurrency runner
async function runWithLimit(tasks, limit) {
    const results = [];
    let i = 0;
    async function worker() {
        while (i < tasks.length) {
            const cur = i++;
            const task = tasks[cur];
            if (task) {
                results[cur] = await task();
            }
        }
    }
    const workers = Array(Math.min(limit, tasks.length))
        .fill(0)
        .map(() => worker());
    await Promise.all(workers);
    return results;
}
const getStats = async (response) => {
    const tasks = response.map((match) => async () => {
        const [standings, statistics, streak1, streak2, h2h, events,] = await Promise.all([
            (0, football_service_1.getLeagueStandings)(match.league.id.toString(), match.league.season.toString(), false, 3600 * 7 * 24, 3600 * 7 * 24),
            (0, football_service_1.getFixtureStatistics)(match.fixture.id.toString(), false, 3600 * 7 * 24, 3600 * 7 * 24),
            (0, football_service_1.getTeamFixtures)(match.teams.home.id.toString(), false, 3600 * 7 * 25, 3600 * 7 * 25),
            (0, football_service_1.getTeamFixtures)(match.teams.away.id.toString(), false, 3600 * 7 * 25, 3600 * 7 * 25),
            (0, football_service_1.getHeadToHead)(match.teams.home.id.toString(), match.teams.away.id.toString(), false, 3600 * 7 * 25, 3600 * 7 * 25),
            (0, football_service_1.getFixtureEvent)(match.fixture.id.toString(), false, 3600 * 7 * 24, 3600 * 7 * 24),
        ]);
        match["standings"] = standings.data ?? null;
        match["statistics"] = statistics.data ?? null;
        match[`streak-${match.teams.home.id}`] = streak1.data ?? null;
        match[`streak-${match.teams.away.id}`] = streak2.data ?? null;
        match["h2h"] = h2h.data ?? null;
        match["events"] = events.data ?? null;
        return match;
    });
    return runWithLimit(tasks, 200);
};
exports.getStats = getStats;
function getUtcRangeForLocalDate(localDate, timezoneOffsetMinutes) {
    let startUtc = new Date(localDate);
    let endUtc = new Date(localDate);
    if (timezoneOffsetMinutes < 0) {
        startUtc.setDate(localDate.getDate() - 1);
    }
    else if (timezoneOffsetMinutes > 0) {
        endUtc.setDate(localDate.getDate() + 1);
    }
    return { startUtc, endUtc };
}
function daysDiff(d1, d2) {
    const oneDay = 1000 * 60 * 60 * 24;
    const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
    const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
    return Math.floor((utc2 - utc1) / oneDay);
}
function mapToStatus(code) {
    const liveCodes = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"];
    const finishedCodes = ["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"];
    const upcomingCodes = ["TBD", "NS", "PST"];
    if (liveCodes.includes(code))
        return "live";
    if (finishedCodes.includes(code))
        return "finished";
    if (upcomingCodes.includes(code))
        return "upcoming";
    return "upcoming";
}
//# sourceMappingURL=football.controller.js.map