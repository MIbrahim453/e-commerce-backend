import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import authorizedRole from "../middlewares/rbac.middleware.js";
import {
  createCategory,
  deleteCategory,
  editCategory,
  getCategory,
  getProductsByCategory,
} from "../controllers/product.controller.js";

const router = express.Router();

router.get("/", getCategory);
router.get("/get-category", getCategory);
router.get("/:categoryId/products", getProductsByCategory);
router.get("/get-products-by-category/:categoryId", getProductsByCategory);

router.post("/", verifyJWT, authorizedRole("admin"), createCategory);
router.post("/create-category", verifyJWT, authorizedRole("admin"), createCategory);

router.put("/:id", verifyJWT, authorizedRole("admin"), editCategory);
router.put("/edit-category/:id", verifyJWT, authorizedRole("admin"), editCategory);

router.delete("/:id", verifyJWT, authorizedRole("admin"), deleteCategory);
router.delete("/delete-category/:id", verifyJWT, authorizedRole("admin"), deleteCategory);

export default router;
