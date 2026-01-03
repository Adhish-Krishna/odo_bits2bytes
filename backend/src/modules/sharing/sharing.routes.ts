import { Router, Response } from "express";
import { randomBytes } from "crypto";
import prisma from "../../config/db.config";
import { sendSuccess, sendError } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import { createShareSchema } from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import {
    authMiddleware,
    optionalAuthMiddleware,
    AuthRequest,
} from "../../middleware/auth.middleware";

const router = Router();

// Types for shared trip copy operation
interface ItineraryWithActivities {
    cityId: string;
    dayNumber: number;
    date: Date;
    notes: string | null;
    orderIndex: number;
    activities: Array<{
        activityId: string;
        startTime: Date;
        endTime: Date;
        customNotes: string | null;
        customCost: any;
        orderIndex: number;
    }>;
}

interface TripBudgetData {
    category: string;
    allocatedAmount: any;
}

// POST /trips/:tripId/share - Generate share link
router.post(
    "/trips/:tripId/share",
    authMiddleware,
    validate(createShareSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;
        const { permission, sharedWithEmail, expiresInDays } = req.body;

        // Verify ownership
        const trip = await prisma.trip.findFirst({
            where: { id: tripId, userId: req.user!.id },
        });

        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        let sharedWithId: string | null = null;

        // If sharing with specific user
        if (sharedWithEmail) {
            const sharedUser = await prisma.user.findUnique({
                where: { email: sharedWithEmail },
            });

            if (!sharedUser) {
                return sendError(res, "User not found", 404);
            }

            sharedWithId = sharedUser.id;
        }

        // Generate public slug
        const publicSlug = randomBytes(8).toString("hex");

        // Calculate expiration
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;

        const share = await prisma.sharedTrip.create({
            data: {
                tripId,
                sharedById: req.user!.id,
                sharedWithId,
                publicSlug,
                permission: permission || "VIEW_ONLY",
                expiresAt,
            },
        });

        return sendSuccess(
            res,
            {
                ...share,
                shareUrl: `/shared/${publicSlug}`,
            },
            "Share link created",
            201
        );
    })
);

// GET /shared/:slug - View shared trip (public)
router.get(
    "/:slug",
    optionalAuthMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { slug } = req.params;

        const share = await prisma.sharedTrip.findUnique({
            where: { publicSlug: slug },
            include: {
                trip: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatarUrl: true },
                        },
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
                    },
                },
                sharedBy: {
                    select: { id: true, name: true, avatarUrl: true },
                },
            },
        });

        if (!share) {
            return sendError(res, "Shared trip not found", 404);
        }

        // Check expiration
        if (share.expiresAt && new Date() > share.expiresAt) {
            return sendError(res, "Share link has expired", 410);
        }

        // If shared with specific user, verify
        if (share.sharedWithId && req.user?.id !== share.sharedWithId) {
            return sendError(res, "Not authorized to view this trip", 403);
        }

        return sendSuccess(res, {
            trip: share.trip,
            sharedBy: share.sharedBy,
            permission: share.permission,
            canCopy: share.permission !== "VIEW_ONLY" || req.user !== undefined,
        });
    })
);

// POST /shared/:slug/copy - Copy shared trip to my trips
router.post(
    "/:slug/copy",
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { slug } = req.params;

        const share = await prisma.sharedTrip.findUnique({
            where: { publicSlug: slug },
            include: {
                trip: {
                    include: {
                        itineraries: {
                            include: { activities: true },
                        },
                        budgets: true,
                    },
                },
            },
        });

        if (!share) {
            return sendError(res, "Shared trip not found", 404);
        }

        // Check if copy permission
        if (share.permission === "VIEW_ONLY") {
            return sendError(res, "Copy not allowed for this share", 403);
        }

        // Create copy
        const newTrip = await prisma.trip.create({
            data: {
                userId: req.user!.id,
                name: `${share.trip.name} (Copied)`,
                description: share.trip.description,
                startDate: share.trip.startDate,
                endDate: share.trip.endDate,
                totalBudget: share.trip.totalBudget,
                coverPhotoUrl: share.trip.coverPhotoUrl,
                status: "DRAFT",
                itineraries: {
                    create: (share.trip.itineraries as ItineraryWithActivities[]).map(
                        (it) => ({
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
                        })
                    ),
                },
                budgets: {
                    create: (share.trip.budgets as TripBudgetData[]).map((b) => ({
                        category: b.category as any,
                        allocatedAmount: b.allocatedAmount,
                        spentAmount: 0,
                    })),
                },
            },
        });

        return sendSuccess(res, newTrip, "Trip copied successfully", 201);
    })
);

// DELETE /trips/:tripId/share/:shareId - Revoke share
router.delete(
    "/trips/:tripId/share/:shareId",
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, shareId } = req.params;

        // Verify ownership
        const trip = await prisma.trip.findFirst({
            where: { id: tripId, userId: req.user!.id },
        });

        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        await prisma.sharedTrip.delete({
            where: { id: shareId },
        });

        return sendSuccess(res, null, "Share revoked");
    })
);

// GET /trips/:tripId/shares - List all shares for a trip
router.get(
    "/trips/:tripId/shares",
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;

        // Verify ownership
        const trip = await prisma.trip.findFirst({
            where: { id: tripId, userId: req.user!.id },
        });

        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        const shares = await prisma.sharedTrip.findMany({
            where: { tripId },
            include: {
                sharedWith: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
            },
        });

        return sendSuccess(res, shares);
    })
);

export default router;
