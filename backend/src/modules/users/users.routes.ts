import { Router, Response } from "express";
import prisma from "../../config/db.config";
import { sendSuccess, sendError } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import { updateProfileSchema } from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /users/me - Get current user profile
router.get(
    "/me",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                language: true,
                currency: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        trips: true,
                        savedCities: true,
                    },
                },
            },
        });

        if (!user) {
            return sendError(res, "User not found", 404);
        }

        return sendSuccess(res, user);
    })
);

// PATCH /users/me - Update profile
router.patch(
    "/me",
    validate(updateProfileSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { name, avatarUrl, language, currency } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: {
                ...(name && { name }),
                ...(avatarUrl && { avatarUrl }),
                ...(language && { language }),
                ...(currency && { currency }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                language: true,
                currency: true,
                role: true,
            },
        });

        return sendSuccess(res, user, "Profile updated");
    })
);

// DELETE /users/me - Delete account
router.delete(
    "/me",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        await prisma.user.delete({
            where: { id: req.user!.id },
        });

        return sendSuccess(res, null, "Account deleted");
    })
);

// GET /users/me/saved-cities - Get saved cities
router.get(
    "/me/saved-cities",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const savedCities = await prisma.savedCity.findMany({
            where: { userId: req.user!.id },
            include: {
                city: true,
            },
            orderBy: { savedAt: "desc" },
        });

        return sendSuccess(
            res,
            savedCities.map((sc: { city: unknown }) => sc.city)
        );
    })
);

// POST /users/me/saved-cities/:cityId - Save a city
router.post(
    "/me/saved-cities/:cityId",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { cityId } = req.params;

        // Check if city exists
        const city = await prisma.city.findUnique({
            where: { id: cityId },
        });

        if (!city) {
            return sendError(res, "City not found", 404);
        }

        // Check if already saved
        const existing = await prisma.savedCity.findUnique({
            where: {
                userId_cityId: {
                    userId: req.user!.id,
                    cityId,
                },
            },
        });

        if (existing) {
            return sendError(res, "City already saved", 409);
        }

        await prisma.savedCity.create({
            data: {
                userId: req.user!.id,
                cityId,
            },
        });

        return sendSuccess(res, null, "City saved", 201);
    })
);

// DELETE /users/me/saved-cities/:cityId - Remove saved city
router.delete(
    "/me/saved-cities/:cityId",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { cityId } = req.params;

        await prisma.savedCity.deleteMany({
            where: {
                userId: req.user!.id,
                cityId,
            },
        });

        return sendSuccess(res, null, "City removed from saved");
    })
);

export default router;
