import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    categoryCollection: {
    type: String,
    required: true,
    enum: ["men", "women", "kids"],
  },
  },
  { timestamps: true },
);

const Category = mongoose.model("Category", categorySchema);

export default Category;