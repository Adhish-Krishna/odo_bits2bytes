import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
    var prisma: PrismaClient | undefined;
}

// Prisma 7 driver adapter pattern
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg({ connectionString });

export const prisma =
    global.prisma ||
    new PrismaClient({
        adapter,
    } as any);

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

export default prisma;
