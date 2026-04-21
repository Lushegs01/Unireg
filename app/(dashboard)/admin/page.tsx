import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApplicationsTable from "@/components/admin/ApplicationsTable";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Applications" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role ?? "")) {
    redirect("/dashboard/student");
  }

  const { data: applications } = await supabase
    .from("applications")
    .select(
      `
      *,
      profiles:student_id (full_name, email, student_id, department_id),
      form_templates:template_id (name, semester, departments(name))
    `
    )
    .order("updated_at", { ascending: false });

  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .eq("is_active", true);

  return (
    <div className="p-6 space-y-6">
      <div className="animate-fade-in-1">
        <h1 className="text-3xl font-display">Application Review</h1>
        <p className="text-muted-foreground mt-1">
          Manage and review student registration submissions
        </p>
      </div>

      <div className="animate-fade-in-2">
        <ApplicationsTable
          applications={applications ?? []}
          departments={departments ?? []}
        />
      </div>
    </div>
  );
}
