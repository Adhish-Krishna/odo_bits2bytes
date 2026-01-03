import { Router, Response } from "express";
import prisma from "../../config/db.config";
import { sendSuccess, sendError } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import {
    addItineraryDaySchema,
    addItineraryActivitySchema,
} from "../../utils/validation.util";
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
 * /api/v1/trips/{tripId}/itinerary:
 *   get:
 *     tags: [Itinerary]
 *     summary: Get full itinerary
 *     description: Returns the complete day-by-day itinerary for a trip
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
 *         description: Full itinerary with days and activities
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

        const itinerary = await prisma.itinerary.findMany({
            where: { tripId },
            include: {
                city: true,
                activities: {
                    include: { activity: true },
                    orderBy: { startTime: "asc" },
                },
            },
            orderBy: { dayNumber: "asc" },
        });

        return sendSuccess(res, itinerary);
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/itinerary/days:
 *   post:
 *     tags: [Itinerary]
 *     summary: Add a day to itinerary
 *     description: Creates a new day/stop in the trip itinerary
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
 *             required: [cityId, dayNumber, date]
 *             properties:
 *               cityId:
 *                 type: string
 *                 format: uuid
 *               dayNumber:
 *                 type: integer
 *                 example: 1
 *               date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Day added successfully
 *       404:
 *         description: Trip or city not found
 *       409:
 *         description: Day number already exists
 */
router.post(
    "/days",
    validate(addItineraryDaySchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;
        const { cityId, dayNumber, date, notes } = req.body;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        const city = await prisma.city.findUnique({ where: { id: cityId } });
        if (!city) {
            return sendError(res, "City not found", 404);
        }

        const existingDay = await prisma.itinerary.findUnique({
            where: { tripId_dayNumber: { tripId, dayNumber } },
        });

        if (existingDay) {
            return sendError(res, "Day number already exists", 409);
        }

        const day = await prisma.itinerary.create({
            data: {
                tripId,
                cityId,
                dayNumber,
                date,
                notes,
            },
            include: { city: true },
        });

        return sendSuccess(res, day, "Day added", 201);
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/itinerary/days/{dayId}:
 *   patch:
 *     tags: [Itinerary]
 *     summary: Update a day
 *     description: Updates day properties (city, date, notes)
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
 *         name: dayId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cityId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Day updated
 *       404:
 *         description: Trip not found
 */
router.patch(
    "/days/:dayId",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, dayId } = req.params;
        const { cityId, date, notes } = req.body;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        const day = await prisma.itinerary.update({
            where: { id: dayId },
            data: {
                ...(cityId && { cityId }),
                ...(date && { date: new Date(date) }),
                ...(notes !== undefined && { notes }),
            },
            include: { city: true },
        });

        return sendSuccess(res, day, "Day updated");
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/itinerary/days/{dayId}:
 *   delete:
 *     tags: [Itinerary]
 *     summary: Remove a day
 *     description: Deletes a day and all its activities from the itinerary
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
 *         name: dayId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Day removed
 *       404:
 *         description: Trip not found
 */
router.delete(
    "/days/:dayId",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, dayId } = req.params;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        await prisma.itinerary.delete({ where: { id: dayId } });

        return sendSuccess(res, null, "Day removed");
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/itinerary/days/{dayId}/activities:
 *   post:
 *     tags: [Itinerary]
 *     summary: Add activity to day
 *     description: Schedules an activity for a specific day in the itinerary
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
 *         name: dayId
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
 *             required: [activityId, startTime, endTime]
 *             properties:
 *               activityId:
 *                 type: string
 *                 format: uuid
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "12:00"
 *               customNotes:
 *                 type: string
 *               customCost:
 *                 type: number
 *     responses:
 *       201:
 *         description: Activity added to day
 *       404:
 *         description: Trip, day, or activity not found
 */
router.post(
    "/days/:dayId/activities",
    validate(addItineraryActivitySchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, dayId } = req.params;
        const { activityId, startTime, endTime, customNotes, customCost } = req.body;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        const day = await prisma.itinerary.findUnique({ where: { id: dayId } });
        if (!day) {
            return sendError(res, "Day not found", 404);
        }

        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
        });
        if (!activity) {
            return sendError(res, "Activity not found", 404);
        }

        const maxOrder = await prisma.itineraryActivity.findFirst({
            where: { itineraryId: dayId },
            orderBy: { orderIndex: "desc" },
        });

        const baseDate = new Date("2000-01-01");
        const parseTime = (time: string) => {
            const [hours, minutes] = time.split(":").map(Number);
            const date = new Date(baseDate);
            date.setHours(hours, minutes, 0, 0);
            return date;
        };

        const itineraryActivity = await prisma.itineraryActivity.create({
            data: {
                itineraryId: dayId,
                activityId,
                startTime: parseTime(startTime),
                endTime: parseTime(endTime),
                customNotes,
                customCost,
                orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
            },
            include: { activity: true },
        });

        return sendSuccess(res, itineraryActivity, "Activity added", 201);
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/itinerary/activities/{activityId}:
 *   patch:
 *     tags: [Itinerary]
 *     summary: Update scheduled activity
 *     description: Updates time, notes, or cost for a scheduled activity
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
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               endTime:
 *                 type: string
 *                 example: "13:00"
 *               customNotes:
 *                 type: string
 *               customCost:
 *                 type: number
 *               orderIndex:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Activity updated
 *       404:
 *         description: Trip not found
 */
router.patch(
    "/activities/:activityId",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, activityId } = req.params;
        const { startTime, endTime, customNotes, customCost, orderIndex } = req.body;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        const baseDate = new Date("2000-01-01");
        const parseTime = (time: string) => {
            const [hours, minutes] = time.split(":").map(Number);
            const date = new Date(baseDate);
            date.setHours(hours, minutes, 0, 0);
            return date;
        };

        const itineraryActivity = await prisma.itineraryActivity.update({
            where: { id: activityId },
            data: {
                ...(startTime && { startTime: parseTime(startTime) }),
                ...(endTime && { endTime: parseTime(endTime) }),
                ...(customNotes !== undefined && { customNotes }),
                ...(customCost !== undefined && { customCost }),
                ...(orderIndex !== undefined && { orderIndex }),
            },
            include: { activity: true },
        });

        return sendSuccess(res, itineraryActivity, "Activity updated");
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/itinerary/activities/{activityId}:
 *   delete:
 *     tags: [Itinerary]
 *     summary: Remove activity from itinerary
 *     description: Removes a scheduled activity from a day
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
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Activity removed
 *       404:
 *         description: Trip not found
 */
router.delete(
    "/activities/:activityId",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, activityId } = req.params;

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        await prisma.itineraryActivity.delete({ where: { id: activityId } });

        return sendSuccess(res, null, "Activity removed");
    })
);

/**
 * @openapi
 * /api/v1/trips/{tripId}/itinerary/reorder:
 *   patch:
 *     tags: [Itinerary]
 *     summary: Reorder days and activities
 *     description: Updates the order of days or activities in the itinerary
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderIndex:
 *                       type: integer
 *               activities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     orderIndex:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Reorder complete
 *       404:
 *         description: Trip not found
 */
router.patch(
    "/reorder",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;
        const { days, activities } = req.body as {
            days?: { id: string; orderIndex: number }[];
            activities?: { id: string; orderIndex: number }[];
        };

        const trip = await verifyTripOwnership(tripId, req.user!.id);
        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        if (days?.length) {
            await Promise.all(
                days.map((d) =>
                    prisma.itinerary.update({
                        where: { id: d.id },
                        data: { orderIndex: d.orderIndex },
                    })
                )
            );
        }

        if (activities?.length) {
            await Promise.all(
                activities.map((a) =>
                    prisma.itineraryActivity.update({
                        where: { id: a.id },
                        data: { orderIndex: a.orderIndex },
                    })
                )
            );
        }

        return sendSuccess(res, null, "Reorder complete");
    })
);

export default router;
