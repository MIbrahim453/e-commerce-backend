import Order from "../models/order.model.js";

const revenueStats = async (req, res) => {
  try {
    const [revenue, pendingPayments, paymentsInLastHour] = await Promise.all([
      Order.aggregate([
        {
          $match: { orderStatus: "DELIVERED", paymentStatus: "PAID" },
        },
        {
          $group: { _id: null, totalRevenue: { $sum: "$total" } },
        },
      ]),
      Order.countDocuments({
        orderStatus: "PENDING",
        paymentStatus: "UNPAID",
      }),
      Order.countDocuments({
        orderStatus: "DELIVERED",
        paymentStatus: "PAID",
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      }),
    ]);

    const totalRevenue = revenue[0]?.totalRevenue || 0;
    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        pendingPayments,
        paymentsInLastHour,
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

const getAllPayments = async (req, res) => {
  try {
    const payments = await Order.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "All Payments Fetched Successfully",
      data: {
        payments: payments || [],
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

const getUserPayments = async (req, res) => {
  try {
    const user = req.user.id;
    const payments = await Order.find({ user }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "User payments fetched successfully",
      data: {
        payments: payments || [],
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

export { revenueStats, getAllPayments, getUserPayments };
