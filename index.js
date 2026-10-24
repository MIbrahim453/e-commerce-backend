import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";
import { connectDB } from "./config/db.connection.js";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import revenueRoutes from "./routes/revenue.routes.js";
import userRoutes from "./routes/user.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import aiRoutes from "./routes/ai.routes.js";

dns.setServers(["1.1.1.1"]);

dotenv.config();

connectDB();

const app = express();

const PORT = process.env.PORT || 3000;
const API_PREFIX = "/api/v1";

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({ message: "Server health is good" });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/product`, productRoutes);
app.use(`${API_PREFIX}/category`, categoryRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/order`, orderRoutes);
app.use(`${API_PREFIX}/review`, reviewRoutes);
app.use(`${API_PREFIX}/revenue`, revenueRoutes);
app.use(`${API_PREFIX}/user`, userRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
