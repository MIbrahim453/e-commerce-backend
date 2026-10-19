import User from "../models/user.model.js";

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, phone, address } = req.body;

    const { street, apartment, city, state, zipCode, country } = address || {};

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        email,
        phone,
        address: { street, apartment, city, state, zipCode, country },
      },
      { new: true },
    ).select("-password");
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { getMe, updateProfile };
