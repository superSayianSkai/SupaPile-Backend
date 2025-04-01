import passport from "passport";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../utilities/generateTokens.js";
import { generateRefreshAcessToken } from "../utilities/generateTokens.js";
export const googleSignIn = passport.authenticate("google", {
  scope: ["profile", "email"],
});

export const googleSignInCallback = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication failure" });
    }
    console.log(req.user._id);
    const accessToken = generateAccessToken(req.user._id);
    const refreshToken = generateRefreshAcessToken(req.user._id);
    console.log(accessToken);
    console.log(refreshToken);
    
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure cookies in production
      sameSite: "strict", // Prevents CSRF attacks
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    //i need to replace with the actual website domain
    res.redirect("http://localhost:2000/");
  } catch (error) {
    console.log(error);
  }
};
