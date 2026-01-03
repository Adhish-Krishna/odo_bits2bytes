import { Router, Response } from "express";
import { streamText } from "ai";
import { geminiModel, TRAVEL_AI_SYSTEM_PROMPT } from "../../config/ai.config";
import prisma from "../../config/db.config";
import { sendError } from "../../utils/response.util";
import { validate } from "../../middleware/validate.middleware";
import {
    generateItinerarySchema,
    aiChatSchema,
} from "../../utils/validation.util";
import { asyncHandler } from "../../middleware/error.middleware";
import { authMiddleware, AuthRequest } from "../../middleware/auth.middleware";

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

// Helper to set SSE headers
const setSSEHeaders = (res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
};

// Type definitions for Prisma query results
interface ActivityData {
    name: string;
    estimatedCost: any;
    category: string;
    durationMinutes: number;
}

interface ItineraryActivityData {
    activity: ActivityData;
    customCost: any;
    startTime: Date;
    endTime: Date;
}

interface ItineraryData {
    city: { name: string };
    activities: ItineraryActivityData[];
}

interface BudgetData {
    category: string;
    allocatedAmount: any;
    spentAmount: any;
}

interface CityWithActivities {
    name: string;
    activities: ActivityData[];
}

interface DayWithCityAndActivities {
    city: CityWithActivities;
    activities: ItineraryActivityData[];
}

/**
 * @openapi
 * /api/v1/ai/generate-itinerary:
 *   post:
 *     tags: [AI]
 *     summary: Generate AI itinerary (SSE stream)
 *     description: |
 *       Uses AI to generate a complete travel itinerary based on a prompt.
 *       Returns a Server-Sent Events (SSE) stream with real-time AI response.
 *       
 *       **SSE Event Types:**
 *       - `thinking` - AI is processing
 *       - `content` - Partial response content
 *       - `done` - Generation complete
 *       - `error` - Error occurred
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateItineraryRequest'
 *     responses:
 *       200:
 *         description: SSE stream of AI-generated itinerary
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post(
    "/generate-itinerary",
    validate(generateItinerarySchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { prompt, preferences, saveToTripId } = req.body;

        setSSEHeaders(res);

        try {
            res.write(
                `data: ${JSON.stringify({ type: "thinking", content: "Analyzing your travel preferences..." })}\n\n`
            );

            const preferencesStr = preferences
                ? `
Travel Style: ${preferences.travelStyle || "balanced"}
Interests: ${preferences.interests?.join(", ") || "general"}
Budget Priority: ${preferences.budgetPriority || "balanced"}
Avoid Crowds: ${preferences.avoidCrowds ? "yes" : "no"}
`
                : "";

            const fullPrompt = `
Generate a detailed travel itinerary based on this request:
"${prompt}"

User Preferences:
${preferencesStr}

Please respond with a structured itinerary that includes:
1. Trip name
2. Day-by-day breakdown with:
   - City for each day
   - Activities with times and estimated costs
   - Meal recommendations
3. Total estimated cost
4. Helpful tips and insights

Format your response as a JSON object with this structure:
{
  "tripName": "...",
  "days": [
    {
      "dayNumber": 1,
      "city": {"name": "...", "country": "..."},
      "activities": [
        {"name": "...", "startTime": "09:00", "endTime": "12:00", "estimatedCost": 25, "category": "SIGHTSEEING", "description": "..."}
      ]
    }
  ],
  "totalEstimatedCost": 0,
  "insights": ["..."]
}
`;

            const { textStream } = await streamText({
                model: geminiModel,
                system: TRAVEL_AI_SYSTEM_PROMPT,
                prompt: fullPrompt,
            });

            for await (const chunk of textStream) {
                res.write(
                    `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
                );
            }

            res.write(
                `data: ${JSON.stringify({ type: "done", content: { saveToTripId } })}\n\n`
            );
            res.end();
        } catch (error) {
            console.error("AI generation error:", error);
            res.write(
                `data: ${JSON.stringify({ type: "error", content: "Failed to generate itinerary" })}\n\n`
            );
            res.end();
        }
    })
);

/**
 * @openapi
 * /api/v1/ai/suggest-activities:
 *   post:
 *     tags: [AI]
 *     summary: Get AI activity suggestions (SSE stream)
 *     description: |
 *       AI suggests activities for a city based on preferences and existing plans.
 *       Returns SSE stream with suggestions.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cityId]
 *             properties:
 *               cityId:
 *                 type: string
 *                 format: uuid
 *               existingActivities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs of already planned activities
 *               preferences:
 *                 type: object
 *                 properties:
 *                   budget:
 *                     type: number
 *                   interests:
 *                     type: array
 *                     items:
 *                       type: string
 *               timeSlot:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                   end:
 *                     type: string
 *     responses:
 *       200:
 *         description: SSE stream of activity suggestions
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post(
    "/suggest-activities",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { cityId, existingActivities, preferences, timeSlot } = req.body;

        setSSEHeaders(res);

        try {
            const city = await prisma.city.findUnique({
                where: { id: cityId },
                include: { activities: { take: 50 } },
            });

            if (!city) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", content: "City not found" })}\n\n`
                );
                res.end();
                return;
            }

            const existingNames = existingActivities?.length
                ? (
                    await prisma.activity.findMany({
                        where: { id: { in: existingActivities } },
                        select: { name: true },
                    })
                ).map((a: { name: string }) => a.name)
                : [];

            const prompt = `
Suggest activities in ${city.name}, ${city.country} for a traveler.

Time slot: ${timeSlot?.start || "flexible"} to ${timeSlot?.end || "flexible"}
Budget per activity: $${preferences?.budget || "any"}
Interests: ${preferences?.interests?.join(", ") || "general"}
Already planned: ${existingNames.join(", ") || "none"}

Available activities in our database:
${city.activities.map((a: ActivityData) => `- ${a.name} ($${a.estimatedCost}, ${a.category}, ${a.durationMinutes}min)`).join("\n")}

Suggest 3-5 activities that would fit well, explaining why each is a good choice.
Format as JSON array: [{"name": "...", "reason": "...", "fitScore": 0.95}]
`;

            res.write(
                `data: ${JSON.stringify({ type: "thinking", content: "Finding the best activities for you..." })}\n\n`
            );

            const { textStream } = await streamText({
                model: geminiModel,
                system: TRAVEL_AI_SYSTEM_PROMPT,
                prompt,
            });

            for await (const chunk of textStream) {
                res.write(
                    `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
                );
            }

            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
        } catch (error) {
            console.error("AI suggestion error:", error);
            res.write(
                `data: ${JSON.stringify({ type: "error", content: "Failed to suggest activities" })}\n\n`
            );
            res.end();
        }
    })
);

/**
 * @openapi
 * /api/v1/ai/optimize-route:
 *   post:
 *     tags: [AI]
 *     summary: Optimize day's route (SSE stream)
 *     description: |
 *       AI analyzes activities for a day and suggests optimal ordering
 *       to minimize travel time and improve experience.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itineraryDayId]
 *             properties:
 *               itineraryDayId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: SSE stream with route optimization
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post(
    "/optimize-route",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { itineraryDayId } = req.body;

        setSSEHeaders(res);

        try {
            const day = await prisma.itinerary.findUnique({
                where: { id: itineraryDayId },
                include: {
                    city: true,
                    activities: {
                        include: { activity: true },
                    },
                },
            });

            if (!day) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", content: "Day not found" })}\n\n`
                );
                res.end();
                return;
            }

            const prompt = `
Optimize the order of these activities in ${day.city.name} for minimal travel time and best experience:

${day.activities.map((a: ItineraryActivityData, i: number) => `${i + 1}. ${a.activity.name} (${a.activity.category}, ${a.activity.durationMinutes}min)`).join("\n")}

Consider:
- Geographic proximity
- Opening hours and best times to visit
- Logical flow (e.g., breakfast before sightseeing)
- Energy levels throughout the day

Respond with JSON: {"optimizedOrder": ["activity-name-1", "activity-name-2"], "timeSavedMinutes": 30, "reasoning": "..."}
`;

            res.write(
                `data: ${JSON.stringify({ type: "thinking", content: "Analyzing optimal route..." })}\n\n`
            );

            const { textStream } = await streamText({
                model: geminiModel,
                system: TRAVEL_AI_SYSTEM_PROMPT,
                prompt,
            });

            for await (const chunk of textStream) {
                res.write(
                    `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
                );
            }

            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
        } catch (error) {
            console.error("AI optimization error:", error);
            res.write(
                `data: ${JSON.stringify({ type: "error", content: "Failed to optimize route" })}\n\n`
            );
            res.end();
        }
    })
);

/**
 * @openapi
 * /api/v1/ai/budget-advisor:
 *   post:
 *     tags: [AI]
 *     summary: Get AI budget advice (SSE stream)
 *     description: |
 *       AI analyzes trip budget and provides recommendations for
 *       savings and optimal allocation.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId]
 *             properties:
 *               tripId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: SSE stream with budget analysis
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post(
    "/budget-advisor",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId } = req.body;

        setSSEHeaders(res);

        try {
            const trip = await prisma.trip.findFirst({
                where: { id: tripId, userId: req.user!.id },
                include: {
                    itineraries: {
                        include: {
                            city: true,
                            activities: { include: { activity: true } },
                        },
                    },
                    budgets: true,
                },
            });

            if (!trip) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", content: "Trip not found" })}\n\n`
                );
                res.end();
                return;
            }

            const totalBudget = trip.totalBudget ? Number(trip.totalBudget) : "not set";
            const activityCosts = (trip.itineraries as ItineraryData[]).flatMap(
                (it) =>
                    it.activities.map((a: ItineraryActivityData) => ({
                        name: a.activity.name,
                        cost: a.customCost
                            ? Number(a.customCost)
                            : Number(a.activity.estimatedCost),
                        city: it.city.name,
                    }))
            );

            const prompt = `
Analyze this trip budget and provide advice:

Trip: ${trip.name}
Total Budget: $${totalBudget}
Duration: ${trip.itineraries.length} days

Planned Activities:
${activityCosts.map((a: { name: string; city: string; cost: number }) => `- ${a.name} in ${a.city}: $${a.cost}`).join("\n")}

Budget Allocations:
${(trip.budgets as BudgetData[]).map((b) => `- ${b.category}: $${b.allocatedAmount} allocated, $${b.spentAmount} spent`).join("\n")}

Please provide:
1. Budget health assessment
2. Areas where they might save money
3. Suggestions for budget reallocation
4. Tips for the destinations they're visiting

Format as JSON: {"healthScore": 85, "assessment": "...", "savingTips": ["..."], "recommendations": ["..."]}
`;

            res.write(
                `data: ${JSON.stringify({ type: "thinking", content: "Analyzing your budget..." })}\n\n`
            );

            const { textStream } = await streamText({
                model: geminiModel,
                system: TRAVEL_AI_SYSTEM_PROMPT,
                prompt,
            });

            for await (const chunk of textStream) {
                res.write(
                    `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
                );
            }

            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
        } catch (error) {
            console.error("AI budget error:", error);
            res.write(
                `data: ${JSON.stringify({ type: "error", content: "Failed to analyze budget" })}\n\n`
            );
            res.end();
        }
    })
);

/**
 * @openapi
 * /api/v1/ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Chat with travel assistant (SSE stream)
 *     description: |
 *       Interactive chat with an AI travel assistant.
 *       Supports conversation context and trip-specific queries.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *               tripContext:
 *                 type: object
 *                 properties:
 *                   tripId:
 *                     type: string
 *                     format: uuid
 *     responses:
 *       200:
 *         description: SSE stream of chat response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post(
    "/chat",
    validate(aiChatSchema),
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { messages, tripContext } = req.body;

        setSSEHeaders(res);

        try {
            let contextInfo = "";

            if (tripContext?.tripId) {
                const trip = await prisma.trip.findFirst({
                    where: { id: tripContext.tripId, userId: req.user!.id },
                    include: {
                        itineraries: {
                            include: { city: true, activities: { include: { activity: true } } },
                        },
                    },
                });

                if (trip) {
                    contextInfo = `
Current Trip Context:
- Trip: ${trip.name}
- Dates: ${trip.startDate.toDateString()} to ${trip.endDate.toDateString()}
- Cities: ${(trip.itineraries as Array<{ city: { name: string } }>).map((it) => it.city.name).join(", ")}
- Budget: $${trip.totalBudget || "not set"}
`;
                }
            }

            const formattedMessages = (
                messages as Array<{ role: string; content: string }>
            ).map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            }));

            const systemPrompt =
                TRAVEL_AI_SYSTEM_PROMPT + (contextInfo ? `\n\n${contextInfo}` : "");

            const { textStream } = await streamText({
                model: geminiModel,
                system: systemPrompt,
                messages: formattedMessages,
            });

            for await (const chunk of textStream) {
                res.write(
                    `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
                );
            }

            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
        } catch (error) {
            console.error("AI chat error:", error);
            res.write(
                `data: ${JSON.stringify({ type: "error", content: "Chat failed" })}\n\n`
            );
            res.end();
        }
    })
);

/**
 * @openapi
 * /api/v1/ai/enhance-day:
 *   post:
 *     tags: [AI]
 *     summary: AI enhance day itinerary (SSE stream)
 *     description: |
 *       AI fills gaps in a manually created day's schedule,
 *       suggesting activities based on user instructions.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tripId, dayId, instruction]
 *             properties:
 *               tripId:
 *                 type: string
 *                 format: uuid
 *               dayId:
 *                 type: string
 *                 format: uuid
 *               instruction:
 *                 type: string
 *                 example: Add some evening activities and a nice dinner spot
 *     responses:
 *       200:
 *         description: SSE stream with enhancement suggestions
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.post(
    "/enhance-day",
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const { tripId, dayId, instruction } = req.body;

        setSSEHeaders(res);

        try {
            const trip = await prisma.trip.findFirst({
                where: { id: tripId, userId: req.user!.id },
            });

            if (!trip) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", content: "Trip not found" })}\n\n`
                );
                res.end();
                return;
            }

            const day = (await prisma.itinerary.findUnique({
                where: { id: dayId },
                include: {
                    city: { include: { activities: true } },
                    activities: { include: { activity: true }, orderBy: { startTime: "asc" } },
                },
            })) as DayWithCityAndActivities | null;

            if (!day) {
                res.write(
                    `data: ${JSON.stringify({ type: "error", content: "Day not found" })}\n\n`
                );
                res.end();
                return;
            }

            const existingSchedule = day.activities
                .map(
                    (a: ItineraryActivityData) =>
                        `${a.startTime.toISOString().slice(11, 16)}-${a.endTime.toISOString().slice(11, 16)}: ${a.activity.name}`
                )
                .join("\n");

            const prompt = `
Help enhance this day's itinerary in ${day.city.name}:

Current Schedule:
${existingSchedule || "Empty - no activities planned yet"}

User's Request: "${instruction}"

Available activities in ${day.city.name}:
${day.city.activities.slice(0, 20).map((a: ActivityData) => `- ${a.name} ($${a.estimatedCost}, ${a.category}, ${a.durationMinutes}min)`).join("\n")}

Suggest specific activities with times to add. Format as JSON array:
[{"name": "...", "startTime": "14:00", "endTime": "16:00", "reason": "..."}]
`;

            res.write(
                `data: ${JSON.stringify({ type: "thinking", content: "Enhancing your day..." })}\n\n`
            );

            const { textStream } = await streamText({
                model: geminiModel,
                system: TRAVEL_AI_SYSTEM_PROMPT,
                prompt,
            });

            for await (const chunk of textStream) {
                res.write(
                    `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
                );
            }

            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
        } catch (error) {
            console.error("AI enhance error:", error);
            res.write(
                `data: ${JSON.stringify({ type: "error", content: "Failed to enhance day" })}\n\n`
            );
            res.end();
        }
    })
);

export default router;
