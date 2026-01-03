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

const router = Router({ mergeParams: true }); // Access :tripId from parent router

// All routes require authentication
router.use(authMiddleware);

// Helper to verify trip ownership
const verifyTripOwnership = async (tripId: string, userId: string) => {
    const trip = await prisma.trip.findFirst({
        where: { id: tripId, userId },
    });
    return trip;
};

// GET /trips/:tripId/itinerary - Get full itinerary
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

// POST /trips/:tripId/itinerary/days - Add a day/stop
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

        // Check if city exists
        const city = await prisma.city.findUnique({ where: { id: cityId } });
        if (!city) {
            return sendError(res, "City not found", 404);
        }

        // Check if day number already exists
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

// PATCH /trips/:tripId/itinerary/days/:dayId - Update day
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

// DELETE /trips/:tripId/itinerary/days/:dayId - Remove day
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

// POST /trips/:tripId/itinerary/days/:dayId/activities - Add activity to day
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

        // Verify day exists
        const day = await prisma.itinerary.findUnique({ where: { id: dayId } });
        if (!day) {
            return sendError(res, "Day not found", 404);
        }

        // Verify activity exists
        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
        });
        if (!activity) {
            return sendError(res, "Activity not found", 404);
        }

        // Get current max order index
        const maxOrder = await prisma.itineraryActivity.findFirst({
            where: { itineraryId: dayId },
            orderBy: { orderIndex: "desc" },
        });

        // Parse time strings to Date objects (using a base date)
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

// PATCH /trips/:tripId/itinerary/activities/:activityId - Update scheduled activity
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

// DELETE /trips/:tripId/itinerary/activities/:activityId - Remove activity
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

// PATCH /trips/:tripId/itinerary/reorder - Reorder days/activities
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

        // Reorder days
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

        // Reorder activities
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
