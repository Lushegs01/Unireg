"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTemplateSchema } from "@/lib/validations/template";
import type { CreateTemplateSchema } from "@/lib/validations/template";

export async function createTemplateAction(data: CreateTemplateSchema) {
  const parsed = createTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role ?? "")) {
    return { error: "Not authorized" };
  }

  const { error } = await supabase.from("form_templates").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    department_id: parsed.data.departmentId,
    semester: parsed.data.semester,
    schema_json: parsed.data.schemaJson as unknown as import("@/lib/supabase/types").Json,
    is_published: parsed.data.isPublished,
    deadline: parsed.data.deadline || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/templates");
  return { success: true };
}

export async function updateTemplateAction(
  id: string,
  data: Partial<CreateTemplateSchema>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role ?? "")) {
    return { error: "Not authorized" };
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.departmentId !== undefined) updateData.department_id = data.departmentId;
  if (data.semester !== undefined) updateData.semester = data.semester;
  if (data.schemaJson !== undefined) updateData.schema_json = data.schemaJson;
  if (data.isPublished !== undefined) updateData.is_published = data.isPublished;
  if (data.deadline !== undefined) updateData.deadline = data.deadline || null;

  const { error } = await supabase
    .from("form_templates")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/templates");
  return { success: true };
}

export async function deleteTemplateAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role ?? "")) {
    return { error: "Not authorized" };
  }

  const { error } = await supabase
    .from("form_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/templates");
  return { success: true };
}
