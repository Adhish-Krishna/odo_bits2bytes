import { Router, Response } from "express";
import prisma from "../../config/db.config";
import { sendSuccess, sendPaginated } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import { activitySearchSchema } from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware";
import { Prisma } from "@prisma/client";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /activities - Search activities
router.get(
    "/",
    validate(activitySearchSchema, "query"),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { page, limit, cityId, category, minCost, maxCost, minRating } =
            (req as any).validatedQuery;

        const where: Prisma.ActivityWhereInput = {};

        if (cityId) {
            where.cityId = cityId;
        }

        if (category) {
            where.category = category;
        }

        if (minCost !== undefined || maxCost !== undefined) {
            where.estimatedCost = {};
            if (minCost !== undefined) where.estimatedCost.gte = minCost;
            if (maxCost !== undefined) where.estimatedCost.lte = maxCost;
        }

        if (minRating !== undefined) {
            where.rating = { gte: minRating };
        }

        const [activities, total] = await Promise.all([
            prisma.activity.findMany({
                where,
                include: {
                    city: {
                        select: { id: true, name: true, country: true },
                    },
                },
                orderBy: { rating: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.activity.count({ where }),
        ]);

        return sendPaginated(res, activities, page, limit, total);
    })
);

// GET /activities/:id - Get activity details
router.get(
    "/:id",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const activity = await prisma.activity.findUnique({
            where: { id },
            include: {
                city: true,
            },
        });

        if (!activity) {
            return sendSuccess(res, null, "Activity not found");
        }

        return sendSuccess(res, activity);
    })
);

export default router;
