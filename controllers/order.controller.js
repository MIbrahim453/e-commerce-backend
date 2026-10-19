import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { batchDeduction, batchRestock } from "../utils/helper.js";

const createOrder = async (req, res) => {
  try {
    const { items, contactInfo, shippingAddress, paymentMethod } = req.body;
    const {
      firstName,
      lastName,
      streetAddress,
      apartment,
      city,
      state,
      zipCode,
      country,
    } = shippingAddress || {};

    const user = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    let subTotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const sizes = product.details?.sizes || [];
      const stock = sizes.find((i) => i.size === item.size);
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

      const discount = Number(product.discount) || 0;
      const price = Number(product.price) || 0;
      const discountedPrice =
        discount > 0 ? price * (1 - discount / 100) : price;
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

    const validPaymentMethod = paymentMethod === "CARD" ? "CARD" : "COD";
    const paymentStatus = validPaymentMethod === "CARD" ? "PAID" : "UNPAID";

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
      paymentMethod: validPaymentMethod,
      paymentStatus,
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
    const role = req.user.role;
    const {
      contactInfo,
      shippingAddress,
      orderStatus,
      paymentStatus,
      paymentMethod,
    } = req.body;

    const query =
      role === "admin"
        ? { _id: id }
        : { _id: id, user, orderStatus: "PENDING" };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          role === "admin"
            ? "Order not found"
            : "Order not found or already shipped or delivered",
      });
    }

    if (contactInfo) {
      if (contactInfo.email !== undefined)
        order.contactInfo.email = contactInfo.email;
      if (contactInfo.phone !== undefined)
        order.contactInfo.phone = contactInfo.phone;
    }

    if (shippingAddress) {
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

      if (firstName !== undefined) order.shippingAddress.firstName = firstName;
      if (lastName !== undefined) order.shippingAddress.lastName = lastName;
      if (streetAddress !== undefined)
        order.shippingAddress.streetAddress = streetAddress;
      if (apartment !== undefined) order.shippingAddress.apartment = apartment;
      if (city !== undefined) order.shippingAddress.city = city;
      if (state !== undefined) order.shippingAddress.state = state;
      if (zipCode !== undefined) order.shippingAddress.zipCode = zipCode;
      if (country !== undefined) order.shippingAddress.country = country;
    }

    if (role === "admin") {
      if (
        orderStatus &&
        ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(
          orderStatus,
        )
      ) {
        if (orderStatus === "CANCELLED" && order.orderStatus !== "CANCELLED") {
          await batchRestock(order.items);
        }
        order.orderStatus = orderStatus;
      }

      if (
        paymentStatus &&
        ["UNPAID", "PAID", "FAILED"].includes(paymentStatus)
      ) {
        order.paymentStatus = paymentStatus;
      }

      if (paymentMethod && ["COD", "CARD"].includes(paymentMethod)) {
        order.paymentMethod = paymentMethod;
      }
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    console.error("Edit order error:", error);
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
    const role = req.user.role;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order Not Found",
      });
    }

    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    if (role !== "admin") {
      if (order.user.toString() !== user.toString()) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to cancel this order",
        });
      }

      if (order.orderStatus !== "PENDING") {
        return res.status(400).json({
          success: false,
          message:
            "Order cannot be cancelled as it is already being processed or shipped",
        });
      }
    }

    const restocking = await batchRestock(order.items);
    if (!restocking) {
      return res.status(400).json({
        success: false,
        message: "Restocking failed",
      });
    }

    order.orderStatus = "CANCELLED";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    console.error("Cancel order error:", error);
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

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const previousStatus = order.orderStatus;

    if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
      await batchRestock(order.items);
    }

    order.orderStatus = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status changed successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    console.error("Change order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const changeCODPaymentStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status, paymentStatus } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentMethod !== "COD") {
      return res.status(400).json({
        success: false,
        message:
          "Payment status can only be updated for Cash on Delivery (COD) orders",
      });
    }

    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot update payment status for a cancelled order",
      });
    }

    const targetStatus = (status || paymentStatus || "PAID").toUpperCase();
    const validStatuses = ["UNPAID", "PAID", "FAILED"];

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Allowed values are: ${validStatuses.join(", ")}`,
      });
    }

    order.paymentStatus = targetStatus;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `COD payment status updated to ${targetStatus} successfully`,
      data: {
        order,
      },
    });
  } catch (error) {
    console.error("Error updating COD payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const changePaymentStatusForCOD = changeCODPaymentStatus;

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
        message: "Order Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: {
        order,
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
  changeCODPaymentStatus,
  changePaymentStatusForCOD,
  getAllOrders,
  getUserOrders,
  getSingleOrder,
  orderStats,
};
