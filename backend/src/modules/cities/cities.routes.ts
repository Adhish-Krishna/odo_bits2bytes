import { Router, Response } from "express";
import prisma from "../../config/db.config";
import { sendSuccess, sendPaginated } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import { citySearchSchema } from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware";
import { Prisma } from "@prisma/client";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /cities - Search/list cities
router.get(
    "/",
    validate(citySearchSchema, "query"),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { page, limit, search, country, continent, minCost, maxCost, sortBy } =
            (req as any).validatedQuery;

        const where: Prisma.CityWhereInput = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { country: { contains: search, mode: "insensitive" } },
            ];
        }

        if (country) {
            where.country = { equals: country, mode: "insensitive" };
        }

        if (continent) {
            where.continent = { equals: continent, mode: "insensitive" };
        }

        if (minCost !== undefined || maxCost !== undefined) {
            where.avgDailyCost = {};
            if (minCost !== undefined) {
                where.avgDailyCost.gte = minCost;
            }
            if (maxCost !== undefined) {
                where.avgDailyCost.lte = maxCost;
            }
        }

        const orderBy: Prisma.CityOrderByWithRelationInput =
            sortBy === "popularity"
                ? { popularityScore: "desc" }
                : sortBy === "cost"
                    ? { avgDailyCost: "asc" }
                    : { name: "asc" };

        const [cities, total] = await Promise.all([
            prisma.city.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    _count: {
                        select: { activities: true },
                    },
                },
            }),
            prisma.city.count({ where }),
        ]);

        return sendPaginated(res, cities, page, limit, total);
    })
);

// GET /cities/popular - Get trending cities
router.get(
    "/popular",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const cities = await prisma.city.findMany({
            orderBy: { popularityScore: "desc" },
            take: 10,
            include: {
                _count: {
                    select: { activities: true },
                },
            },
        });

        return sendSuccess(res, cities);
    })
);

// GET /cities/:id - Get city details
router.get(
    "/:id",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const city = await prisma.city.findUnique({
            where: { id },
            include: {
                activities: {
                    orderBy: { rating: "desc" },
                    take: 20,
                },
                _count: {
                    select: { activities: true },
                },
            },
        });

        if (!city) {
            return sendSuccess(res, null, "City not found");
        }

        return sendSuccess(res, city);
    })
);

// GET /cities/:cityId/activities - Get all activities in a city
router.get(
    "/:cityId/activities",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { cityId } = req.params;
        const { category, minCost, maxCost, minRating } = req.query;

        const where: Prisma.ActivityWhereInput = { cityId };

        if (category) {
            where.category = category as any;
        }

        if (minCost || maxCost) {
            where.estimatedCost = {};
            if (minCost) where.estimatedCost.gte = Number(minCost);
            if (maxCost) where.estimatedCost.lte = Number(maxCost);
        }

        if (minRating) {
            where.rating = { gte: Number(minRating) };
        }

        const activities = await prisma.activity.findMany({
            where,
            orderBy: { rating: "desc" },
        });

        return sendSuccess(res, activities);
    })
);

export default router;
