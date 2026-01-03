import app from "./app";
import { env } from "./config/env.config";
import prisma from "./config/db.config";

const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log("✅ Database connected successfully");

        // Start server
        app.listen(env.PORT, () => {
            console.log(`
🌍 Globe Trotter API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server:     http://localhost:${env.PORT}
📚 API Base:   http://localhost:${env.PORT}/api/v1
🏥 Health:     http://localhost:${env.PORT}/health
🌿 Mode:       ${env.NODE_ENV}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    await prisma.$disconnect();
    process.exit(0);
});

process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully");
    await prisma.$disconnect();
    process.exit(0);
});

startServer();
