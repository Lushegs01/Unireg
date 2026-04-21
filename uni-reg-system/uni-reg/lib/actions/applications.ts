"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/supabase/types";

export async function saveDraftAction(
  templateId: string,
  responseData: Record<string, unknown>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if application exists
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("student_id", user.id)
    .eq("template_id", templateId)
    .single();

  if (existing) {
    // Only allow updates to draft / changes_requested
    if (!["draft", "changes_requested"].includes(existing.status)) {
      return { error: "Cannot edit a submitted application" };
    }

    const { error } = await supabase
      .from("applications")
      .update({ response_data: responseData, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) return { error: error.message };
    return { success: true, applicationId: existing.id };
  } else {
    const { data, error } = await supabase
      .from("applications")
      .insert({
        student_id: user.id,
        template_id: templateId,
        status: "draft",
        response_data: responseData,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    return { success: true, applicationId: data.id };
  }
}

export async function submitApplicationAction(
  templateId: string,
  responseData: Record<string, unknown>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("student_id", user.id)
    .eq("template_id", templateId)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    if (!["draft", "changes_requested"].includes(existing.status)) {
      return { error: "Application already submitted" };
    }

    const { error } = await supabase
      .from("applications")
      .update({
        status: "pending",
        response_data: responseData,
        submitted_at: now,
        admin_feedback: null,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("applications").insert({
      student_id: user.id,
      template_id: templateId,
      status: "pending",
      response_data: responseData,
      submitted_at: now,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/student");
  return { success: true };
}

export async function uploadFileAction(
  studentId: string,
  fieldId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  if (file.size > 5 * 1024 * 1024) {
    return { error: "File size must be less than 5MB" };
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only PDF and image files are accepted" };
  }

  const ext = file.name.split(".").pop();
  const path = `${studentId}/${fieldId}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("registration-docs")
    .upload(path, file, { upsert: true });

  if (error) return { error: error.message };

  const { data: signedData } = await supabase.storage
    .from("registration-docs")
    .createSignedUrl(path, 3600);

  return { url: signedData?.signedUrl ?? path };
}

export async function adminUpdateApplicationAction(
  applicationId: string,
  status: ApplicationStatus,
  feedback?: string
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

  const { error } = await supabase
    .from("applications")
    .update({
      status,
      admin_feedback: feedback ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function getSignedUrlAction(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("registration-docs")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
