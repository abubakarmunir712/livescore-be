export interface FootballAPIResponse {
    data?: any;
    error?: any;
}

export interface RedisResponse {
    data: any;
    createdAt?: number;
}

export type Status = "live" | "upcoming" | "finished"