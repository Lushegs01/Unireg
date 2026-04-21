import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TemplateBuilder from "@/components/admin/TemplateBuilder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Form Templates" };

export default async function TemplatesPage() {
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

  const { data: templates } = await supabase
    .from("form_templates")
    .select("*, departments(name)")
    .order("created_at", { ascending: false });

  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .eq("is_active", true);

  return (
    <div className="p-6 space-y-6">
      <div className="animate-fade-in-1">
        <h1 className="text-3xl font-display">Form Templates</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage registration form templates for each department
        </p>
      </div>

      <div className="animate-fade-in-2">
        <TemplateBuilder
          templates={templates ?? []}
          departments={departments ?? []}
        />
      </div>
    </div>
  );
}
