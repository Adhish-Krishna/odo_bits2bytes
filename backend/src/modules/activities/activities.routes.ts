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

/**
 * @openapi
 * /api/v1/activities:
 *   get:
 *     tags: [Activities]
 *     summary: Search activities
 *     description: Returns a paginated list of activities with optional filters
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
 *         name: cityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by city
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
 *         description: Paginated list of activities
 */
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

/**
 * @openapi
 * /api/v1/activities/{id}:
 *   get:
 *     tags: [Activities]
 *     summary: Get activity details
 *     description: Returns detailed information about a specific activity
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
 *         description: Activity details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Activity'
 *       404:
 *         description: Activity not found
 */
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
