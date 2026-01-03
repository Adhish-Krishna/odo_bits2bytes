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

/**
 * @openapi
 * /api/v1/trips:
 *   get:
 *     tags: [Trips]
 *     summary: List all user's trips
 *     description: Returns a paginated list of the authenticated user's trips
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PLANNING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Paginated list of trips
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
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

/**
 * @openapi
 * /api/v1/trips:
 *   post:
 *     tags: [Trips]
 *     summary: Create a new trip
 *     description: Creates a new trip for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTripRequest'
 *     responses:
 *       201:
 *         description: Trip created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Trip'
 *       400:
 *         description: Validation error
 */
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

/**
 * @openapi
 * /api/v1/trips/{id}:
 *   get:
 *     tags: [Trips]
 *     summary: Get trip details
 *     description: Returns detailed information about a specific trip including itineraries and budgets
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
 *         description: Trip details
 *       404:
 *         description: Trip not found
 */
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

/**
 * @openapi
 * /api/v1/trips/{id}/full:
 *   get:
 *     tags: [Trips]
 *     summary: Get full trip with all details
 *     description: Returns complete trip information including itineraries, activities, budgets, and shares
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
 *         description: Full trip details
 *       404:
 *         description: Trip not found
 */
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

/**
 * @openapi
 * /api/v1/trips/{id}:
 *   patch:
 *     tags: [Trips]
 *     summary: Update a trip
 *     description: Updates trip properties (name, dates, budget, status, etc.)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               totalBudget:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PLANNING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       404:
 *         description: Trip not found
 */
router.patch(
    "/:id",
    validate(updateTripSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

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

/**
 * @openapi
 * /api/v1/trips/{id}:
 *   delete:
 *     tags: [Trips]
 *     summary: Delete a trip
 *     description: Permanently deletes a trip and all associated data
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
 *         description: Trip deleted successfully
 *       404:
 *         description: Trip not found
 */
router.delete(
    "/:id",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { id } = req.params;

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

/**
 * @openapi
 * /api/v1/trips/{id}/duplicate:
 *   post:
 *     tags: [Trips]
 *     summary: Duplicate a trip
 *     description: Creates a copy of an existing trip including all itineraries and activities
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
 *       201:
 *         description: Trip duplicated successfully
 *       404:
 *         description: Trip not found
 */
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
