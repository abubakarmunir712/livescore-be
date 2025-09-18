import { Router } from "express";
import { getMatchesByDateC } from "../controllers/football.controller";
const router = Router()

router.post("/matches", getMatchesByDateC)

export { router as footballRouter }