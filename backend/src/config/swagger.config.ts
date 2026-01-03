import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Globe Trotter API",
            version: "1.0.0",
            description: `
## 🌍 Globe Trotter - AI-Powered Travel Planning Platform

This API provides endpoints for:
- **Authentication** - User registration, login, and JWT token management
- **User Profiles** - Profile management and saved cities
- **Trips** - Create, update, delete, and duplicate travel plans
- **Itineraries** - Day-by-day trip planning with activities
- **Cities & Activities** - Browse destinations and things to do
- **Budget Management** - Track and allocate trip budgets
- **Sharing** - Share trips via public links
- **AI Assistant** - AI-powered itinerary generation and suggestions (SSE streaming)
      `,
            contact: {
                name: "Globe Trotter Team",
            },
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter your JWT access token",
                },
            },
            schemas: {
                // Common schemas
                Error: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: { type: "string" },
                        error: { type: "string" },
                    },
                },
                Success: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string" },
                        data: { type: "object" },
                    },
                },
                PaginatedResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        data: { type: "array", items: {} },
                        pagination: {
                            type: "object",
                            properties: {
                                page: { type: "integer" },
                                limit: { type: "integer" },
                                total: { type: "integer" },
                                totalPages: { type: "integer" },
                            },
                        },
                    },
                },
                // Auth schemas
                RegisterRequest: {
                    type: "object",
                    required: ["email", "password", "name"],
                    properties: {
                        email: { type: "string", format: "email", example: "user@example.com" },
                        password: { type: "string", minLength: 6, example: "password123" },
                        name: { type: "string", example: "John Doe" },
                    },
                },
                LoginRequest: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email", example: "user@example.com" },
                        password: { type: "string", example: "password123" },
                    },
                },
                AuthResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        data: {
                            type: "object",
                            properties: {
                                user: { $ref: "#/components/schemas/User" },
                                accessToken: { type: "string" },
                                refreshToken: { type: "string" },
                            },
                        },
                    },
                },
                // User schemas
                User: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        email: { type: "string", format: "email" },
                        name: { type: "string" },
                        avatarUrl: { type: "string", nullable: true },
                        language: { type: "string", example: "en" },
                        currency: { type: "string", example: "USD" },
                        role: { type: "string", enum: ["USER", "ADMIN"] },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                // Trip schemas
                Trip: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        description: { type: "string", nullable: true },
                        startDate: { type: "string", format: "date-time" },
                        endDate: { type: "string", format: "date-time" },
                        totalBudget: { type: "number", nullable: true },
                        coverPhotoUrl: { type: "string", nullable: true },
                        status: {
                            type: "string",
                            enum: ["DRAFT", "PLANNING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
                        },
                        aiGenerated: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                CreateTripRequest: {
                    type: "object",
                    required: ["name", "startDate", "endDate"],
                    properties: {
                        name: { type: "string", example: "Summer Europe Trip" },
                        description: { type: "string", example: "Two weeks exploring Europe" },
                        startDate: { type: "string", format: "date", example: "2025-07-01" },
                        endDate: { type: "string", format: "date", example: "2025-07-15" },
                        totalBudget: { type: "number", example: 5000 },
                        coverPhotoUrl: { type: "string" },
                    },
                },
                // City schemas
                City: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        country: { type: "string" },
                        continent: { type: "string", nullable: true },
                        imageUrl: { type: "string", nullable: true },
                        avgDailyCost: { type: "number", nullable: true },
                        currency: { type: "string", nullable: true },
                        popularityScore: { type: "integer" },
                    },
                },
                // Activity schemas
                Activity: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        cityId: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        description: { type: "string", nullable: true },
                        imageUrl: { type: "string", nullable: true },
                        category: {
                            type: "string",
                            enum: ["SIGHTSEEING", "FOOD_TOUR", "ADVENTURE", "CULTURAL", "RELAXATION", "NIGHTLIFE", "SHOPPING", "TRANSPORTATION"],
                        },
                        estimatedCost: { type: "number" },
                        durationMinutes: { type: "integer" },
                        rating: { type: "number" },
                        tags: { type: "array", items: { type: "string" } },
                    },
                },
                // AI schemas
                GenerateItineraryRequest: {
                    type: "object",
                    required: ["prompt"],
                    properties: {
                        prompt: { type: "string", example: "Plan a 5-day trip to Paris for a couple" },
                        preferences: {
                            type: "object",
                            properties: {
                                travelStyle: { type: "string", enum: ["budget", "balanced", "luxury"] },
                                interests: { type: "array", items: { type: "string" } },
                                budgetPriority: { type: "string" },
                                avoidCrowds: { type: "boolean" },
                            },
                        },
                        saveToTripId: { type: "string", format: "uuid" },
                    },
                },
            },
        },
        tags: [
            { name: "Auth", description: "Authentication endpoints" },
            { name: "Users", description: "User profile management" },
            { name: "Trips", description: "Trip CRUD operations" },
            { name: "Itinerary", description: "Day-by-day itinerary management" },
            { name: "Cities", description: "City/destination endpoints" },
            { name: "Activities", description: "Activity endpoints" },
            { name: "Budget", description: "Budget management" },
            { name: "Sharing", description: "Trip sharing" },
            { name: "AI", description: "AI-powered features (SSE streaming)" },
        ],
    },
    apis: ["./src/modules/**/*.ts", "./src/app.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
