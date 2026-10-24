import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import Review from "../models/review.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const attachReviewStats = async (products) => {
  if (!products) return products;
  const isArray = Array.isArray(products);
  const prodList = isArray ? products : [products];
  if (prodList.length === 0) return products;

  try {
    const prodIds = prodList.map((p) => p._id);
    const reviewStats = await Review.aggregate([
      { $match: { productId: { $in: prodIds } } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map();
    reviewStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), {
        averageRating: Number(stat.averageRating.toFixed(1)),
        totalReviews: stat.totalReviews,
      });
    });

    const enriched = prodList.map((prod) => {
      const plain = prod.toObject ? prod.toObject() : { ...prod };
      const stat = statsMap.get(prod._id.toString());
      plain.averageRating = stat ? stat.averageRating : 0;
      plain.totalReviews = stat ? stat.totalReviews : 0;
      return plain;
    });

    return isArray ? enriched : enriched[0];
  } catch (err) {
    console.error("Error attaching review stats:", err);
    return products;
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      isTrending,
      isNewArrival,
      price,
      discount,
      category,
      details,
    } = req.body;

    let parsedDetails = details;
    if (typeof details === "string") {
      try {
        parsedDetails = JSON.parse(details);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid details format",
        });
      }
    }

    const { material, color, sizes, instructions } = parsedDetails || {};

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Product category is required. Please create or select a category.",
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Selected category does not exist",
      });
    }

    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this name already exists",
      });
    }

    const imageFiles = req.files?.images || [];
    const localImagePaths = imageFiles.map((file) => file.path);

    const uploadPromises = localImagePaths.map(
      async (filePath) => await uploadOnCloudinary(filePath),
    );
    const uploadResponses = await Promise.all(uploadPromises);

    const imageUrls = uploadResponses
      .filter((result) => result && result.url)
      .map((result) => result.url);

    let thumbnailUrl = "";
    if (imageUrls.length > 0) {
      thumbnailUrl = imageUrls[0];
    }

    if (!thumbnailUrl || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one product image",
      });
    }

    const slug = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .join("-")
      .toLowerCase();

    const product = await Product.create({
      name,
      description,
      isTrending: Boolean(isTrending),
      isNewArrival: Boolean(isNewArrival),
      price: Number(price),
      discount: Number(discount) || 0,
      images: imageUrls,
      thumbnail: thumbnailUrl,
      category: categoryExists._id,
      slug,
      details: {
        material,
        color,
        sizes: sizes || [],
        instructions,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    if (Number.isInteger(error.http_code)) {
      console.error("Cloudinary upload error:", {
        message: error.message,
        http_code: error.http_code,
        name: error.name,
        response: error.error,
        requestId: error.request_id,
      });
      return res.status(502).json({
        success: false,
        message:
          "Cloudinary rejected the image upload. Verify the API credentials and upload permissions.",
        providerStatus: error.http_code,
      });
    }

    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, categoryCollection } = req.body;

    const existingCategory = await Category.findOne({
      name,
      categoryCollection,
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }
    const slug = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .trim()
      .split(" ")
      .join("-");
    const createCategory = await Category.create({
      name,
      slug,
      categoryCollection,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        createCategory,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Find products related to this category
    const products = await Product.find({ category: id });
    const productIds = products.map((product) => product._id);
    
    await Order.updateMany(
      {
        $or: [
          { "items.productId": { $in: productIds } },
          { "items.category": category.name },
        ],
      },
      {
        $set: { orderStatus: "CANCELLED" },
      },
    );
    
    // Delete products related to this category
    await Product.deleteMany({ category: id });

    // Mark orders related to this category or its products as CANCELLED

    // Delete the category
    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Category and related products deleted, related orders cancelled",
      data: {
        category,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryCollection } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name) {
      const targetCollection =
        categoryCollection || category.categoryCollection;
      const existing = await Category.findOne({
        _id: { $ne: id },
        name: name.trim().toLowerCase(),
        categoryCollection: targetCollection,
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Category with this name and collection already exists",
        });
      }
      category.name = name.trim().toLowerCase();
      category.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .trim()
        .split(/\s+/)
        .join("-");
    }

    if (categoryCollection) {
      if (!["men", "women", "kids"].includes(categoryCollection)) {
        return res.status(400).json({
          success: false,
          message: "Invalid collection. Allowed values: men, women, kids",
        });
      }
      category.categoryCollection = categoryCollection;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    console.error("Error in editCategory:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const editProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const findProduct = await Product.findById(id);
    if (!findProduct) {
      return res.status(400).json({
        success: false,
        message: "Product does not exist",
      });
    }

    const {
      name,
      description,
      isTrending,
      isNewArrival,
      price,
      discount,
      images,
      thumbnail,
      category,
      details,
    } = req.body;

    let parsedDetails = details;
    if (typeof details === "string") {
      try {
        parsedDetails = JSON.parse(details);
      } catch (err) {
        parsedDetails = {};
      }
    }
    const { material, color, sizes, instructions } =
      parsedDetails || findProduct.details || {};

    const categoryId = category || findProduct.category;
    const findCategory = await Category.findById(categoryId);
    if (!findCategory) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    let updatedImages = [];
    if (images) {
      if (Array.isArray(images)) {
        updatedImages = images;
      } else if (typeof images === "string") {
        try {
          const parsed = JSON.parse(images);
          updatedImages = Array.isArray(parsed) ? parsed : [images];
        } catch (e) {
          updatedImages = [images];
        }
      }
    } else {
      updatedImages = findProduct.images || [];
    }

    const imageFiles = req.files?.images || [];
    if (imageFiles.length > 0) {
      const localImagePaths = imageFiles.map((file) => file.path);
      const uploadPromises = localImagePaths.map(
        async (filePath) => await uploadOnCloudinary(filePath),
      );
      const uploadResponses = await Promise.all(uploadPromises);
      const newUrls = uploadResponses
        .filter((result) => result && result.url)
        .map((result) => result.url);
      updatedImages = [...updatedImages, ...newUrls];
    }

    const updatedThumbnail =
      thumbnail || updatedImages[0] || findProduct.thumbnail;

    const productName = name || findProduct.name;
    const slug = productName
      .replace(/[^a-zA-Z0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .join("-")
      .toLowerCase();

    const updateProduct = await Product.findByIdAndUpdate(
      id,
      {
        name: productName,
        description: description ?? findProduct.description,
        isTrending:
          isTrending !== undefined
            ? Boolean(isTrending)
            : findProduct.isTrending,
        isNewArrival:
          isNewArrival !== undefined
            ? Boolean(isNewArrival)
            : findProduct.isNewArrival,
        price: price !== undefined ? Number(price) : findProduct.price,
        discount:
          discount !== undefined ? Number(discount) : findProduct.discount,
        images: updatedImages,
        thumbnail: updatedThumbnail,
        category: findCategory._id,
        slug,
        details: {
          material: material ?? findProduct.details?.material,
          color: color ?? findProduct.details?.color,
          sizes: sizes ?? findProduct.details?.sizes,
          instructions: instructions ?? findProduct.details?.instructions,
        },
      },
      {
        new: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: {
        updateProduct,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const findProduct = await Product.findById(id);
    if (!findProduct) {
      return res.status(400).json({
        success: false,
        message: "Product does not exist",
      });
    }
    const deleteProduct = await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: {
        deleteProduct,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const markTrendingProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const markTrending = await Product.findByIdAndUpdate(
      { _id: id },
      { isTrending: status },
      { new: true },
    );
    if (!markTrending) {
      return res.status(400).json({
        success: false,
        message: "Error while making product trending",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product marked as trending successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const markNewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const markNew = await Product.findOneAndUpdate(
      {
        _id: id,
      },
      {
        isNewArrival: status,
      },
      {
        new: true,
      },
    );

    if (!markNew) {
      return res.status(400).json({
        success: false,
        message: "Error while making product new arrival",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product marked as new arrival successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Error while making product new arrival",
    });
  }
};
const getAllProducts = async (req, res) => {
  try {
    const rawProducts = await Product.find()
      .populate("category")
      .sort({ createdAt: -1 });

    const products = await attachReviewStats(rawProducts);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: {
        products,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCategory = async (req, res) => {
  try {
    const categories = await Category.find();

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: {
        categories,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProductsByCollection = async (req, res) => {
  try {
    const { collection } = req.params;
    const normalizedCollection = collection ? collection.toLowerCase() : "";
    const categories = await Category.find({
      categoryCollection: normalizedCollection,
    }).select("_id");

    const categoryIds = categories.map((category) => category._id);

    const rawProducts = await Product.find({
      category: { $in: categoryIds },
    })
      .populate("category")
      .sort({ createdAt: -1 });

    const products = await attachReviewStats(rawProducts);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: {
        products,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const rawProducts = await Product.find({
      category: categoryId,
      "details.sizes.stock": { $gt: 0 },
    }).populate("category");

    const products = await attachReviewStats(rawProducts);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: {
        products,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getSingleProduct = async (req, res) => {
  try {
    const { slug } = req.params;

    let rawProduct = await Product.findOne({ slug }).populate("category");
    if (!rawProduct && mongoose.Types.ObjectId.isValid(slug)) {
      rawProduct = await Product.findById(slug).populate("category");
    }

    if (!rawProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await attachReviewStats(rawProduct);

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: {
        product,
      },
    });
  } catch (error) {
    console.error("Error in getSingleProduct:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getTrendingProducts = async (req, res) => {
  try {
    const rawProducts = await Product.find({
      isTrending: true,
      "details.sizes.stock": { $gt: 0 },
    }).populate("category");

    if (!rawProducts) {
      return res.status(400).json({
        success: false,
        message: "No trending product found",
      });
    }

    const products = await attachReviewStats(rawProducts);

    return res.status(200).json({
      success: true,
      message: "Trending products fetched successfully",
      data: {
        products,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getNewProducts = async (req, res) => {
  try {
    const rawProducts = await Product.find({
      isNewArrival: true,
      "details.sizes.stock": { $gt: 0 },
    }).populate("category");

    if (!rawProducts) {
      return res.status(400).json({
        success: false,
        message: "No new arrival product found",
      });
    }

    const products = await attachReviewStats(rawProducts);

    return res.status(200).json({
      success: true,
      message: "New arrival products fetched successfully",
      data: {
        products,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateProductDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount } = req.body;

    const discountNumber = Number(discount);
    if (isNaN(discountNumber) || discountNumber < 0 || discountNumber > 100) {
      return res.status(400).json({
        success: false,
        message: "Discount must be a valid number between 0 and 100",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { discount: discountNumber },
      { new: true },
    ).populate("category");

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const enrichedProduct = await attachReviewStats(updatedProduct);

    return res.status(200).json({
      success: true,
      message:
        discountNumber > 0
          ? `${discountNumber}% discount applied successfully`
          : "Discount removed successfully",
      data: {
        product: enrichedProduct,
      },
    });
  } catch (error) {
    console.error("Error updating product discount:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const productDashboard = async (req, res) => {
  try {
    const [totalProducts, totalCategories, outOfStock, inStock, lowStock] =
      await Promise.all([
        Product.countDocuments(),
        Category.countDocuments(),
        Product.find({ "details.sizes.stock": { $not: { $gt: 0 } } }),
        Product.find({ "details.sizes.stock": { $gt: 0 } }),
        Product.find({
          "details.sizes": { $elemMatch: { stock: { $gt: 0, $lte: 5 } } },
        }).populate("category"),
      ]);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: {
        totalProducts,
        totalCategories,
        outOfStockCount: outOfStock.length,
        inStockCount: inStock.length,
        lowStockCount: lowStock.length,
        outOfStock,
        inStock,
        lowStock,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {
  createProduct,
  createCategory,
  editCategory,
  deleteCategory,
  editProduct,
  deleteProduct,
  markTrendingProduct,
  markNewProduct,
  updateProductDiscount,
  getAllProducts,
  getCategory,
  getProductsByCategory,
  getProductsByCollection,
  getSingleProduct,
  getTrendingProducts,
  getNewProducts,
  productDashboard,
};
