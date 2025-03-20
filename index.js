import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { dbConnect } from "./src/config/db.js";
import router from "./src/router/authRoutes.js";
import "./src/config/passport.js";
import passport from "passport";
import authRouter from "./src/router/authRoutes.js";
import actionRouter from "./src/router/actionRoute.js";
const PORT = process.env.PORT || 5000;
const app = express();

app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());
app.use("/auth", authRouter);
app.use("/api", actionRouter);
// app.use("/api", userRouter);
//connst to monngodb
await dbConnect();
//starting server
app.listen(PORT, () => {
  console.log("Server has started");
  console.log(PORT);
});
