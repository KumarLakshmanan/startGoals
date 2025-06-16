// middlewares/apiKeyAuth.js

const VALID_API_KEY = process.env.API_KEY || "your-hardcoded-api-key";

export default function apiKeyAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ error: "API key is missing" });
  }

  if (apiKey !== VALID_API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
}
