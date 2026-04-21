import { z } from "zod";

export const formFieldOptionSchema = z.object({
  label: z.string().min(1, "Option label is required"),
  value: z.string().min(1, "Option value is required"),
});

export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["short_text", "long_text", "select", "file_upload", "checkbox_group"]),
  label: z.string().min(1, "Field label is required"),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(formFieldOptionSchema).optional(),
  accept: z.string().optional(),
  maxSize: z.number().optional(),
});

export const formSchemaValidator = z.object({
  fields: z.array(formFieldSchema).min(1, "At least one field is required"),
});

export const createTemplateSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters"),
  description: z.string().optional(),
  departmentId: z.string().uuid("Please select a valid department"),
  semester: z.string().min(1, "Semester is required"),
  deadline: z.string().optional(),
  schemaJson: formSchemaValidator,
  isPublished: z.boolean().default(false),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  id: z.string().uuid(),
});

export type FormFieldSchema = z.infer<typeof formFieldSchema>;
export type CreateTemplateSchema = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateSchema = z.infer<typeof updateTemplateSchema>;
