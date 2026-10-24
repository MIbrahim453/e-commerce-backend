import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  generateProductListing,
  getInventoryAndPricingAdvice,
  applyPricingRecommendation,
  askStoreAnalytics,
  customerStylistChat,
} from "../controllers/ai.controller.js";

const router = express.Router();

router.post(
  "/generate-product",
  verifyJWT,
  authorizedRole("admin"),
  generateProductListing
);

router.get(
  "/inventory-pricing",
  verifyJWT,
  authorizedRole("admin"),
  getInventoryAndPricingAdvice
);

router.post(
  "/apply-discount",
  verifyJWT,
  authorizedRole("admin"),
  applyPricingRecommendation
);

router.post(
  "/ask-store",
  verifyJWT,
  authorizedRole("admin"),
  askStoreAnalytics
);
// ── Public Storefront AI Route ──
router.post("/stylist-chat", customerStylistChat);

export default router;
