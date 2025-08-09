import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Address = sequelize.define(
  "Address",
  {
    addressId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "Reference to the user who owns this address",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: "Address title like Home, Office, etc.",
    },
    doorNo: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50],
      },
      comment: "Door/House number",
    },
    street: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 200],
      },
      comment: "Street address",
    },
    landmark: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 200],
      },
      comment: "Nearby landmark",
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: "City name",
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: "State name",
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 20],
        is: /^[0-9A-Za-z\s-]+$/,
      },
      comment: "ZIP/Postal code",
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      defaultValue: "India",
      comment: "Country name",
    },
    addressType: {
      type: DataTypes.STRING(20),
      validate: {
        isIn: [['home', 'office', 'other']],
      },
      allowNull: false,
      defaultValue: "home",
      comment: "Type of address",
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this is the default address for the user",
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
      comment: "Full name for delivery",
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^\+?[1-9]\d{1,14}$/,
      },
      comment: "Phone number for delivery",
    },
    alternatePhoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^\+?[1-9]\d{1,14}$/,
      },
      comment: "Alternate phone number",
    },
    ...commonFields,
  },
  {
    tableName: "addresses",
    ...commonOptions,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["is_default"],
      },
      {
        fields: ["address_type"],
      },
    ],
  },
);

export default Address;
