import express from "express";
import { protectedMiddleware } from "../Middleware/auth.js";
import { getDashboard } from "../Controller/progessController.js";

const progressRouter = express.Router();

progressRouter.use(protectedMiddleware);

progressRouter.get("/dashboard", getDashboard);

export default progressRouter;