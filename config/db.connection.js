import mongoose from "mongoose"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
        console.log("MongoDB connected:", connectionInstance.connection.host);
    } catch (error) {
        console.log("MongoDB connection failed");
        console.error(error)
    }
}

export { connectDB }