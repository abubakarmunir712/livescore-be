import { Router } from "express";
import { getLiveMatchesC } from "../controllers/football.controller";
const router = Router()

router.get("/live", getLiveMatchesC)

export { router as footballRouter }