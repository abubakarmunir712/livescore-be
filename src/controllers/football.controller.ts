import { Request, Response } from "express";
import { getLiveMatches, getMatchesByDate, getLeagueStandings, getFixtureStatistics, getTeamFixtures, getHeadToHead, getFixtureEvent } from "../services/football.service";
import { FootballAPIResponse, Status } from "../types/type";

const validStatuses: Status[] = ["live", "upcoming", "finished"];

export const getMatchesByDateC = async (req: Request, res: Response) => {

    const { date, timezone, status } = req.body;
    if (!date || !status || timezone === undefined) {
        return res.status(400).json({
            error: "date, timezone and status are all required fields."
        });
    }
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            error: "Invalid status"
        });
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

    if (status == "live") {
        const liveData = await getLiveMatches(false, 60, 60)
        if (liveData.error) {
            return res.status(500).json({ error: liveData.error })
        }
        else {
            const dataStats = await getStats(liveData.data)
            return res.json({ data: dataStats })
        }
    }

    const { startUtc, endUtc } = getUtcRangeForLocalDate(parsedDate, timezone);
    let data1 = await getMatchesByDate(startUtc, false, 3600 * 24 * 7, 3600 * 24 * 7)
    let data2: FootballAPIResponse = { data: [], error: null };
    if (daysDiff(startUtc, endUtc) != 0) {
        data2 = await getMatchesByDate(endUtc, false, 3600 * 24 * 7, 3600 * 24 * 7)

    }

    if (data1?.error || data2?.error) {
        return res.status(500).json({
            error: {
                ...(data1?.error || {}),
                ...(data2?.error || {})
            }
        })
    }

    const data = [...data1.data, ...data2?.data]

    let filteredData: any[] = []
    data.forEach((element: any) => {
        const matchUtc = new Date(element.fixture.date);
        const matchLocal = new Date(matchUtc.getTime() - timezone * 60 * 1000);
        if (daysDiff(parsedDate, matchLocal) === 0 && mapToStatus(element.fixture.status.short) == status) {
            filteredData.push(element);
        }
    });

    const dataStats = await getStats(filteredData)

    return res.json({ data: dataStats })


}




export const getStats = async (response: any[]) => {
    const { default: pLimit } = await import("p-limit");
    const limit = pLimit(20); // max 20 tasks at once

    const tasks = response.map((match) =>
        limit(async () => {
            const [
                standings,
                statistics,
                streak1,
                streak2,
                h2h,
                events,
            ] = await Promise.all([
                getLeagueStandings(
                    match.league.id.toString(),
                    match.league.season.toString(),
                    false,
                    3600 * 7 * 24,
                    3600 * 7 * 24
                ),
                getFixtureStatistics(
                    match.fixture.id.toString(),
                    false,
                    3600 * 7 * 24,
                    3600 * 7 * 24
                ),
                getTeamFixtures(match.teams.home.id.toString(), false, 3600 * 7 * 25, 3600 * 7 * 25),
                getTeamFixtures(match.teams.away.id.toString(), false, 3600 * 7 * 25, 3600 * 7 * 25),
                getHeadToHead(
                    match.teams.home.id.toString(),
                    match.teams.away.id.toString(),
                    false,
                    3600 * 7 * 25,
                    3600 * 7 * 25
                ),
                getFixtureEvent(match.fixture.id.toString(), false, 3600 * 7 * 24, 3600 * 7 * 24),
            ]);

            match["standings"] = standings.data ?? null;
            match["statistics"] = statistics.data ?? null;
            match[`streak-${match.teams.home.id}`] = streak1.data ?? null;
            match[`streak-${match.teams.away.id}`] = streak2.data ?? null;
            match["h2h"] = h2h.data ?? null;
            match["events"] = events.data ?? null;

            return match;
        })
    );

    return Promise.all(tasks);
};


export function getUtcRangeForLocalDate(localDate: Date, timezoneOffsetMinutes: number) {
    let startUtc: Date = new Date(localDate);
    let endUtc: Date = new Date(localDate);
    if (timezoneOffsetMinutes < 0) {
        startUtc.setDate(localDate.getDate() - 1)

    }
    else if (timezoneOffsetMinutes > 0) {
        endUtc.setDate(localDate.getDate() + 1)
    }
    return { startUtc, endUtc };
}

export function daysDiff(d1: Date, d2: Date): number {
    const oneDay = 1000 * 60 * 60 * 24;

    const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
    const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());

    return Math.floor((utc2 - utc1) / oneDay);
}


function mapToStatus(code: string): Status {
    const liveCodes = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"];
    const finishedCodes = ["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"];
    const upcomingCodes = ["TBD", "NS", "PST"];

    if (liveCodes.includes(code)) return "live";
    if (finishedCodes.includes(code)) return "finished";
    if (upcomingCodes.includes(code)) return "upcoming";

    return "upcoming";
}