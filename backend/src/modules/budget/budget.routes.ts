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

// GET /trips/:tripId/budget - Get budget breakdown
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

        // Calculate totals with explicit types
        const totalAllocated = budgets.reduce(
            (sum: number, b) => sum + Number(b.allocatedAmount),
            0
        );
        const totalSpent = budgets.reduce(
            (sum: number, b) => sum + Number(b.spentAmount),
            0
        );

        // Calculate from itinerary activities
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

        // Format breakdown with percentages
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

        // Generate warnings
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

// POST /trips/:tripId/budget - Set budget allocations
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

        // Upsert each budget category
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

// PATCH /trips/:tripId/budget/:category - Update category budget/spending
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
