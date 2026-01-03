import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.util";

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export const errorMiddleware = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error("Error:", err);

    const statusCode = err.statusCode || 500;
    const message =
        process.env.NODE_ENV === "production" && statusCode === 500
            ? "Internal server error"
            : err.message || "Something went wrong";

    return sendError(res, message, statusCode);
};

// Not found handler
export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    return sendError(res, `Route ${req.originalUrl} not found`, 404);
};

// Async handler wrapper
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
