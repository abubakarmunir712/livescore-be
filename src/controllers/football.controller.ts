import { Request, Response } from "express";
import { getLiveMatches, getMatchesByDate, getLeagueStandings } from "../services/football.service";


export const getLiveMatchesC = async (req: Request, res: Response) => {
    const response = await getLiveMatches(false, 120, null)
    if (response.data) {
        return res.status(200).json({ data: response.data })
    }
    else {
        return res.status(500).json({ error: response.error ?? "Something went wrong!" })
    }
}

export const getMatchesByDateC = async (req: Request, res: Response) => {
    const { date } = req.body
    const response = await getMatchesByDate(date, false, 3600, 3600)
    if (response.data) {
        return res.status(200).json({ data: response.data })
    }
    else {
        return res.status(500).json({ error: response.error ?? "Something went wrong!" })
    }
}