import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/response.util";

type ValidationType = "body" | "query" | "params";

export const validate = (schema: ZodSchema, type: ValidationType = "body") => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data =
                type === "body" ? req.body : type === "query" ? req.query : req.params;
            const parsed = schema.parse(data);

            // Replace with parsed data (includes transformations)
            if (type === "body") {
                req.body = parsed;
            } else if (type === "query") {
                (req as any).validatedQuery = parsed;
            } else {
                (req as any).validatedParams = parsed;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.issues.map(
                    (e) => `${e.path.join(".")}: ${e.message}`
                );
                return sendError(res, messages.join(", "), 400);
            }
            return sendError(res, "Validation failed", 400);
        }
    };
};
