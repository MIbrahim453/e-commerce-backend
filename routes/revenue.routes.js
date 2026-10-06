import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  revenueStats,
  getAllPayments,
  getUserPayments,
} from "../controllers/revenue.controller.js";

const router = express.Router();

// Admin only: Total revenue, pending counts, and last hour payments
router.get("/stats", verifyJWT, authorizedRole("admin"), revenueStats);

// Admin only: All orders/payments across the entire store
router.get("/all-payments", verifyJWT, authorizedRole("admin"), getAllPayments);

// Customer: Their own payment history (powers Profile -> PaymentsTab.jsx)
router.get("/my-payments", verifyJWT, authorizedRole("user", "admin"), getUserPayments);

export default router;