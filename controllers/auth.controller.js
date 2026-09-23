import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { transporter } from "../config/email.js";
import { createResetPasswordEmail } from "../utils/emailUtil.js";

const generateToken = (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      type: "access",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY,
    },
  );
  const refreshToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRY,
    },
  );

  return { accessToken, refreshToken };
};
const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      address = {},
    } = req.body;
    const { street, apartment, city, state, zipCode, country } = address || {};

    const requiredFields = [firstName, lastName, email, phone, password];
    if (requiredFields.some((field) => !field || !field.trim())) {
      return res.status(400).json({
        success: false,
        message: ` All fields are required`,
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashPassword,
      address: {
        street,
        apartment,
        city,
        state,
        zipCode,
        country,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword)
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });

    const token = generateToken(user);
    const userWithOutPassword = await User.findById(user._id).select(
      "-password",
    );

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: {
        user: userWithOutPassword,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
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

const logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || refreshToken.type !== "refresh")
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found",
      });

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: token.accessToken,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No User found for this email",
      });
    }

    const resetToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        type: "reset-password",
      },
      process.env.JWT_RESET_PASSWORD_SECRET,
      {
        expiresIn: process.env.JWT_RESET_PASSWORD_EXPIRY || "15m",
      },
    );

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Reset your password",
      html: createResetPasswordEmail({
        name: user.firstName + user.lastName,
        resetLink,
      }),
    });

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const changePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }
    const verifyToken = jwt.verify(
      token,
      process.env.JWT_RESET_PASSWORD_SECRET,
    );
    if (!verifyToken || verifyToken.type !== "reset-password") {
      return res.status(400).json({
        success: false,
        message: "Invalid token",
      });
    }
    const user = await User.findOne({ email: verifyToken.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const newPasswordHash = await bcrypt.hash(password, 10);
    user.password = newPasswordHash;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
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
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  changePassword,
};
