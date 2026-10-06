import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

const createProduct = async (req, res) => {
  try {
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

    const { material, color, sizes, instructions } = details;

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this name already exists",
      });
    }
    const slug = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .trim()
      .split(" ")
      .join("-");
    const product = await Product.create({
      name,
      description,
      isTrending,
      isNewArrival,
      price,
      discount,
      images,
      thumbnail,
      category: categoryExists._id,
      slug,
      details: {
        material,
        color,
        sizes,
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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, categoryCollection } = req.body;

    const existingCategory = await Category.findOne({ name });
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

const editProduct = async (req, res) => {
  try {
    const { id } = req.params;

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
    const { material, color, sizes, instructions } = details || {};

    const findProduct = await Product.findById(id);
    if (!findProduct) {
      return res.status(400).json({
        success: false,
        message: "Product does not exist",
      });
    }
    const findCategory = await Category.findById(category);
    if (!findCategory) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    const slug = name
      .replace(/[^a-zA-Z0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .join("-")
      .toLowerCase();

    const updateProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        description,
        isTrending,
        isNewArrival,
        price,
        discount,
        images,
        thumbnail,
        category: findCategory._id,
        slug,
        details: {
          material,
          color,
          sizes,
          instructions,
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

    const markTrending = await Product.findOneAndUpdate(
      { _id: id },
      { isTrending: true },
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

    const markNew = await Product.findOneAndUpdate(
      {
        _id: id,
      },
      {
        isNewArrival: true,
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
    const products = await Product.find().populate("category");

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
    const categories = await Category.find({
      categoryCollection: collection,
    }).select("_id");

    const categoryIds = categories.map((category) => category._id);

    const products = await Product.find({
      category: { $in: categoryIds },
      "details.sizes.stock": { $gt: 0 },
    }).populate("category");
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

    const products = await Product.find({
      category: categoryId,
      "details.sizes.stock": { $gt: 0 },
    }).populate("category");

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

    const product = await Product.findOne({ slug }).populate("category");

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: {
        product,
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

const getTrendingProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isTrending: true,
      "details.sizes.stock": { $gt: 0 },
    }).populate("category");

    if (!products) {
      return res.status(400).json({
        success: false,
        message: "No trending product found",
      });
    }
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
    const products = await Product.find({
      isNewArrival: true,
      "details.sizes.stock": { $gt: 0 },
    }).populate("category");

    if (!products) {
      return res.status(400).json({
        success: false,
        message: "No new arrival product found",
      });
    }

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
  editProduct,
  deleteProduct,
  markTrendingProduct,
  markNewProduct,
  getAllProducts,
  getCategory,
  getProductsByCategory,
  getProductsByCollection,
  getSingleProduct,
  getTrendingProducts,
  getNewProducts,
  productDashboard,
};
