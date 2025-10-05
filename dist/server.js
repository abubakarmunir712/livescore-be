"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const server_config_1 = require("./configs/server.config");
const football_route_1 = require("./routes/football.route");
const worker_service_1 = require("./services/worker.service");
const PORT = process.env.PORT || 3000;
server_config_1.app.listen(PORT, async () => {
    console.log('Server started on port', PORT);
    await (0, worker_service_1.initialFetch)();
    (0, worker_service_1.worker)();
});
server_config_1.app.get("/", (req, res) => {
    return res.status(200).json({ "message": "Server is running" });
});
server_config_1.app.use("/football", football_route_1.footballRouter);
//# sourceMappingURL=server.js.map