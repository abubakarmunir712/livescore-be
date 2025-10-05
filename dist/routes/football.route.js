"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.footballRouter = void 0;
const express_1 = require("express");
const football_controller_1 = require("../controllers/football.controller");
const router = (0, express_1.Router)();
exports.footballRouter = router;
router.post("/matches", football_controller_1.getMatchesByDateC);
//# sourceMappingURL=football.route.js.map