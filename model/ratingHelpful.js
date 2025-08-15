import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const RatingHelpful = sequelize.define(
  "RatingHelpful",
  {
    ratingId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "The rating being voted on",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "The user voting",
    },
    ratingType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "Type of rating being voted on",
      validate: {
        isIn: [['course', 'project', 'instructor']]
      },
    },
    isHelpful: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: "true for helpful, false for not helpful",
    },
    ...commonFields,
  },
  {
    tableName: "rating_helpful",
    ...commonOptions,
    indexes: [
      {
        fields: ["rating_id"],
        type: "BTREE",
      },
      {
        fields: ["user_id"],
        type: "BTREE",
      },
      {
        fields: ["rating_type"],
        type: "BTREE",
      },
      {
        unique: true,
        fields: ["rating_id", "user_id"],
        name: "unique_rating_user_helpful",
      },
    ],
  },
);

export default RatingHelpful;
