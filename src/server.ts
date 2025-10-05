import "dotenv/config";
import { app } from "./configs/server.config";
import { Request, Response } from "express";
import { footballRouter } from "./routes/football.route";
import { initialFetch, worker } from "./services/worker.service";

const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
    console.log('Server started on port', PORT)
    await initialFetch()
    worker()
})

app.get("/", (req: Request, res: Response) => {
    return res.status(200).json({ "message": "Server is running" })
})

app.use("/football", footballRouter)
