import User from "../models/user.model.js";
import bcrypt from "bcrypt";

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

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: { users },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: { user },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      password: hashPassword,
      role: role === "admin" ? "admin" : "user",
    });

    const userWithoutPassword = await User.findById(user._id).select(
      "-password",
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role && ["user", "admin"].includes(role)) user.role = role;

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Valid role (user or admin) is required",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    user.role = role;
    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    return res.status(200).json({
      success: true,
      message: `User role changed to ${role}`,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const userStats = async (req, res) => {
  try {
    const [totalUsers, adminUsers, regularUsers, newUsersThisMonth] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "user" }),
        User.countDocuments({
          createdAt: {
            $gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1,
            ),
          },
        }),
      ]);

    return res.status(200).json({
      success: true,
      message: "User stats fetched successfully",
      data: {
        totalUsers,
        adminUsers,
        regularUsers,
        newUsersThisMonth,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {
  getMe,
  updateProfile,
  getAllUsers,
  getSingleUser,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  userStats,
};
