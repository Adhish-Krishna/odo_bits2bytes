import { z } from "zod";

// Auth schemas
export const registerSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

// Trip schemas
export const createTripSchema = z.object({
    name: z.string().min(1, "Trip name is required"),
    description: z.string().optional(),
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
    totalBudget: z.number().positive().optional(),
    coverPhotoUrl: z.string().url().optional(),
});

export const updateTripSchema = createTripSchema.partial();

// Itinerary schemas
export const addItineraryDaySchema = z.object({
    cityId: z.string().uuid("Invalid city ID"),
    dayNumber: z.number().int().positive("Day number must be positive"),
    date: z.string().transform((str) => new Date(str)),
    notes: z.string().optional(),
});

export const addItineraryActivitySchema = z.object({
    activityId: z.string().uuid("Invalid activity ID"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
    customNotes: z.string().optional(),
    customCost: z.number().positive().optional(),
});

// AI schemas
export const generateItinerarySchema = z.object({
    prompt: z.string().min(10, "Please provide more details about your trip"),
    preferences: z
        .object({
            travelStyle: z.enum(["relaxed", "packed", "balanced"]).optional(),
            interests: z.array(z.string()).optional(),
            budgetPriority: z
                .enum(["accommodation", "activities", "balanced"])
                .optional(),
            avoidCrowds: z.boolean().optional(),
        })
        .optional(),
    saveToTripId: z.string().uuid().optional(),
});

export const aiChatSchema = z.object({
    messages: z.array(
        z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
        })
    ),
    tripContext: z
        .object({
            tripId: z.string().uuid(),
        })
        .optional(),
});

// Budget schemas
export const setBudgetSchema = z.object({
    allocations: z.array(
        z.object({
            category: z.enum([
                "TRANSPORT",
                "ACCOMMODATION",
                "FOOD",
                "ACTIVITIES",
                "SHOPPING",
                "MISCELLANEOUS",
            ]),
            amount: z.number().positive(),
        })
    ),
});

// User profile schemas
export const updateProfileSchema = z.object({
    name: z.string().min(2).optional(),
    avatarUrl: z.string().url().optional(),
    language: z.string().length(2).optional(),
    currency: z.string().length(3).optional(),
});

// Share schemas
export const createShareSchema = z.object({
    permission: z.enum(["VIEW_ONLY", "CAN_EDIT", "CAN_COPY"]).optional(),
    sharedWithEmail: z.string().email().optional(),
    expiresInDays: z.number().int().positive().optional(),
});

// Query schemas
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

export const citySearchSchema = paginationSchema.extend({
    search: z.string().optional(),
    country: z.string().optional(),
    continent: z.string().optional(),
    minCost: z.coerce.number().optional(),
    maxCost: z.coerce.number().optional(),
    sortBy: z.enum(["popularity", "cost", "name"]).optional(),
});

export const activitySearchSchema = paginationSchema.extend({
    cityId: z.string().uuid().optional(),
    category: z
        .enum([
            "SIGHTSEEING",
            "FOOD_TOUR",
            "ADVENTURE",
            "CULTURAL",
            "RELAXATION",
            "NIGHTLIFE",
            "SHOPPING",
            "TRANSPORTATION",
        ])
        .optional(),
    minCost: z.coerce.number().optional(),
    maxCost: z.coerce.number().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
});
