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

/**
 * @openapi
 * /api/v1/sharing/trips/{tripId}/share:
 *   post:
 *     tags: [Sharing]
 *     summary: Create share link for a trip
 *     description: Generates a public share link or shares with a specific user
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
 *               permission:
 *                 type: string
 *                 enum: [VIEW_ONLY, CAN_EDIT, CAN_COPY]
 *                 default: VIEW_ONLY
 *               sharedWithEmail:
 *                 type: string
 *                 format: email
 *                 description: Optional - share with specific user
 *               expiresInDays:
 *                 type: integer
 *                 description: Optional - days until link expires
 *     responses:
 *       201:
 *         description: Share link created
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
 *                     id:
 *                       type: string
 *                     publicSlug:
 *                       type: string
 *                     shareUrl:
 *                       type: string
 *                     permission:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Trip or user not found
 */
router.post(
    "/trips/:tripId/share",
    authMiddleware,
    validate(createShareSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;
        const { permission, sharedWithEmail, expiresInDays } = req.body;

        const trip = await prisma.trip.findFirst({
            where: { id: tripId, userId: req.user!.id },
        });

        if (!trip) {
            return sendError(res, "Trip not found", 404);
        }

        let sharedWithId: string | null = null;

        if (sharedWithEmail) {
            const sharedUser = await prisma.user.findUnique({
                where: { email: sharedWithEmail },
            });

            if (!sharedUser) {
                return sendError(res, "User not found", 404);
            }

            sharedWithId = sharedUser.id;
        }

        const publicSlug = randomBytes(8).toString("hex");

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

/**
 * @openapi
 * /api/v1/sharing/{slug}:
 *   get:
 *     tags: [Sharing]
 *     summary: View shared trip
 *     description: Returns trip details for a shared link. Authentication is optional - some shares may be public.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The public share slug
 *     responses:
 *       200:
 *         description: Shared trip details
 *       403:
 *         description: Not authorized to view this trip
 *       404:
 *         description: Shared trip not found
 *       410:
 *         description: Share link has expired
 */
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

        if (share.expiresAt && new Date() > share.expiresAt) {
            return sendError(res, "Share link has expired", 410);
        }

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

/**
 * @openapi
 * /api/v1/sharing/{slug}/copy:
 *   post:
 *     tags: [Sharing]
 *     summary: Copy shared trip to my trips
 *     description: Creates a copy of a shared trip in the authenticated user's account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Trip copied successfully
 *       403:
 *         description: Copy not allowed for this share
 *       404:
 *         description: Shared trip not found
 */
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

        if (share.permission === "VIEW_ONLY") {
            return sendError(res, "Copy not allowed for this share", 403);
        }

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

/**
 * @openapi
 * /api/v1/sharing/trips/{tripId}/share/{shareId}:
 *   delete:
 *     tags: [Sharing]
 *     summary: Revoke a share
 *     description: Removes a share link, preventing further access
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
 *         name: shareId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Share revoked
 *       404:
 *         description: Trip not found
 */
router.delete(
    "/trips/:tripId/share/:shareId",
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, shareId } = req.params;

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

/**
 * @openapi
 * /api/v1/sharing/trips/{tripId}/shares:
 *   get:
 *     tags: [Sharing]
 *     summary: List all shares for a trip
 *     description: Returns all active share links for a trip
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
 *         description: List of shares
 *       404:
 *         description: Trip not found
 */
router.get(
    "/trips/:tripId/shares",
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.params;

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
