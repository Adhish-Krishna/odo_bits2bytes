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

/**
 * @openapi
 * /api/v1/cities:
 *   get:
 *     tags: [Cities]
 *     summary: Search and list cities
 *     description: Returns a paginated list of cities with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by city name or country
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: continent
 *         schema:
 *           type: string
 *           enum: [Europe, Asia, North America, South America, Africa, Oceania]
 *       - in: query
 *         name: minCost
 *         schema:
 *           type: number
 *         description: Minimum average daily cost
 *       - in: query
 *         name: maxCost
 *         schema:
 *           type: number
 *         description: Maximum average daily cost
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, popularity, cost]
 *           default: name
 *     responses:
 *       200:
 *         description: Paginated list of cities
 */
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

/**
 * @openapi
 * /api/v1/cities/popular:
 *   get:
 *     tags: [Cities]
 *     summary: Get popular/trending cities
 *     description: Returns the top 10 most popular destinations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of popular cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 */
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

/**
 * @openapi
 * /api/v1/cities/{id}:
 *   get:
 *     tags: [Cities]
 *     summary: Get city details
 *     description: Returns detailed information about a specific city including top activities
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: City details with activities
 *       404:
 *         description: City not found
 */
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

/**
 * @openapi
 * /api/v1/cities/{cityId}/activities:
 *   get:
 *     tags: [Cities]
 *     summary: Get activities in a city
 *     description: Returns all activities available in a specific city with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [SIGHTSEEING, FOOD_TOUR, ADVENTURE, CULTURAL, RELAXATION, NIGHTLIFE, SHOPPING, TRANSPORTATION]
 *       - in: query
 *         name: minCost
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxCost
 *         schema:
 *           type: number
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of activities
 */
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
