import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  cancelOrder,
  changeOrderStatus,
  createOrder,
  editOrder,
  getAllOrders,
  getSingleOrder,
  getUserOrders,
} from "../controllers/order.controller.js";

const router = express.Router();

router.post("/create-order", verifyJWT, authorizedRole("user"), createOrder);
router.put("/edit-order/:id", verifyJWT, authorizedRole("admin"), editOrder);
router.delete(
  "/cancel-order/:id",
  verifyJWT,
  authorizedRole("user","admin"),
  cancelOrder,
);
router.patch(
  "/change-order-status/:id",
  verifyJWT,
  authorizedRole("admin"),
  changeOrderStatus,
);
router.get("/all-orders", verifyJWT, authorizedRole("admin"), getAllOrders);
router.get("/user-orders", verifyJWT, authorizedRole("user", "admin"), getUserOrders);
router.get("/single-order/:id", verifyJWT, authorizedRole("user", "admin"), getSingleOrder);

export default router;
