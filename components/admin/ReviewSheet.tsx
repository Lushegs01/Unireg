"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  MessageSquare,
  RotateCcw,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { adminUpdateApplicationAction } from "@/lib/actions/applications";
import { formatDate, STATUS_LABELS, STATUS_VARIANTS } from "@/lib/utils";
import type { FormField, FormSchema } from "@/lib/supabase/types";

interface ApplicationRecord {
  id: string;
  status: string;
  response_data: Record<string, unknown>;
  admin_feedback: string | null;
  submitted_at: string | null;
  updated_at: string;
  profiles: {
    full_name: string | null;
    email: string;
    student_id: string | null;
  } | null;
  form_templates: {
    name: string;
    semester: string;
    schema_json?: unknown;
    departments?: { name: string } | null;
  } | null;
}

interface ReviewSheetProps {
  application: ApplicationRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
}

export default function ReviewSheet({
  application,
  open,
  onOpenChange,
  onActionComplete,
}: ReviewSheetProps) {
  const [feedback, setFeedback] = useState("");
  const [isPending, setIsPending] = useState<string | null>(null);

  if (!application) return null;

  const schema = application.form_templates?.schema_json as unknown as FormSchema | undefined;
  const responseData = application.response_data ?? {};
  const student = application.profiles;
  const template = application.form_templates;
  const variant = STATUS_VARIANTS[application.status] ?? "secondary";

  const handleAction = async (action: "approve" | "request_changes") => {
    if (action === "request_changes" && !feedback.trim()) {
      toast.error("Please provide feedback when requesting changes.");
      return;
    }

    const status = action === "approve" ? "approved" : "changes_requested";
    setIsPending(action);

    const result = await adminUpdateApplicationAction(
      application.id,
      status as "approved" | "changes_requested",
      action === "request_changes" ? feedback.trim() : undefined
    );

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        action === "approve"
          ? "Application approved successfully."
          : "Change request sent to student."
      );
      setFeedback("");
      onActionComplete();
      onOpenChange(false);
    }

    setIsPending(null);
  };

  const renderAnswer = (field: FormField) => {
    const value = responseData[field.id];

    if (field.type === "checkbox_group") {
      const arr = (value as string[]) ?? [];
      return arr.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {arr.map((v) => {
            const opt = field.options?.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="px-2 py-0.5 text-xs bg-secondary rounded-full"
              >
                {opt?.label ?? v}
              </span>
            );
          })}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm italic">No selections</span>
      );
    }

    if (field.type === "file_upload") {
      const url = typeof value === "string" ? value : null;
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-2"
        >
          <Download className="w-3.5 h-3.5" />
          Download File
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      ) : (
        <span className="text-muted-foreground text-sm italic">No file uploaded</span>
      );
    }

    if (field.type === "select") {
      const opt = field.options?.find((o) => o.value === value);
      return (
        <span className="text-sm">
          {opt?.label ?? (value as string) ?? (
            <span className="text-muted-foreground italic">No answer</span>
          )}
        </span>
      );
    }

    return (
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {value ? String(value) : (
          <span className="text-muted-foreground italic">No answer</span>
        )}
      </p>
    );
  };

  const canTakeAction = ["pending", "under_review"].includes(application.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <SheetTitle className="text-lg">
                  {template?.name ?? "Application Review"}
                </SheetTitle>
                <SheetDescription className="mt-0.5">
                  {template?.semester} ·{" "}
                  {(template?.departments as { name: string } | null)?.name}
                </SheetDescription>
              </div>
              <Badge variant={variant as "default" | "secondary" | "destructive" | "outline"}>
                {STATUS_LABELS[application.status]}
              </Badge>
            </div>
          </SheetHeader>

          {/* Student info */}
          <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {student?.full_name ?? "Unknown Student"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {student?.email} · ID: {student?.student_id ?? "—"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-xs font-medium">
                {application.submitted_at
                  ? formatDate(application.submitted_at)
                  : "Not submitted"}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable form answers */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Form Responses
            </h3>

            {schema?.fields && schema.fields.length > 0 ? (
              schema.fields.map((field, idx) => (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground/50 w-5 text-right">
                      {idx + 1}.
                    </span>
                    <p className="text-sm font-medium">{field.label}</p>
                    {field.required && (
                      <span className="text-xs text-muted-foreground">(required)</span>
                    )}
                  </div>
                  <div className="ml-7">{renderAnswer(field)}</div>
                  {idx < schema.fields.length - 1 && (
                    <Separator className="mt-4 ml-7" />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No form schema available.
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Action panel */}
        {canTakeAction && (
          <div className="border-t border-border px-6 py-4 space-y-3 bg-background">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin Actions
            </h3>

            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-sm">
                Feedback / Change Request Note
              </Label>
              <Textarea
                id="feedback"
                placeholder="Describe what changes are needed (required for 'Request Changes')…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/8 hover:border-destructive/50"
                onClick={() => handleAction("request_changes")}
                disabled={!!isPending}
              >
                {isPending === "request_changes" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                Request Changes
              </Button>

              <Button
                variant="success"
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                onClick={() => handleAction("approve")}
                disabled={!!isPending}
              >
                {isPending === "approve" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve
              </Button>
            </div>
          </div>
        )}

        {/* Already reviewed notice */}
        {!canTakeAction && application.admin_feedback && (
          <div className="border-t border-border px-6 py-4 bg-background">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <RotateCcw className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  Admin Feedback
                </p>
                <p className="text-sm">{application.admin_feedback}</p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
