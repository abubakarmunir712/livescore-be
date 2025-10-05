"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
});
redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error", err));
redis.on("close", () => console.log("Redis disconnected"));
exports.default = redis;
//# sourceMappingURL=redis.config.js.map