import z from "zod";

export const createFamilySchema = z.object({
    address_line: z.string(),
    landmark: z.string(),
    device_created_at: z.string(),
});

export const updateFamilySchema = z.object({
    address_line: z.string(),
    landmark: z.string(),
    device_updated_at: z.string(),
});
