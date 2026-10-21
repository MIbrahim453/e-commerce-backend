import express from "express";
import {
  getMe,
  updateProfile,
  getAllUsers,
  getSingleUser,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  userStats,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";

const router = express.Router();

// Authenticated user routes
router.get("/me", verifyJWT, getMe);
router.put("/update-profile", verifyJWT, updateProfile);

// Admin-only routes
router.get("/all-users", verifyJWT, authorizedRole("admin"), getAllUsers);
router.get("/stats", verifyJWT, authorizedRole("admin"), userStats);
router.get("/:id", verifyJWT, authorizedRole("admin"), getSingleUser);
router.post("/create", verifyJWT, authorizedRole("admin"), createUser);
router.put("/update/:id", verifyJWT, authorizedRole("admin"), updateUser);
router.patch("/change-role/:id", verifyJWT, authorizedRole("admin"), changeUserRole);
router.delete("/delete/:id", verifyJWT, authorizedRole("admin"), deleteUser);

export default router;
