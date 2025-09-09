// models/lesson.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Lesson = sequelize.define(
  "lesson",
  {
    lessonId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "sections",
        key: "section_id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['video', 'live', 'quiz', 'assignment', 'document']]
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    streamStartDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    streamEndDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isPreview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Live streaming integration fields
    agoraChannelName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Agora channel name for live streaming",
    },
    agoraToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Agora token for authentication",
    },
    agoraAppId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Agora app ID",
    },
    zoomMeetingId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Zoom meeting ID",
    },
    zoomJoinUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Zoom meeting join URL",
    },
    zoomStartUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Zoom meeting start URL for hosts",
    },
    zoomPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Zoom meeting password",
    },
    liveStreamStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "scheduled",
      comment: "Current status of live stream",
    },
    ...commonFields,
  },
  {
    tableName: "lessons",
    ...commonOptions,
  },
);

export default Lesson;
