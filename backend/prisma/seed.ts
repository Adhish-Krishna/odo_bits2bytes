import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 driver adapter pattern
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    console.log("🌱 Seeding database...");

    // Clear existing data first
    console.log("Clearing existing data...");
    await prisma.savedCity.deleteMany();
    await prisma.sharedTrip.deleteMany();
    await prisma.itineraryActivity.deleteMany();
    await prisma.tripBudget.deleteMany();
    await prisma.itinerary.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.city.deleteMany();

    // Seed Cities
    const cities = await Promise.all([
        prisma.city.create({
            data: {
                name: "Paris",
                country: "France",
                continent: "Europe",
                imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34",
                avgDailyCost: 150,
                currency: "EUR",
                popularityScore: 95,
                latitude: 48.8566,
                longitude: 2.3522,
                metaInfo: { timezone: "CET", language: "French" },
            },
        }),
        prisma.city.create({
            data: {
                name: "Rome",
                country: "Italy",
                continent: "Europe",
                imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5",
                avgDailyCost: 120,
                currency: "EUR",
                popularityScore: 92,
                latitude: 41.9028,
                longitude: 12.4964,
                metaInfo: { timezone: "CET", language: "Italian" },
            },
        }),
        prisma.city.create({
            data: {
                name: "Tokyo",
                country: "Japan",
                continent: "Asia",
                imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf",
                avgDailyCost: 180,
                currency: "JPY",
                popularityScore: 90,
                latitude: 35.6762,
                longitude: 139.6503,
                metaInfo: { timezone: "JST", language: "Japanese" },
            },
        }),
        prisma.city.create({
            data: {
                name: "New York",
                country: "USA",
                continent: "North America",
                imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9",
                avgDailyCost: 200,
                currency: "USD",
                popularityScore: 88,
                latitude: 40.7128,
                longitude: -74.006,
                metaInfo: { timezone: "EST", language: "English" },
            },
        }),
        prisma.city.create({
            data: {
                name: "Barcelona",
                country: "Spain",
                continent: "Europe",
                imageUrl: "https://images.unsplash.com/photo-1583422409516-2895a77efed6",
                avgDailyCost: 110,
                currency: "EUR",
                popularityScore: 87,
                latitude: 41.3851,
                longitude: 2.1734,
                metaInfo: { timezone: "CET", language: "Spanish/Catalan" },
            },
        }),
        prisma.city.create({
            data: {
                name: "Bali",
                country: "Indonesia",
                continent: "Asia",
                imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
                avgDailyCost: 60,
                currency: "IDR",
                popularityScore: 85,
                latitude: -8.3405,
                longitude: 115.092,
                metaInfo: { timezone: "WITA", language: "Indonesian" },
            },
        }),
    ]);

    console.log(`✅ Created ${cities.length} cities`);

    // Seed Activities for each city
    const activities = [];

    // Paris activities
    activities.push(
        await prisma.activity.create({
            data: {
                cityId: cities[0].id,
                name: "Eiffel Tower Visit",
                description: "Iconic iron lattice tower with stunning city views",
                imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4",
                category: "SIGHTSEEING",
                estimatedCost: 26,
                durationMinutes: 120,
                rating: 4.7,
                tags: ["landmark", "views", "romantic"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[0].id,
                name: "Louvre Museum",
                description: "World's largest art museum housing the Mona Lisa",
                imageUrl: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a",
                category: "CULTURAL",
                estimatedCost: 17,
                durationMinutes: 240,
                rating: 4.8,
                tags: ["art", "museum", "history"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[0].id,
                name: "Seine River Cruise",
                description: "Romantic boat tour along the Seine",
                imageUrl: "https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b",
                category: "SIGHTSEEING",
                estimatedCost: 15,
                durationMinutes: 90,
                rating: 4.5,
                tags: ["romantic", "scenic", "relaxing"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[0].id,
                name: "French Cooking Class",
                description: "Learn to cook classic French cuisine",
                imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
                category: "FOOD_TOUR",
                estimatedCost: 80,
                durationMinutes: 180,
                rating: 4.9,
                tags: ["food", "experience", "local"],
            },
        })
    );

    // Rome activities
    activities.push(
        await prisma.activity.create({
            data: {
                cityId: cities[1].id,
                name: "Colosseum Tour",
                description: "Ancient Roman gladiatorial arena",
                imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5",
                category: "SIGHTSEEING",
                estimatedCost: 18,
                durationMinutes: 150,
                rating: 4.8,
                tags: ["history", "landmark", "ancient"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[1].id,
                name: "Vatican Museums",
                description: "World-renowned art collection including the Sistine Chapel",
                imageUrl: "https://images.unsplash.com/photo-1531572753322-ad063cecc140",
                category: "CULTURAL",
                estimatedCost: 25,
                durationMinutes: 240,
                rating: 4.9,
                tags: ["art", "religious", "history"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[1].id,
                name: "Trastevere Food Tour",
                description: "Walking food tour through Rome's charming neighborhood",
                imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
                category: "FOOD_TOUR",
                estimatedCost: 65,
                durationMinutes: 210,
                rating: 4.7,
                tags: ["food", "local", "walking"],
            },
        })
    );

    // Tokyo activities
    activities.push(
        await prisma.activity.create({
            data: {
                cityId: cities[2].id,
                name: "Senso-ji Temple",
                description: "Ancient Buddhist temple in Asakusa",
                imageUrl: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9",
                category: "CULTURAL",
                estimatedCost: 0,
                durationMinutes: 90,
                rating: 4.6,
                tags: ["temple", "traditional", "free"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[2].id,
                name: "Tsukiji Fish Market",
                description: "World-famous fish market with fresh sushi",
                imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754",
                category: "FOOD_TOUR",
                estimatedCost: 40,
                durationMinutes: 120,
                rating: 4.8,
                tags: ["food", "market", "sushi"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[2].id,
                name: "Shibuya Crossing Experience",
                description: "Experience the world's busiest pedestrian crossing",
                imageUrl: "https://images.unsplash.com/photo-1542051841857-5f90071e7989",
                category: "SIGHTSEEING",
                estimatedCost: 0,
                durationMinutes: 60,
                rating: 4.4,
                tags: ["urban", "iconic", "free"],
            },
        })
    );

    // Bali activities
    activities.push(
        await prisma.activity.create({
            data: {
                cityId: cities[5].id,
                name: "Tegallalang Rice Terraces",
                description: "Stunning rice paddies with traditional irrigation",
                imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4",
                category: "SIGHTSEEING",
                estimatedCost: 5,
                durationMinutes: 120,
                rating: 4.6,
                tags: ["nature", "scenic", "photography"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[5].id,
                name: "Balinese Cooking Class",
                description: "Learn traditional Balinese cooking with local family",
                imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947",
                category: "FOOD_TOUR",
                estimatedCost: 35,
                durationMinutes: 240,
                rating: 4.9,
                tags: ["food", "local", "experience"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[5].id,
                name: "Ubud Monkey Forest",
                description: "Sacred sanctuary with playful monkeys",
                imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801",
                category: "ADVENTURE",
                estimatedCost: 8,
                durationMinutes: 90,
                rating: 4.5,
                tags: ["nature", "wildlife", "temple"],
            },
        }),
        await prisma.activity.create({
            data: {
                cityId: cities[5].id,
                name: "Sunrise Hike Mount Batur",
                description: "Early morning volcano hike with breakfast at summit",
                imageUrl: "https://images.unsplash.com/photo-1604999333679-b86d54738315",
                category: "ADVENTURE",
                estimatedCost: 50,
                durationMinutes: 360,
                rating: 4.8,
                tags: ["adventure", "sunrise", "hiking"],
            },
        })
    );

    console.log(`✅ Created ${activities.length} activities`);

    console.log("🎉 Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
