import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/**
 * Migration to add enhanced fields to the courses table
 * to make it similar to the projects table
 */
async function enhanceCourseModel() {
  try {
    console.log("Starting course model enhancement migration...");
    
    // Get the queryInterface for raw SQL
    const queryInterface = sequelize.getQueryInterface();
    
    // Add each new column one by one
    // Short description
    await queryInterface.addColumn("courses", "short_description", {
      type: DataTypes.STRING(500),
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column short_description already exists");
    });

    // Discount enabled
    await queryInterface.addColumn("courses", "discount_enabled", {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column discount_enabled already exists");
    });

    // Duration minutes for recorded courses
    await queryInterface.addColumn("courses", "duration_minutes", {
      type: DataTypes.INTEGER,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column duration_minutes already exists");
    });

    // Cover image (larger than thumbnail)
    await queryInterface.addColumn("courses", "cover_image", {
      type: DataTypes.STRING,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column cover_image already exists");
    });

    // Demo URL
    await queryInterface.addColumn("courses", "demo_url", {
      type: DataTypes.STRING,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column demo_url already exists");
    });

    // Screenshots JSON array
    await queryInterface.addColumn("courses", "screenshots", {
      type: DataTypes.JSON,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column screenshots already exists");
    });

    // Tech stack JSON array
    await queryInterface.addColumn("courses", "tech_stack", {
      type: DataTypes.JSON,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column tech_stack already exists");
    });

    // Programming languages JSON array
    await queryInterface.addColumn("courses", "programming_languages", {
      type: DataTypes.JSON,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column programming_languages already exists");
    });

    // Features
    await queryInterface.addColumn("courses", "features", {
      type: DataTypes.TEXT,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column features already exists");
    });

    // Prerequisites
    await queryInterface.addColumn("courses", "prerequisites", {
      type: DataTypes.TEXT,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column prerequisites already exists");
    });

    // What you get
    await queryInterface.addColumn("courses", "what_you_get", {
      type: DataTypes.TEXT,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column what_you_get already exists");
    });

    // Published at
    await queryInterface.addColumn("courses", "published_at", {
      type: DataTypes.DATE,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column published_at already exists");
    });

    // Last updated
    await queryInterface.addColumn("courses", "last_updated", {
      type: DataTypes.DATE,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column last_updated already exists");
    });

    // Version
    await queryInterface.addColumn("courses", "version", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "1.0",
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column version already exists");
    });

    // Total sections
    await queryInterface.addColumn("courses", "total_sections", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column total_sections already exists");
    });

    // Total lessons
    await queryInterface.addColumn("courses", "total_lessons", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column total_lessons already exists");
    });

    // Total enrollments
    await queryInterface.addColumn("courses", "total_enrollments", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column total_enrollments already exists");
    });

    // Total revenue
    await queryInterface.addColumn("courses", "total_revenue", {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.0,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column total_revenue already exists");
    });

    // Support included
    await queryInterface.addColumn("courses", "support_included", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column support_included already exists");
    });

    // Support duration
    await queryInterface.addColumn("courses", "support_duration", {
      type: DataTypes.INTEGER,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column support_duration already exists");
    });

    // Support email
    await queryInterface.addColumn("courses", "support_email", {
      type: DataTypes.STRING,
      allowNull: true,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column support_email already exists");
    });

    // Featured
    await queryInterface.addColumn("courses", "featured", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }).catch(err => {
      if (!err.message.includes("already exists")) throw err;
      console.log("Column featured already exists");
    });

    // Update the status enum to match project status options
    // This is more complex - might need to drop and recreate the column
    // We'll skip this for now as it requires data migration

    console.log("Course model enhancement migration completed successfully!");
    return true;
  } catch (error) {
    console.error("Error enhancing course model:", error);
    return false;
  }
}

export default enhanceCourseModel;
