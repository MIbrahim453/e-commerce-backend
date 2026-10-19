import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  cancelOrder,
  changeOrderStatus,
  changeCODPaymentStatus,
  createOrder,
  editOrder,
  getAllOrders,
  getSingleOrder,
  getUserOrders,
  orderStats,
} from "../controllers/order.controller.js";

const router = express.Router();

router.post(
  "/create-order",
  verifyJWT,
  authorizedRole("user", "admin"),
  createOrder,
);
router.put(
  "/edit-order/:id",
  verifyJWT,
  authorizedRole("admin", "user"),
  editOrder,
);
router.delete(
  "/cancel-order/:id",
  verifyJWT,
  authorizedRole("user", "admin"),
  cancelOrder,
);
router.patch(
  "/change-order-status/:id",
  verifyJWT,
  authorizedRole("admin"),
  changeOrderStatus,
);
router.patch(
  "/change-cod-payment-status/:id",
  verifyJWT,
  authorizedRole("admin"),
  changeCODPaymentStatus,
);
router.patch(
  "/change-payment-status/:id",
  verifyJWT,
  authorizedRole("admin"),
  changeCODPaymentStatus,
);
router.get("/all-orders", verifyJWT, authorizedRole("admin"), getAllOrders);
router.get(
  "/user-orders",
  verifyJWT,
  authorizedRole("user", "admin"),
  getUserOrders,
);
router.get(
  "/single-order/:id",
  verifyJWT,
  authorizedRole("user", "admin"),
  getSingleOrder,
);
router.get("/order-stats", verifyJWT, authorizedRole("admin"), orderStats);
export default router;
