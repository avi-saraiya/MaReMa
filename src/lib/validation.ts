import { z } from "zod";

export const loginSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(50, "Name must be 50 characters or fewer."),
});
