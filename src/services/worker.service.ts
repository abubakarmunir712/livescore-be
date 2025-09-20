import { daysDiff } from "../controllers/football.controller"
import { getMatchesByDate, getLeagueStandings, getHeadToHead, getLiveMatches, getFixtureEvent, getFixtureStatistics, getTeamFixtures } from "./football.service"

const liveLeagues: Set<number> = new Set()

export const initialFetch = async () => {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 4)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 4)
    const [teams, leagues, fixtures, uniqueTeams] = await fetchAllFixtures(startDate, endDate)

    console.log(leagues.size)
    await fetchAllStandings(leagues)

    console.log(teams.size)
    await fetchH2H(teams)


    console.log(fixtures.size)
    await fetchAllEvents(fixtures)


    console.log(fixtures.size)
    await fetchStatistics(fixtures)

    console.log(uniqueTeams.size)
    await teamStreak(uniqueTeams)

    await fetchLiveMatches()
}

const fetchAllFixtures = async (startDate: Date, endDate: Date): Promise<[Set<string>, Set<string>, Set<string>, Set<string>]> => {
    const leagues = new Set<string>()
    const teams = new Set<string>()
    const fixtures = new Set<string>()
    const uniqueTeams = new Set<string>()

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const response = await getMatchesByDate(d, false, 3600 * 24 * 7, 3600 * 24 * 7)
        if (response.data) {
            for (const match of response.data) {
                const leagueKey = `${match.league.id}-${match.league.season}`
                if (match.league.standings) {
                    leagues.add(leagueKey)
                }
                const matchDate = new Date(match.fixture.date)
                if (matchDate < new Date()) {
                    fixtures.add(match.fixture.id.toString())
                }
                const homeId = match.teams.home.id
                const awayId = match.teams.away.id
                uniqueTeams.add(homeId.toString())
                uniqueTeams.add(awayId.toString())
                const teamKey = homeId < awayId ? `${homeId}-${awayId}` : `${awayId}-${homeId}`
                teams.add(teamKey)
            }
        }
    }

    return [teams, leagues, fixtures, uniqueTeams]
}


const fetchAllStandings = async (leagues: Set<string>) => {
    let success = 0
    let fails = 0

    for (const leagueKey of leagues) {
        const [leagueId, season] = leagueKey.split('-')
        if (leagueId && season) {
            const response = await getLeagueStandings(leagueId, season, false, 3600 * 24 * 7, 3600 * 24 * 7)
            if (response.data) {
                success++
            }
            else {
                fails++
            }
        }
    }

    console.log(leagues.size)
    console.log(success, fails)
}

const fetchH2H = async (teams: Set<string>) => {
    let success = 0;
    let fails = 0;

    for (const teamKey of teams) {
        const [team1, team2] = teamKey.split('-');
        if (team1 && team2) {
            const response = await getHeadToHead(team1, team2, false, 3600 * 24 * 7, 3600 * 24 * 7);
            if (response.data) success++;
            else fails++;
        }
    }

    console.log(`Success: ${success}, Fails: ${fails}`);
};


const fetchLiveMatches = async () => {
    await getLiveMatches(false, 60, 60)
}


const fetchAllEvents = async (fixtures: Set<string>) => {
    let success = 0;
    let fails = 0;
    for (const fixtureId of fixtures) {
        const response = await getFixtureEvent(fixtureId, false, 3600 * 24 * 7, 3600 * 24 * 7)
        if (response.data) success++;
        else fails++;
    }
}

const fetchStatistics = async (fixtures: Set<string>) => {
    let success = 0;
    let fails = 0;
    for (const fixtureId of fixtures) {
        const response = await getFixtureStatistics(fixtureId, false, 3600 * 24 * 7, 3600 * 24 * 7)
        if (response.data) success++;
        else fails++;
    }
}

const teamStreak = async (teams: Set<string>) => {
    let success = 0;
    let fails = 0;
    for (const teamId of teams) {
        const response = await getTeamFixtures(teamId, false, 3600 * 24 * 7, 3600 * 24 * 7)
        if (response.data) success++;
        else fails++;
    }
}


export const worker = async () => {
    let prevLive: any[] = []
    let liveFixtures: any[] = []
    let isLimitReached: boolean = false
    let currentDate = new Date()
    setInterval(async () => {
        console.log("Worker Started")
        if (isLimitReached) {
            if (daysDiff(new Date, currentDate)) {
                console.log("Plan Limit Reached!")
                return
            }
            isLimitReached = false
            currentDate = new Date()
        }
        const lMatches = await getLiveMatches(true, 60, 60)
        if (lMatches.data) {
            prevLive = liveFixtures
            liveFixtures = lMatches.data
        }
        else if (lMatches.error?.requests) {
            isLimitReached = true
            currentDate = new Date()
        }

        getMatchesByDate(new Date(), true, 3600 * 7 * 24, 0)

        for (const match of liveFixtures) {
            await getFixtureEvent(match.fixture.id.toString(), true, 3600 * 24 * 7, null)
            await getFixtureStatistics(match.fixture.id.toString(), true, 3600 * 24 * 7, null)
        }

        const liveIds = new Set(liveFixtures.map(m => m.fixture.id))
        const endedFixtures = prevLive.filter(m => !liveIds.has(m.fixture.id))
        for (const match of endedFixtures) {
            console.log("Match Finished", match.fixture.id)
            await getLeagueStandings(match.league.id.toString(), match.league.season.toString(), true, 3600 * 24 * 7, 0)
            await getTeamFixtures(match.teams.home.id.toString(), true, 3600 * 7 * 24, 0)
            await getHeadToHead(match.teams.home.id.toString(), match.teams.away.id.toString(), true, 3600 * 24 * 7, 0)

        }
    }, 60000)

    setInterval(() => {
        initialFetch()
    }, 3600 * 24 * 1000)
}