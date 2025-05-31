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
    dialectOptions: {
      ssl: false, // <-- Disable SSL
      // ssl: {
      //   require: true,
      //   rejectUnauthorized: false,
      // },
    },
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
