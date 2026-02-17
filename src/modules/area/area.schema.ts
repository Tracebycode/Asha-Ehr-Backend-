import { z } from "zod";

export const assignareaSchema = z.object({
    user_id: z.string(),
    area_id: z.string(),
    
});