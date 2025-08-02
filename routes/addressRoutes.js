import express from "express";
import fs from "fs";
import path from "path";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError
} from "../utils/responseHelper.js";

const router = express.Router();

const getCountriesStatesData = () => {
  const filePath = path.resolve("public", "countries+states.json");
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
};

// GET /countries - list all countries
router.get("/countries", (req, res) => {
  try {
    const data = getCountriesStatesData();
    const countries = data.map(c => c.name);
    sendSuccess(res, "Countries fetched successfully", { countries });
  } catch (err) {
    sendServerError(res, err);
  }
});

// GET /states?country=CountryName - list states for a country
router.get("/states", (req, res) => {
  const { country } = req.query;
  if (!country) {
    return sendValidationError(res, "Country name is required", { country: "Country name is required" });
  }
  try {
    const data = getCountriesStatesData();
    const found = data.find(c => c.name.toLowerCase() === country.toLowerCase());
    if (!found) {
      return sendNotFound(res, "Country not found", { country: "Country not found" });
    }
    sendSuccess(res, "States fetched successfully", { states: found.states });
  } catch (err) {
    sendServerError(res, err);
  }
});

// GET /:country - list states for a country (backward compatibility)
router.get("/:country", (req, res) => {
  const { country } = req.params;
  if (!country) {
    return sendValidationError(res, "Country name is required", { country: "Country name is required" });
  }
  try {
    const data = getCountriesStatesData();
    const found = data.find(c => c.name.toLowerCase() === country.toLowerCase());
    if (!found) {
      return sendNotFound(res, "Country not found", { country: "Country not found" });
    }
    sendSuccess(res, "States fetched successfully", { states: found.states });
  } catch (err) {
    sendServerError(res, err);
  }
});

// GET /:country/states - list states for a country (backward compatibility)
router.get("/:country/states", (req, res) => {
  const { country } = req.params;
  if (!country) {
    return sendValidationError(res, "Country name is required", { country: "Country name is required" });
  }
  try {
    const data = getCountriesStatesData();
    const found = data.find(c => c.name.toLowerCase() === country.toLowerCase());
    if (!found) {
      return sendNotFound(res, "Country not found", { country: "Country not found" });
    }
    sendSuccess(res, "States fetched successfully", { states: found.states });
  } catch (err) {
    sendServerError(res, err);
  }
});

export default router;
