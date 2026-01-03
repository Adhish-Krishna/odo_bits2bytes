import { Router, Response } from "express";
import prisma from "../../config/db.config";
import { sendSuccess, sendError, sendPaginated } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import {
    createTripSchema,
    updateTripSchema,
    paginationSchema,
} from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /trips - List all user's trips
router.get(
    "/",
    validate(paginationSchema, "query"),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { page, limit } = (req as any).validatedQuery;
        const status = req.query.status as string | undefined;

        const where = {
            userId: req.user!.id,
            ...(status && { status: status as any }),
        };

        const [trips, total] = await Promise.all([
            prisma.trip.findMany({
                where,
                include: {
                    itineraries: {
                        include: {
                            city: {
                                select: { id: true, name: true, country: true, imageUrl: true },
                            },
                        },
                        orderBy: { dayNumber: "asc" },
                    },
                    _count: {
                        select: { itineraries: true },
                    },
                },
                orderBy: { updatedAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.trip.count({ where }),
        ]);

        return sendPaginated(res, trips, page, limit, total);
    })
);

// POST /trips - Create new trip
router.post(
    "/",
    validate(createTripSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { name, description, startDate, endDate, totalBudget, coverPhotoUrl } =
            req.body;

        const trip = await prisma.trip.create({
            data: {
                userId: req.user!.id,
                name,
                description,
                startDate,
                endDate,
                totalBudget,
                coverPhotoUrl,
            },
        });

        return sendSuccess(res, trip, "Trip created", 201);
    })
);

// GET /trips/:id - Get trip details
router.get(
    "/:id",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const trip = await prisma.trip.findFirst({
            where: {
                id,
                userId: req.user!.id,
            },
            include: {
                itineraries: {
                    include: {
                        city: true,
                        activities: {
                            include: { activity: true },
                            orderBy: { orderIndex: "asc" },
                        },
                    },
                    orderBy: { dayNumber: "asc" },
                },
                budgets: true,
            },
        });

        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        return sendSuccess(res, trip);
    })
);

// GET /trips/:id/full - Get trip with full itinerary (same as above but explicit)
router.get(
    "/:id/full",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const trip = await prisma.trip.findFirst({
            where: {
                id,
                userId: req.user!.id,
            },
            include: {
                itineraries: {
                    include: {
                        city: true,
                        activities: {
                            include: { activity: true },
                            orderBy: { startTime: "asc" },
                        },
                    },
                    orderBy: { dayNumber: "asc" },
                },
                budgets: true,
                shares: true,
            },
        });

        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        return sendSuccess(res, trip);
    })
);

// PATCH /trips/:id - Update trip
router.patch(
    "/:id",
    validate(updateTripSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        // Verify ownership
        const existing = await prisma.trip.findFirst({
            where: { id, userId: req.user!.id },
        });

        if (!existing) {
            return sendError(res, "Trip not found", 404);
        }

        const trip = await prisma.trip.update({
            where: { id },
            data: req.body,
        });

        return sendSuccess(res, trip, "Trip updated");
    })
);

// DELETE /trips/:id - Delete trip
router.delete(
    "/:id",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        // Verify ownership
        const existing = await prisma.trip.findFirst({
            where: { id, userId: req.user!.id },
        });

        if (!existing) {
            return sendError(res, "Trip not found", 404);
        }

        await prisma.trip.delete({ where: { id } });

        return sendSuccess(res, null, "Trip deleted");
    })
);

// POST /trips/:id/duplicate - Duplicate a trip
router.post(
    "/:id/duplicate",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

        const original = await prisma.trip.findFirst({
            where: { id, userId: req.user!.id },
            include: {
                itineraries: {
                    include: {
                        activities: true,
                    },
                },
                budgets: true,
            },
        });

        if (!original) {
            return sendError(res, "Trip not found", 404);
        }

        // Create duplicate
        const newTrip = await prisma.trip.create({
            data: {
                userId: req.user!.id,
                name: `${original.name} (Copy)`,
                description: original.description,
                startDate: original.startDate,
                endDate: original.endDate,
                totalBudget: original.totalBudget,
                coverPhotoUrl: original.coverPhotoUrl,
                status: "DRAFT",
                itineraries: {
                    create: original.itineraries.map((it) => ({
                        cityId: it.cityId,
                        dayNumber: it.dayNumber,
                        date: it.date,
                        notes: it.notes,
                        orderIndex: it.orderIndex,
                        activities: {
                            create: it.activities.map((act) => ({
                                activityId: act.activityId,
                                startTime: act.startTime,
                                endTime: act.endTime,
                                customNotes: act.customNotes,
                                customCost: act.customCost,
                                orderIndex: act.orderIndex,
                            })),
                        },
                    })),
                },
                budgets: {
                    create: original.budgets.map((b) => ({
                        category: b.category,
                        allocatedAmount: b.allocatedAmount,
                        spentAmount: 0,
                    })),
                },
            },
            include: {
                itineraries: { include: { city: true } },
            },
        });

        return sendSuccess(res, newTrip, "Trip duplicated", 201);
    })
);

export default router;
