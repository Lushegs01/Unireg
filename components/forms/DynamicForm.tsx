"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckSquare,
  Cloud,
  FileUp,
  Loader2,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { saveDraftAction, submitApplicationAction, uploadFileAction } from "@/lib/actions/applications";
import { formatFileSize } from "@/lib/utils";
import type { FormField, FormSchema } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface DynamicFormProps {
  templateId: string;
  schema: FormSchema;
  userId: string;
  existingData: Record<string, unknown>;
  readOnly: boolean;
}

type UploadState = {
  uploading: boolean;
  fileName?: string;
  fileSize?: number;
  url?: string;
  error?: string;
};

export default function DynamicForm({
  templateId,
  schema,
  userId,
  existingData,
  readOnly,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(existingData);
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  // Restore file URL display from existing data
  useEffect(() => {
    const fileFields = schema.fields.filter((f) => f.type === "file_upload");
    const initialUploadStates: Record<string, UploadState> = {};
    fileFields.forEach((field) => {
      const existing = existingData[field.id];
      if (existing && typeof existing === "string") {
        initialUploadStates[field.id] = {
          uploading: false,
          url: existing,
          fileName: "Previously uploaded file",
        };
      }
    });
    if (Object.keys(initialUploadStates).length > 0) {
      setUploadStates(initialUploadStates);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced auto-save
  const triggerAutoSave = useCallback(
    (data: Record<string, unknown>) => {
      if (readOnly) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setIsSaving(true);
        const result = await saveDraftAction(templateId, data);
        if (result.error) {
          toast.error("Draft save failed: " + result.error);
        } else {
          setLastSaved(new Date());
        }
        setIsSaving(false);
      }, 1500);
    },
    [templateId, readOnly]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    triggerAutoSave(formData);
  }, [formData, triggerAutoSave]);

  const updateField = (fieldId: string, value: unknown) => {
    if (readOnly) return;
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxGroup = (fieldId: string, optionValue: string, checked: boolean) => {
    if (readOnly) return;
    const current = (formData[fieldId] as string[]) ?? [];
    const next = checked
      ? [...current, optionValue]
      : current.filter((v) => v !== optionValue);
    updateField(fieldId, next);
  };

  const handleFileUpload = async (fieldId: string, file: File) => {
    if (readOnly) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

    if (file.size > MAX_SIZE) {
      setUploadStates((prev) => ({
        ...prev,
        [fieldId]: { uploading: false, error: "File exceeds 5MB limit" },
      }));
      toast.error("File must be under 5MB");
      return;
    }

    if (!ALLOWED.includes(file.type)) {
      setUploadStates((prev) => ({
        ...prev,
        [fieldId]: { uploading: false, error: "Invalid file type" },
      }));
      toast.error("Only PDF and image files are accepted");
      return;
    }

    setUploadStates((prev) => ({
      ...prev,
      [fieldId]: { uploading: true, fileName: file.name, fileSize: file.size },
    }));

    const fd = new FormData();
    fd.append("file", file);

    const result = await uploadFileAction(userId, fieldId, fd);

    if (result.error) {
      setUploadStates((prev) => ({
        ...prev,
        [fieldId]: { uploading: false, error: result.error },
      }));
      toast.error(result.error);
    } else {
      setUploadStates((prev) => ({
        ...prev,
        [fieldId]: {
          uploading: false,
          url: result.url,
          fileName: file.name,
          fileSize: file.size,
        },
      }));
      updateField(fieldId, result.url);
      toast.success("File uploaded successfully");
    }
  };

  const clearFile = (fieldId: string) => {
    if (readOnly) return;
    setUploadStates((prev) => ({ ...prev, [fieldId]: { uploading: false } }));
    updateField(fieldId, null);
  };

  const handleSubmit = async () => {
    if (readOnly) return;

    // Validate required fields
    const missing = schema.fields.filter((field) => {
      if (!field.required) return false;
      const val = formData[field.id];
      if (field.type === "checkbox_group") return !val || (val as string[]).length === 0;
      if (field.type === "file_upload") return !uploadStates[field.id]?.url && !val;
      return !val || (typeof val === "string" && val.trim() === "");
    });

    if (missing.length > 0) {
      toast.error(`Please complete required fields: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitApplicationAction(templateId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Application submitted successfully!");
        setTimeout(() => {
          window.location.href = "/dashboard/student";
        }, 1200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const uploadState = uploadStates[field.id];

    return (
      <Card
        key={field.id}
        className={cn(
          "border border-border/60 transition-all",
          readOnly && "opacity-80"
        )}
      >
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex items-start gap-1.5">
            <Label
              htmlFor={`field-${field.id}`}
              className="text-sm font-medium leading-snug"
            >
              {field.label}
            </Label>
            {field.required && !readOnly && (
              <span className="text-destructive text-xs mt-0.5">*</span>
            )}
          </div>

          {/* Short text */}
          {field.type === "short_text" && (
            <Input
              id={`field-${field.id}`}
              placeholder={readOnly ? "" : field.placeholder}
              value={(value as string) ?? ""}
              onChange={(e) => updateField(field.id, e.target.value)}
              readOnly={readOnly}
              className={cn(readOnly && "bg-muted cursor-default")}
            />
          )}

          {/* Long text */}
          {field.type === "long_text" && (
            <Textarea
              id={`field-${field.id}`}
              placeholder={readOnly ? "" : field.placeholder}
              value={(value as string) ?? ""}
              onChange={(e) => updateField(field.id, e.target.value)}
              readOnly={readOnly}
              rows={4}
              className={cn(readOnly && "bg-muted cursor-default resize-none")}
            />
          )}

          {/* Select */}
          {field.type === "select" && (
            <Select
              value={(value as string) ?? ""}
              onValueChange={(v) => updateField(field.id, v)}
              disabled={readOnly}
            >
              <SelectTrigger id={`field-${field.id}`}>
                <SelectValue placeholder={field.placeholder ?? "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Checkbox group */}
          {field.type === "checkbox_group" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {field.options?.map((opt) => {
                const checked = ((value as string[]) ?? []).includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/50 cursor-pointer transition-colors",
                      checked && "border-primary/40 bg-primary/5",
                      readOnly && "cursor-default"
                    )}
                  >
                    <Checkbox
                      id={`${field.id}-${opt.value}`}
                      checked={checked}
                      onCheckedChange={(c) =>
                        handleCheckboxGroup(field.id, opt.value, c === true)
                      }
                      disabled={readOnly}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          {/* File upload */}
          {field.type === "file_upload" && (
            <div>
              {uploadState?.url ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/8 border border-success/20">
                  <CheckSquare className="w-4 h-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-success truncate">
                      {uploadState.fileName}
                    </p>
                    {uploadState.fileSize && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadState.fileSize)}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => clearFile(field.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {readOnly && (
                    <a
                      href={uploadState.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline underline-offset-2 shrink-0"
                    >
                      Download
                    </a>
                  )}
                </div>
              ) : uploadState?.uploading ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{uploadState.fileName}</p>
                    <p className="text-xs text-muted-foreground">Uploading…</p>
                  </div>
                </div>
              ) : (
                !readOnly && (
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border/60 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/4",
                      uploadState?.error && "border-destructive/40"
                    )}
                  >
                    <FileUp className="w-6 h-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Click to upload</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        PDF, JPEG, PNG, WebP · Max 5MB
                      </p>
                    </div>
                    {uploadState?.error && (
                      <p className="text-xs text-destructive">{uploadState.error}</p>
                    )}
                    <input
                      id={`field-${field.id}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(field.id, file);
                      }}
                    />
                  </label>
                )
              )}
              {readOnly && !uploadState?.url && (
                <p className="text-sm text-muted-foreground italic">No file uploaded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!schema?.fields?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          This form has no fields configured.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {schema.fields.map(renderField)}

      {/* Footer actions */}
      {!readOnly && (
        <div className="flex items-center justify-between pt-2 pb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <Cloud className="w-3.5 h-3.5 animate-pulse" />
                Saving draft…
              </>
            ) : lastSaved ? (
              <>
                <Save className="w-3.5 h-3.5 text-success" />
                Saved{" "}
                {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Auto-saves as you type
              </>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isSaving}
            size="lg"
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isSubmitting ? "Submitting…" : "Submit Application"}
          </Button>
        </div>
      )}
    </div>
  );
}
