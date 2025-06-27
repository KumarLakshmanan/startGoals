import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configure env properly with absolute path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Ensure dialect is explicitly set with fallback
const sequelize = new Sequelize(
  process.env.DB_NAME || "startgoals",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
      evict: 5000,
    },
    retry: {
      max: 3,
    },
    dialectOptions:
      process.env.SERVER_TYPE === "production"
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
            connectTimeout: 60000,
            socketPath: null,
          }
        : {},
    logging: false,
  },
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("database connection successfull");
  } catch (error) {
    console.log("database connection failed", error);
  }
})();

export default sequelize;
