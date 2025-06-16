import axios from "axios";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

export const getZoomAccessToken = async () => {
  try {
    const response = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
      {},
      {
        auth: {
          username: ZOOM_CLIENT_ID,
          password: ZOOM_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    return response.data.access_token;
  } catch (error) {
    console.error(
      "Error fetching Zoom access token:",
      error.response?.data || error.message,
    );
    throw new Error("Unable to retrieve Zoom access token");
  }
};

// controllers/zoomController.js

export const generateSignature = (req, res) => {
  try {
    const { meetingNumber, role } = req.body;

    const timestamp = new Date().getTime() - 30000;
    const msg = Buffer.from(
      `${process.env.ZOOM_API_KEY}${meetingNumber}${timestamp}${role}`,
    ).toString("base64");

    const hash = crypto
      .createHmac("sha256", process.env.ZOOM_API_SECRET)
      .update(msg)
      .digest("base64");

    const signature = Buffer.from(
      `${process.env.ZOOM_API_KEY}.${meetingNumber}.${timestamp}.${role}.${hash}`,
    ).toString("base64");

    res.status(200).json({ signature });
  } catch (error) {
    console.error("Error generating Zoom signature:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
