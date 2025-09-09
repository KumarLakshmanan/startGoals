import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const LessonChat = sequelize.define(
  "LessonChat",
  {
    chatId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    lessonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "lessons",
        key: "lesson_id",
      },
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Message cannot be empty" },
      },
    },
    messageType: {
      type: DataTypes.STRING(20),
      defaultValue: "text",
      validate: {
        isIn: [['text', 'image', 'file', 'system']]
      }
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL of attached file/image",
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Original filename of attachment",
    },
    isAnnouncement: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this is an announcement from instructor/admin",
    },
    replyToId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "lesson_chats",
        key: "chat_id",
      },
      comment: "ID of the message this is replying to",
    },
    ...commonFields,
  },
  {
    tableName: "lesson_chats",
    ...commonOptions,
  },
);

export default LessonChat;