import Product from "../models/product.model.js";

const batchDeduction = async (items) => {
  try {
    const deductions = [];
    for (const item of items) {
      const productDeduction = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          "details.sizes": {
            $elemMatch: {
              size: item.size,
              stock: { $gte: item.quantity },
            },
          },
        },
        {
          $inc: {
            "details.sizes.$.stock": -item.quantity,
          },
        },
        {
          new: true,
        },
      );
      if (!productDeduction) {
        throw new Error(`Size ${item.size} of item is no longer available.`);
      }
      deductions.push(item);
    }
    return deductions;
  } catch (error) {
    throw new Error(error.message);
  }
};

const batchRestock = async (items) => {
  try {
    const restock = [];
    for (const item of items) {
      const productRestock = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          "details.sizes": {
            $elemMatch: {
              size: item.size,
            },
          },
        },
        {
          $inc: {
            "details.sizes.$.stock": +item.quantity,
          },
        },
        {
          new: true,
        },
      );
    }
    return true
  } catch (error) {
    throw new Error(error.message);
  }
};
export { batchDeduction, batchRestock };
