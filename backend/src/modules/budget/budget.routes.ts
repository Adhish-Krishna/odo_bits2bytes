import { Router, Response } from "express";
import prisma from "../../config/db.config";
import { sendSuccess, sendError } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import { setBudgetSchema } from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware";

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authMiddleware);

// Helper to verify trip ownership
const verifyTripOwnership = async (tripId: string, userId: string) => {
    return prisma.trip.findFirst({
        where: { id: tripId, userId },
    });
};

/**
 * @openapi
 * /api/v1/trips/{tripId}/budget:
 *   get:
 *     tags: [Budget]
 *     summary: Get trip budget breakdown
 *     description: Returns detailed budget breakdown with allocations, spending, and warnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Budget breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBudget:
 *                       type: number
 *                       nullable: true
 *                     totalAllocated:
 *                       type: number
 *                     totalSpent:
 *                       type: number
 *                     remaining:
 *                       type: number
 *                     estimatedActivityCosts:
 *                       type: number
 *                     breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           allocated:
 *                             type: number
 *                           spent:
 *                             type: number
 *                           percentage:
 *                             type: integer
 *                           isOverBudget:
 *                             type: boolean
 *                     overBudgetWarnings:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: Trip not found
 */
router.get(
    "/",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        const budgets = await prisma.tripBudget.findMany({
            where: { tripId },
        });

        const totalAllocated = budgets.reduce(
            (sum: number, b) => sum + Number(b.allocatedAmount),
            0
        );
        const totalSpent = budgets.reduce(
            (sum: number, b) => sum + Number(b.spentAmount),
            0
        );

        const itineraryActivities = await prisma.itineraryActivity.findMany({
            where: {
                itinerary: { tripId },
            },
            include: { activity: true },
        });

        const activityCosts = itineraryActivities.reduce(
            (sum: number, ia) => {
                const cost = ia.customCost
                    ? Number(ia.customCost)
                    : Number(ia.activity.estimatedCost);
                return sum + cost;
            },
            0
        );

        const breakdown = budgets.map((b) => ({
            category: b.category,
            allocated: Number(b.allocatedAmount),
            spent: Number(b.spentAmount),
            percentage:
                totalAllocated > 0
                    ? Math.round((Number(b.allocatedAmount) / totalAllocated) * 100)
                    : 0,
            isOverBudget: Number(b.spentAmount) > Number(b.allocatedAmount),
        }));

        const overBudgetWarnings = breakdown
            .filter((b) => b.isOverBudget)
            .map(
                (b) =>
                    `${b.category} is over budget by $${(b.spent - b.allocated).toFixed(2)}`
            );

        return sendSuccess(res, {
            totalBudget: trip.totalBudget ? Number(trip.totalBudget) : null,
            totalAllocated,
            totalSpent,
            remaining: totalAllocated - totalSpent,
            estimatedActivityCosts: activityCosts,
            breakdown,
            overBudgetWarnings,
        });
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/budget:
 *   post:
 *     tags: [Budget]
 *     summary: Set budget allocations
 *     description: Creates or updates budget allocations for different categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [allocations]
 *             properties:
 *               allocations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [category, amount]
 *                   properties:
 *                     category:
 *                       type: string
 *                       enum: [TRANSPORT, ACCOMMODATION, FOOD, ACTIVITIES, SHOPPING, MISCELLANEOUS]
 *                     amount:
 *                       type: number
 *                       example: 500
 *     responses:
 *       200:
 *         description: Budget allocations updated
 *       404:
 *         description: Trip not found
 */
router.post(
    "/",
    validate(setBudgetSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;
        const { allocations } = req.body;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        await Promise.all(
            (allocations as Array<{ category: string; amount: number }>).map((alloc) =>
                prisma.tripBudget.upsert({
                    where: {
                        tripId_category: {
                            tripId,
                            category: alloc.category as any,
                        },
                    },
                    update: { allocatedAmount: alloc.amount },
                    create: {
                        tripId,
                        category: alloc.category as any,
                        allocatedAmount: alloc.amount,
                        spentAmount: 0,
                    },
                })
            )
        );

        const budgets = await prisma.tripBudget.findMany({
            where: { tripId },
        });

        return sendSuccess(res, budgets, "Budget updated");
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/budget/{category}:
 *   patch:
 *     tags: [Budget]
 *     summary: Update category budget
 *     description: Updates allocated or spent amount for a specific budget category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [TRANSPORT, ACCOMMODATION, FOOD, ACTIVITIES, SHOPPING, MISCELLANEOUS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allocatedAmount:
 *                 type: number
 *               spentAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Budget category updated
 *       404:
 *         description: Trip not found
 */
router.patch(
    "/:category",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, category } = req.params;
        const { allocatedAmount, spentAmount } = req.body;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        const budget = await prisma.tripBudget.update({
            where: {
                tripId_category: {
                    tripId,
                    category: category as any,
                },
            },
            data: {
                ...(allocatedAmount !== undefined && { allocatedAmount }),
                ...(spentAmount !== undefined && { spentAmount }),
            },
        });

        return sendSuccess(res, budget, "Budget updated");
    })
);

export default router;
