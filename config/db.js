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

// import { Sequelize } from "sequelize";

// // Replace env usage with actual values
// const sequelize = new Sequelize(
//   "StartGoals",               // DATABASE
//   "StartGoals",             // DB_USER
//   "Startgoals12345",          // DB_PASSWORD
//   {
//     host: "mydatabase.clwec8g8o0f2.eu-north-1.rds.amazonaws.com",    // DB_HOST
//     dialect: "postgres",  // DB_DIALECT
//   }
// );

// (async () => {
//   try {
//     await sequelize.authenticate();
//     console.log("✅ Database connection successful");
//   } catch (error) {
//     console.error("❌ Database connection failed:", error);
//   }
// })();
