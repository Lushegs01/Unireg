import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DynamicForm from "@/components/forms/DynamicForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS, STATUS_VARIANTS, formatDateShort } from "@/lib/utils";
import type { FormSchema } from "@/lib/supabase/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Registration Form" };

interface Props {
  params: Promise<{ templateId: string }>;
}

export default async function ApplyPage({ params }: Props) {
  const { templateId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: template } = await supabase
    .from("form_templates")
    .select("*, departments(name)")
    .eq("id", templateId)
    .eq("is_published", true)
    .single();

  if (!template) notFound();

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("student_id", user.id)
    .eq("template_id", templateId)
    .single();

  const schema = template.schema_json as unknown as FormSchema;
  const isReadOnly =
    application !== null &&
    !["draft", "changes_requested"].includes(application?.status ?? "");

  const variant = application
    ? STATUS_VARIANTS[application.status] ?? "secondary"
    : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="animate-fade-in-1">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href="/dashboard/student">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Registrations
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span>
                {(template.departments as unknown as { name: string } | null)?.name}
              </span>
            </div>
            <h1 className="text-2xl font-display">{template.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{template.semester}</span>
              {template.deadline && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Calendar className="w-3.5 h-3.5" />
                  Deadline: {formatDateShort(template.deadline)}
                </span>
              )}
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                {template.description}
              </p>
            )}
          </div>

          {application && variant && (
            <Badge
              variant={variant as "default" | "secondary" | "destructive" | "outline"}
              className="shrink-0 mt-1"
            >
              {STATUS_LABELS[application.status]}
            </Badge>
          )}
        </div>
      </div>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border text-sm animate-fade-in-2">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">Read-only view</p>
            <p className="text-muted-foreground">
              This application has been submitted and cannot be edited.
              Status: <strong>{STATUS_LABELS[application!.status]}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Admin feedback */}
      {application?.admin_feedback &&
        application.status === "changes_requested" && (
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-sm animate-fade-in-2">
            <p className="font-medium text-destructive mb-1">
              Changes Requested
            </p>
            <p className="text-foreground">{application.admin_feedback}</p>
          </div>
        )}

      {/* Form */}
      <div className="animate-fade-in-3">
        <DynamicForm
          templateId={templateId}
          schema={schema}
          userId={user.id}
          existingData={
            (application?.response_data as Record<string, unknown>) ?? {}
          }
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}
