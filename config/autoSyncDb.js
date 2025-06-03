//import sequelize from "./db.js";
import models, { sequelize } from "../model/assosiation.js";

export const autoSyncDatabase = async () => {
  try {
    // Temporarily disable alter to prevent constraint issues
    // Use migration scripts for schema changes instead
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully!");
  } catch (error) {
    console.error("❌ Database sync failed:", error.message);
    throw error;
  }
};
