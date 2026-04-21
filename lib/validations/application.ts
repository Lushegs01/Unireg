import { z } from "zod";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const fileUploadSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    `File size must be less than 5MB`
  )
  .refine(
    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
    "Only PDF and image files (JPEG, PNG, WebP) are accepted"
  );

export const applicationResponseSchema = z.record(z.string(), z.unknown());

export const submitApplicationSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  responseData: applicationResponseSchema,
});

export type SubmitApplicationSchema = z.infer<typeof submitApplicationSchema>;
