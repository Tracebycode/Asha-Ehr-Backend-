import zod from "zod";

export const createUserSchema = zod.object({
    name: zod.string(),
    phone: zod.string().min(10).max(10),
    gender: zod.string(),
    dob: zod.string(),
    education_level: zod.string(),
    role: zod.string(),
    password: zod.string(),
});