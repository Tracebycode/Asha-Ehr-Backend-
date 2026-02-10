import zod from "zod";

export const loginSchema = zod.object({
    phone: zod.string().min(10).max(10),
    password: zod.string().min(6)
});

export const registerSchema = zod.object({
    phone: zod.string().min(10).max(10),
    password: zod.string().min(6),
    role: zod.string().optional(),
    phc_id: zod.string().optional()
});