import Review from "../models/review.model.js";
import Product from "../models/product.model.js";

// 1. CREATE / ADD REVIEW
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Validate rating range
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5",
      });
    }

    if (!review || review.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Review comment is required",
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Prevent duplicate reviews from the same user on the same product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product. You can update your existing review.",
      });
    }

    // Create review
    const newReview = await Review.create({
      rating,
      review,
      productId,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: { review: newReview },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number(
            (
              reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
            ).toFixed(1)
          )
        : 0;

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: {
        totalReviews,
        averageRating,
        reviews,
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

// 3. UPDATE REVIEW (Only author can edit)
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    const existingReview = await Review.findOne({ _id: id, userId });
    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found or unauthorized",
      });
    }

    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
      existingReview.rating = rating;
    }

    if (review) {
      existingReview.review = review;
    }

    await existingReview.save();

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: { review: existingReview },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 4. DELETE REVIEW (Author or Admin)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Only allow deletion if user owns it OR is an admin
    if (review.userId.toString() !== userId && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this review",
      });
    }

    await Review.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 5. GET LOGGED-IN USER'S REVIEWS
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await Review.find({ userId })
      .populate("productId", "name thumbnail price slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "User reviews fetched successfully",
      data: { reviews },
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
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  getUserReviews,
};