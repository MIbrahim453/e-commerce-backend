import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  createCategory,
  createProduct,
  deleteProduct,
  editProduct,
  getAllProducts,
  getCategory,
  getNewProducts,
  getProductsByCategory,
  getProductsByCollection,
  getSingleProduct,
  getTrendingProducts,
  markNewProduct,
  markTrendingProduct,
  productDashboard,
} from "../controllers/product.controller.js";

const router = express.Router();

router.post(
  "/create-product",
  verifyJWT,
  authorizedRole("admin"),
  createProduct,
);
router.post(
  "/create-category",
  verifyJWT,
  authorizedRole("admin"),
  createCategory,
);
router.put(
  "/edit-product/:id",
  verifyJWT,
  authorizedRole("admin"),
  editProduct,
);
router.delete(
  "/delete-product/:id",
  verifyJWT,
  authorizedRole("admin"),
  deleteProduct,
);
router.put(
  "/mark-trending/:id",
  verifyJWT,
  authorizedRole("admin"),
  markTrendingProduct,
);
router.put("/mark-new/:id", verifyJWT, authorizedRole("admin"), markNewProduct);
router.get("/get-products", getAllProducts);
router.get("/get-category", getCategory);
router.get("/get-products-by-category/:categoryId", getProductsByCategory);
router.get("/get-products-by-collection/:collection", getProductsByCollection);
router.get("/get-single-product/:slug", getSingleProduct);
router.get("/get-trending-products", getTrendingProducts);
router.get("/get-new-products", getNewProducts);
router.get("/product-stats", verifyJWT, authorizedRole("admin"), productDashboard)

export default router;