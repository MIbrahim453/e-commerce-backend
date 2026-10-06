import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  getUserReviews,
} from "../controllers/review.controller.js";

const router = express.Router();

router.get("/product/:productId", getProductReviews);

router.post("/add/:productId", verifyJWT, authorizedRole("user", "admin"), createReview);
router.put("/edit/:id", verifyJWT, authorizedRole("user", "admin"), updateReview);
router.delete("/delete/:id", verifyJWT, authorizedRole("user", "admin"), deleteReview);
router.get("/my-reviews", verifyJWT, authorizedRole("user", "admin"), getUserReviews);

export default router;