import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    pool: {
      max: 5,
      min: 0,
      acquire: 60000,
      idle: 10000,
      evict: 5000
    },
    retry: {
      max: 3
    },
    dialectOptions: process.env.SERVER_TYPE === "production" ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      connectTimeout: 60000,
      socketPath: null,
    } : {},
    logging: false
  }
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
