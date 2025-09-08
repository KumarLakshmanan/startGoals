import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Banner = sequelize.define(
  "Banner",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING(10000),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    image: {
      type: DataTypes.STRING(10000),
      allowNull: true,
    },
    bannerType: {
      type: DataTypes.STRING(20),
      defaultValue: "primary",
      validate: {
        isIn: [['primary', 'secondary', 'tertiary']]
      },
      comment: "Type of banner: primary, secondary, or tertiary",
    },
    navigationUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL to navigate to when banner is clicked",
    },
    navigationType: {
      type: DataTypes.STRING(20),
      defaultValue: "external",
      validate: {
        isIn: [['external', 'internal', 'recorded_course', 'live_course', 'project', 'category']]
      },
      comment: "Type of navigation: external URL, internal route, or specific entity",
    },
    navigationTargetId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID of target entity (course, project, category) for internal navigation",
    },
    ...commonFields,
  },
  {
    tableName: "banners",
    ...commonOptions,
  },
);

export default Banner;
