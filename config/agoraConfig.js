import { RtcTokenBuilder } from "agora-access-token";
import dotenv from "dotenv";
dotenv.config();

const agoraAppId = process.env.AGORA_APP_ID;

const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;

export function generateToken(
  channelName,
  userId,
  role,
  expirationTimeInSeconds,
) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    agoraAppId,
    agoraAppCertificate,
    channelName,
    userId,
    role,
    privilegeExpiredTs,
  );

  const data = {
    token: token,
    appId: agoraAppId,
    certificate: agoraAppCertificate,
    role,
    userId,
    privilegeExpiredTs,
  };

  return data;
}
