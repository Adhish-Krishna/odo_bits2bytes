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

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
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

/**
 * @openapi
 * /api/v1/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: Updates the authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *               language:
 *                 type: string
 *                 example: en
 *               currency:
 *                 type: string
 *                 example: USD
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @openapi
 * /api/v1/users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user account
 *     description: Permanently deletes the authenticated user's account and all associated data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete(
    "/me",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        await prisma.user.delete({
            where: { id: req.user!.id },
        });

        return sendSuccess(res, null, "Account deleted");
    })
);

/**
 * @openapi
 * /api/v1/users/me/saved-cities:
 *   get:
 *     tags: [Users]
 *     summary: Get saved cities
 *     description: Returns the user's list of saved/wishlisted cities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/City'
 */
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

/**
 * @openapi
 * /api/v1/users/me/saved-cities/{cityId}:
 *   post:
 *     tags: [Users]
 *     summary: Save a city
 *     description: Adds a city to the user's wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The city ID to save
 *     responses:
 *       201:
 *         description: City saved successfully
 *       404:
 *         description: City not found
 *       409:
 *         description: City already saved
 */
router.post(
    "/me/saved-cities/:cityId",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { cityId } = req.params;

        const city = await prisma.city.findUnique({
            where: { id: cityId },
        });

        if (!city) {
            return sendError(res, "City not found", 404);
        }

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

/**
 * @openapi
 * /api/v1/users/me/saved-cities/{cityId}:
 *   delete:
 *     tags: [Users]
 *     summary: Remove saved city
 *     description: Removes a city from the user's wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The city ID to remove
 *     responses:
 *       200:
 *         description: City removed from saved
 */
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
