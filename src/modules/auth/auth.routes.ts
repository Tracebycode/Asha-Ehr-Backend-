import { loginController } from "./auth.controllers";
import { validateLogin } from "./auth.middlewares";
import { Router } from "express";

const router = Router();

router.post("/login", validateLogin, loginController);

export default router;