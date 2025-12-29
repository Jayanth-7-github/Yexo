const AuthService = require("../services/auth.service");
const ApiResponse = require("../utils/response");
const { asyncHandler } = require("../middleware/error.middleware");
const config = require("../config/config");

const parseExpiresInToMs = (value) => {
  if (value == null) return 365 * 24 * 60 * 60 * 1000;
  if (typeof value === "number") return value * 1000;

  const str = String(value).trim();
  if (!str) return 365 * 24 * 60 * 60 * 1000;

  // If it's just digits, treat as seconds (jsonwebtoken behavior)
  if (/^\d+$/.test(str)) return Number(str) * 1000;

  const match = str.match(/^(\d+)(ms|s|m|h|d|w|y)$/i);
  if (!match) return 365 * 24 * 60 * 60 * 1000;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitMs = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return amount * (unitMs[unit] || 1000);
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { username, password, email, phoneNumber } = req.body;

  const result = await AuthService.register({
    username,
    password,
    email,
    phoneNumber,
  });

  // Set tokens in HTTP-only cookies
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseExpiresInToMs(config.jwt.accessExpiresIn),
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseExpiresInToMs(config.jwt.refreshExpiresIn),
  });

  ApiResponse.created(res, result, "User registered successfully");
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip;

  const result = await AuthService.login({ username, password }, ipAddress);

  // Set tokens in HTTP-only cookies
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseExpiresInToMs(config.jwt.accessExpiresIn),
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseExpiresInToMs(config.jwt.refreshExpiresIn),
  });

  ApiResponse.success(res, result, "Login successful");
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  // User is already attached by auth middleware
  ApiResponse.success(res, req.user);
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const ipAddress = req.ip;

  if (!refreshToken) {
    return ApiResponse.badRequest(res, "Refresh token is required");
  }

  const tokens = await AuthService.refreshAccessToken(refreshToken, ipAddress);

  // Set new tokens in HTTP-only cookies
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseExpiresInToMs(config.jwt.accessExpiresIn),
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseExpiresInToMs(config.jwt.refreshExpiresIn),
  });

  ApiResponse.success(res, tokens, "Token refreshed successfully");
});

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const ipAddress = req.ip;

  if (!refreshToken) {
    return ApiResponse.badRequest(res, "Refresh token is required");
  }

  await AuthService.logout(refreshToken, ipAddress);

  // Clear cookies with same options as when they were set
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  ApiResponse.success(res, null, "Logout successful");
});

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  logout,
};
