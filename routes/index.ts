
import express,{ Router } from "express";
import authRoute, { middlewareRoute } from "./authRoute";
import jwt from "jsonwebtoken";
import convRoute from "./conversationRoute";
import adminRoute from "./adminRoute";


const routes = Router();




routes.use("/auth", authRoute);
routes.use(middlewareRoute);
routes.use("/conversations",convRoute);

routes.use("/admin",adminRoute);

export default routes;

