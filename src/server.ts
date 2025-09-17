import "dotenv/config";
import { app } from "./configs/server.config";
import { Request, Response } from "express";
import { footballRouter } from "./routes/football.route";

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log('Server started on port', PORT)
})

app.get("/", (req: Request, res: Response) => {
    return res.status(200).json({ "message": "Server is running" })
})

app.use("/football", footballRouter)