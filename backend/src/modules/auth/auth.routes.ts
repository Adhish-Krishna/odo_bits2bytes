import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/db.config";
import { env } from "../../config/env.config";
import { sendSuccess, sendError } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import { registerSchema, loginSchema } from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware";

const router = Router();

// Generate tokens
const generateTokens = (userId: string, email: string, role: string) => {
    const accessToken = jwt.sign({ userId, email, role }, env.JWT_SECRET, {
        expiresIn: "15m",
    });

    const refreshToken = jwt.sign(
        { userId, email, role, type: "refresh" },
        env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
};

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account and returns JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: Email already registered
 */
router.post(
    "/register",
    validate(registerSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return sendError(res, "Email already registered", 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                language: true,
                currency: true,
                role: true,
                createdAt: true,
            },
        });

        const tokens = generateTokens(user.id, user.email, user.role);

        return sendSuccess(
            res,
            {
                user,
                ...tokens,
            },
            "Registration successful",
            201
        );
    })
);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     description: Authenticates user and returns JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post(
    "/login",
    validate(loginSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return sendError(res, "Invalid credentials", 401);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
            return sendError(res, "Invalid credentials", 401);
        }

        const tokens = generateTokens(user.id, user.email, user.role);

        return sendSuccess(res, {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                language: user.language,
                currency: user.currency,
                role: user.role,
            },
            ...tokens,
        });
    })
);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Returns new access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post(
    "/refresh",
    asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return sendError(res, "Refresh token required", 400);
        }

        try {
            const decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as {
                userId: string;
                email: string;
                role: string;
                type: string;
            };

            if (decoded.type !== "refresh") {
                return sendError(res, "Invalid token type", 401);
            }

            // Verify user still exists
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
            });

            if (!user) {
                return sendError(res, "User not found", 401);
            }

            const tokens = generateTokens(user.id, user.email, user.role);

            return sendSuccess(res, tokens);
        } catch (error) {
            return sendError(res, "Invalid refresh token", 401);
        }
    })
);

// POST /auth/logout (just for client-side token invalidation acknowledgment)
router.post(
    "/logout",
    authMiddleware,
    asyncHandler(async (req: AuthRequest, res: Response) => {
        // In a production app, you might want to blacklist the token
        // For now, we just acknowledge the logout
        return sendSuccess(res, null, "Logged out successfully");
    })
);

export default router;
