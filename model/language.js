import { DataTypes, UUIDV4 } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Language = sequelize.define(
  "language",
  {
    languageId: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Language name is required" },
      },
    },
    languageCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Language code is required" },
        is: {
          args: /^[a-z]{2,5}(-[A-Z]{2,5})?$/i,
          msg: "Language code should be in format like en, en-US, fr etc.",
        },
      },
    },
    nativeName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [1, 100],
          msg: "Native name must be between 1 and 100 characters",
        },
      },
    },
    languageType: {
      type: DataTypes.ENUM("user_preference", "course_language", "both"),
      allowNull: false,
      defaultValue: "both",
    },
    ...commonFields,
  },
  {
    tableName: "languages",
    ...commonOptions,
  },
);

export default Language;
