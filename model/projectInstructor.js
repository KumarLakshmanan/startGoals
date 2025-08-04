import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectInstructor = sequelize.define(
  "ProjectInstructor",
  {
    projectInstructorId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "projects",
        key: "project_id",
      },
    },
    instructorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indicates if this is the primary instructor for the project",
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    ...commonFields,
  },
  {
    tableName: "project_instructors",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["project_id", "instructor_id"],
        name: "unique_project_instructor",
      },
    ],
  },
);

export default ProjectInstructor;
