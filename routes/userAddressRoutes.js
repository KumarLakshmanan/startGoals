import express from "express";
import { isStudent } from "../middleware/authMiddleware.js";
import {
  createAddress,
  getAllAddresses,
  getAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controller/addressController.js";

const router = express.Router();

// POST /user-addresses - Create a new address
router.post("/", isStudent, createAddress);

// GET /user-addresses - Get all addresses for the authenticated user
router.get("/", isStudent, getAllAddresses);

// GET /user-addresses/:addressId - Get a specific address
router.get("/:addressId", isStudent, getAddress);

// PUT /user-addresses/:addressId - Update an address
router.put("/:addressId", isStudent, updateAddress);

// DELETE /user-addresses/:addressId - Delete an address
router.delete("/:addressId", isStudent, deleteAddress);

// PATCH /user-addresses/:addressId/default - Set address as default
router.patch("/:addressId/default", isStudent, setDefaultAddress);

export default router;
