import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateShort, STATUS_LABELS, STATUS_VARIANTS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Plus,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Registrations" };

export default async function StudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, departments(name, code)")
    .eq("id", user.id)
    .single();

  // Fetch published forms for student's department
  const { data: availableForms } = profile?.department_id
    ? await supabase
        .from("form_templates")
        .select("*")
        .eq("department_id", profile.department_id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Fetch student's applications
  const { data: applications } = await supabase
    .from("applications")
    .select("*, form_templates(name, semester)")
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  const appliedTemplateIds = new Set(
    applications?.map((a) => a.template_id) ?? []
  );

  const newForms =
    availableForms?.filter((f) => !appliedTemplateIds.has(f.id)) ?? [];

  const dept = profile?.departments as unknown as { name: string; code: string } | null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in-1">
        <div>
          <h1 className="text-3xl font-display text-foreground">
            Welcome back,{" "}
            <span className="text-primary">
              {profile?.full_name?.split(" ")[0] ?? "Student"}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {dept?.name ?? "No department assigned"}{" "}
            {dept?.code && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                {dept.code}
              </span>
            )}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{profile?.student_id ?? "—"}</p>
          <p>Student ID</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 animate-fade-in-2">
        {[
          {
            label: "Total Registrations",
            value: applications?.length ?? 0,
            icon: FileText,
          },
          {
            label: "Pending Review",
            value:
              applications?.filter((a) =>
                ["pending", "under_review"].includes(a.status)
              ).length ?? 0,
            icon: Clock,
          },
          {
            label: "Open Forms",
            value: newForms.length,
            icon: Plus,
          },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/60">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-medium">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Forms */}
      <div className="animate-fade-in-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-medium">Open Registration Forms</h2>
          <span className="text-xs text-muted-foreground">
            {newForms.length} available
          </span>
        </div>

        {newForms.length === 0 ? (
          <Card className="border-dashed border-2 border-border/40">
            <CardContent className="py-12 text-center">
              <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">
                No registrations open at this time
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Check back later or contact your department office.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {newForms.map((form) => (
              <Card
                key={form.id}
                className="border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl uni-gradient flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{form.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {form.semester}
                      {form.deadline && (
                        <span className="ml-2 text-destructive">
                          · Deadline: {formatDateShort(form.deadline)}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link href={`/dashboard/student/apply/${form.id}`}>
                      Start
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* My Applications */}
      {applications && applications.length > 0 && (
        <div className="animate-fade-in-4">
          <h2 className="text-lg font-display font-medium mb-3">
            My Registrations
          </h2>
          <div className="grid gap-3">
            {applications.map((app) => {
              const tpl = app.form_templates as unknown as {
                name: string;
                semester: string;
              } | null;
              const variant = STATUS_VARIANTS[app.status] ?? "secondary";
              return (
                <Card
                  key={app.id}
                  className="border border-border/60 hover:border-primary/20 transition-all"
                >
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tpl?.name ?? "Unknown Form"}</p>
                      <p className="text-sm text-muted-foreground">
                        {tpl?.semester} ·{" "}
                        {app.submitted_at
                          ? `Submitted ${formatDateShort(app.submitted_at)}`
                          : `Last saved ${formatDateShort(app.updated_at)}`}
                      </p>
                      {app.admin_feedback &&
                        app.status === "changes_requested" && (
                          <p className="text-xs text-destructive mt-1 bg-destructive/5 px-2 py-1 rounded border border-destructive/20">
                            Admin note: {app.admin_feedback}
                          </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={variant as "default" | "secondary" | "destructive" | "outline"}>
                        {STATUS_LABELS[app.status]}
                      </Badge>
                      {["draft", "changes_requested"].includes(app.status) && (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/student/apply/${app.template_id}`}
                          >
                            Edit
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
