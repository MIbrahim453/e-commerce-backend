import mongoose from "mongoose";

const productDetailSchema = new mongoose.Schema(
  {
    material: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    sizes: [
      {
        size: {
          type: String,
          required: true,
        },
        stock: {
          type: Number,
          required: true,
        },
      },
    ],
    instructions: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    thumbnail: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    details: {
      type: productDetailSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

productSchema.virtual("availableSizes").get(function () {
  if (!this.details.sizes) return [];
  const sizes = this.details.sizes.filter((s) => s.stock > 0);
  return sizes.map((s) => s.size);
});
const Product = mongoose.model("Product", productSchema);

export default Product;
