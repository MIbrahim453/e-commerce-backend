import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import dns from "dns"
import { connectDB } from "./config/db.connection.js"
import authRoutes from "./routes/auth.routes.js"
import productRoutes from "./routes/product.routes.js"

dns.setServers(['1.1.1.1'])

dotenv.config()

connectDB()

const app = express()

const PORT = process.env.PORT || 3000
const API_PREFIX = "/api/v1"

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('public'))

app.get("/health", (req, res) => {
    res.json({message: "Server health is good"})
})

app.use(`${API_PREFIX}/auth`, authRoutes)
app.use(`${API_PREFIX}/product`, productRoutes)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
