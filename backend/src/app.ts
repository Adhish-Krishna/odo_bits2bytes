import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.config";
import { swaggerSpec } from "./config/swagger.config";
import { errorMiddleware, notFoundHandler } from "./middleware/error.middleware";

// Import routes
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import tripRoutes from "./modules/trips/trips.routes";
import itineraryRoutes from "./modules/itinerary/itinerary.routes";
import cityRoutes from "./modules/cities/cities.routes";
import activityRoutes from "./modules/activities/activities.routes";
import budgetRoutes from "./modules/budget/budget.routes";
import sharingRoutes from "./modules/sharing/sharing.routes";
import aiRoutes from "./modules/ai/ai.routes";

const app: Express = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for SSE and Swagger UI
}));

// CORS
app.use(cors({
    origin: env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",")
        : "*",
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Globe Trotter API Docs",
}));

// Serve OpenAPI spec as JSON
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// Health check
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server health status
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
const API_PREFIX = "/api/v1";

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/trips`, tripRoutes);
app.use(`${API_PREFIX}/trips/:tripId/itinerary`, itineraryRoutes);
app.use(`${API_PREFIX}/trips/:tripId/budget`, budgetRoutes);
app.use(`${API_PREFIX}/cities`, cityRoutes);
app.use(`${API_PREFIX}/activities`, activityRoutes);
app.use(`${API_PREFIX}/sharing`, sharingRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorMiddleware);

export default app;
