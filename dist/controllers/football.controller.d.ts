import { Request, Response } from "express";
export declare const getMatchesByDateC: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getStats: (response: any[]) => Promise<any[]>;
export declare function getUtcRangeForLocalDate(localDate: Date, timezoneOffsetMinutes: number): {
    startUtc: Date;
    endUtc: Date;
};
export declare function daysDiff(d1: Date, d2: Date): number;
//# sourceMappingURL=football.controller.d.ts.map