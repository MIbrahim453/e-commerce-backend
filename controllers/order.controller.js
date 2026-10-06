import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { batchDeduction, batchRestock } from "../utils/helper.js";

const createOrder = async (req, res) => {
  try {
    const { items, contactInfo, shippingAddress } = req.body;
    const {
      firstName,
      lastName,
      streetAddress,
      apartment,
      city,
      state,
      zipCode,
      country,
    } = shippingAddress;

    const user = req.user.id;

    let subTotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const stock = product.details.sizes.find((i) => i.size === item.size);
      if (!stock) {
        return res.status(400).json({
          success: false,
          message: `${product.name} for size ${item.size} is out of stock`,
        });
      }
      if (stock.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is out of stock`,
        });
      }

      const { discount, price } = product;
      const discountedPrice = price * (1 - discount / 100);
      subTotal += discountedPrice * item.quantity;
    }

    subTotal = Number(subTotal.toFixed(2));
    const total = subTotal;
    const orderNumber = `ORD-${Math.floor(Math.random() * 90000) + 10000}`;

    const deduction = await batchDeduction(items);
    if (!deduction) {
      return res.status(400).json({
        success: false,
        message: "Batch Deduction failed",
      });
    }

    const newOrder = await Order.create({
      orderNumber,
      items,
      contactInfo,
      shippingAddress: {
        firstName,
        lastName,
        streetAddress,
        apartment,
        city,
        state,
        zipCode,
        country,
      },
      subTotal,
      total,
      user,
    });

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: {
        newOrder,
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

const editOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const user = req.user.id;
    const { contactInfo, shippingAddress } = req.body;
    const {
      firstName,
      lastName,
      streetAddress,
      apartment,
      city,
      state,
      zipCode,
      country,
    } = shippingAddress;

    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        user,
        orderStatus: "PENDING",
      },
      {
        contactInfo,
        shippingAddress: {
          firstName,
          lastName,
          streetAddress,
          apartment,
          city,
          state,
          zipCode,
          country,
        },
      },
      { new: true },
    );

    if (!order) {
      return res.status(400).json({
        success: false,
        message: "Order not found or already shipped or delivered",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const user = req.user.id;
    const order = await Order.findById(id);
    if (!order) {
      return res.status(400).json({
        success: false,
        message: "Order Not Found",
      });
    }
    if (order.orderStatus !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Order is already shipped or delivered",
      });
    }

    const restocking = await batchRestock(order.items);

    if (!restocking) {
      return res.status(400).json({
        success: false,
        message: "Restocking failed",
      });
    }
    const cancelOrder = await Order.findOneAndUpdate(
      {
        _id: id,
        user,
        orderStatus: "PENDING",
      },
      {
        orderStatus: "CANCELLED",
      },
      { new: true },
    );

    if (!cancelOrder) {
      return res.status(400).json({
        success: false,
        message: "Order not found or already shipped or delivered",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const changeOrderStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    const changeStatus = await Order.findByIdAndUpdate(
      id,
      { orderStatus: status },
      { new: true },
    );

    if (!changeStatus) {
      return res.status(400).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status changed successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate(
      "user",
      "firstName lastName email",
    );

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: {
        orders,
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

const getUserOrders = async (req, res) => {
  try {
    const user = req.user.id;

    const [allOrders, pendingOrders, deliveredOrders] = await Promise.all([
      Order.find({ user }).populate("user", "firstName lastName email"),

      Order.find({
        user,
        orderStatus: "PENDING",
      }).populate("user", "firstName lastName email"),

      Order.find({
        user,
        orderStatus: "DELIVERED",
      }).populate("user", "firstName lastName email"),
    ]);

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: {
        allOrdersCount: allOrders.length,
        pendingOrdersCount: pendingOrders.length,
        deliveredOrdersCount: deliveredOrders.length,
        allOrders,
        pendingOrders,
        deliveredOrders,
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

const getSingleOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ _id: id }).populate(
      "user",
      "firstName lastName email",
    );
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order fetched successfully",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const orderStats = async (req, res) => {
  try {
    const [totalOrders, pendingOrders, deliveredOrders, ordersInLastHour] =
      await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ orderStatus: "PENDING" }),
        Order.countDocuments({ orderStatus: "DELIVERED" }),
        Order.countDocuments({
          orderStatus: "PENDING",
          createdAt: {
            $gte: new Date(Date.now() - 60 * 60 * 1000),
          },
        }),
      ]);

    return res.status(200).json({
      success: true,
      message: "Order stats fetched successfully",
      data: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        ordersInLastHour,
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
  createOrder,
  editOrder,
  cancelOrder,
  changeOrderStatus,
  getAllOrders,
  getUserOrders,
  getSingleOrder,
  orderStats,
};
