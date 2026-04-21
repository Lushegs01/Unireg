"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { v4 as uuid } from "crypto";
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FilePlus,
  FileText,
  Grip,
  Loader2,
  Plus,
  Settings,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from "@/lib/actions/templates";
import { createTemplateSchema } from "@/lib/validations/template";
import type { CreateTemplateSchema } from "@/lib/validations/template";
import type { Department, FormTemplate } from "@/lib/supabase/types";
import { formatDateShort } from "@/lib/utils";

const FIELD_TYPE_ICONS: Record<string, React.ElementType> = {
  short_text: Type,
  long_text: FileText,
  select: ChevronDown,
  file_upload: Upload,
  checkbox_group: CheckSquare,
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  select: "Dropdown Select",
  file_upload: "File Upload",
  checkbox_group: "Checkbox Group",
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as CreateTemplateSchema["schemaJson"]["fields"][number]["type"][];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

type FieldType = "short_text" | "long_text" | "select" | "file_upload" | "checkbox_group";

interface TemplateBuilderProps {
  templates: (FormTemplate & { departments?: { name: string } | null })[];
  departments: Department[];
}

export default function TemplateBuilder({ templates, departments }: TemplateBuilderProps) {
  const [view, setView] = useState<"list" | "create">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
    useForm<CreateTemplateSchema>({
      resolver: zodResolver(createTemplateSchema),
      defaultValues: {
        name: "",
        description: "",
        departmentId: "",
        semester: "",
        isPublished: false,
        schemaJson: {
          fields: [
            {
              id: generateId(),
              type: "short_text",
              label: "",
              placeholder: "",
              required: false,
            },
          ],
        },
      },
    });

  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: "schemaJson.fields",
  });

  const watchedFields = watch("schemaJson.fields");

  const addField = (type: FieldType) => {
    append({
      id: generateId(),
      type,
      label: "",
      placeholder: "",
      required: false,
      options: type === "select" || type === "checkbox_group"
        ? [{ label: "Option 1", value: "option_1" }]
        : undefined,
    });
  };

  const addOption = (fieldIndex: number) => {
    const current = watchedFields[fieldIndex].options ?? [];
    const n = current.length + 1;
    setValue(`schemaJson.fields.${fieldIndex}.options`, [
      ...current,
      { label: `Option ${n}`, value: `option_${n}` },
    ]);
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const current = watchedFields[fieldIndex].options ?? [];
    setValue(
      `schemaJson.fields.${fieldIndex}.options`,
      current.filter((_, i) => i !== optIndex)
    );
  };

  const onSubmit = async (data: CreateTemplateSchema) => {
    setIsSubmitting(true);
    try {
      let result;
      if (editingId) {
        result = await updateTemplateAction(editingId, data);
      } else {
        result = await createTemplateAction(data);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editingId ? "Template updated." : "Template created.");
        reset();
        setView("list");
        setEditingId(null);
        // Refresh
        setTimeout(() => window.location.reload(), 800);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeletingId(id);
    const result = await deleteTemplateAction(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Template deleted.");
      setTimeout(() => window.location.reload(), 600);
    }
    setDeletingId(null);
  };

  const handleTogglePublish = async (template: FormTemplate) => {
    const result = await updateTemplateAction(template.id, {
      isPublished: !template.is_published,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(template.is_published ? "Template unpublished." : "Template published.");
      setTimeout(() => window.location.reload(), 600);
    }
  };

  if (view === "list") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? "s" : ""} total
          </p>
          <Button onClick={() => { reset(); setEditingId(null); setView("create"); }} className="gap-2">
            <FilePlus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No templates yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Create your first registration form template.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((tpl) => {
              const dept = tpl.departments as { name: string } | null;
              const fieldCount = (tpl.schema_json as { fields?: unknown[] })?.fields?.length ?? 0;
              return (
                <Card key={tpl.id} className="border border-border/60">
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{tpl.name}</p>
                        <Badge variant={tpl.is_published ? "success" : "secondary"} className="text-[10px] h-4 px-1.5">
                          {tpl.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dept?.name ?? "—"} · {tpl.semester} · {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                        {tpl.deadline && ` · Due ${formatDateShort(tpl.deadline)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleTogglePublish(tpl)}
                      >
                        {tpl.is_published ? (
                          <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                        ) : (
                          <><Eye className="w-3.5 h-3.5" /> Publish</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingId(tpl.id);
                          setView("create");
                        }}
                      >
                        <Settings className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:bg-destructive/10 text-xs"
                        onClick={() => handleDelete(tpl.id)}
                        disabled={deletingId === tpl.id}
                      >
                        {deletingId === tpl.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Create / Edit view
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-medium">
          {editingId ? "Edit Template" : "New Template"}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setView("list")}
        >
          ← Back to list
        </Button>
      </div>

      {/* Meta fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Semester Course Registration"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-semester">Semester *</Label>
              <Input
                id="tpl-semester"
                placeholder="e.g. 2024/2025 First Semester"
                {...register("semester")}
              />
              {errors.semester && (
                <p className="text-xs text-destructive">{errors.semester.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-dept">Department *</Label>
              <Select
                onValueChange={(v) => setValue("departmentId", v)}
                defaultValue={watch("departmentId")}
              >
                <SelectTrigger id="tpl-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departmentId && (
                <p className="text-xs text-destructive">{errors.departmentId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-deadline">Deadline (optional)</Label>
              <Input
                id="tpl-deadline"
                type="datetime-local"
                {...register("deadline")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Description (optional)</Label>
            <Textarea
              id="tpl-desc"
              placeholder="Brief description visible to students…"
              rows={2}
              {...register("description")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="tpl-published"
              checked={watch("isPublished")}
              onCheckedChange={(v) => setValue("isPublished", v === true)}
            />
            <Label htmlFor="tpl-published" className="cursor-pointer">
              Publish immediately (visible to students)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Schema builder */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Form Fields</CardTitle>
            <span className="text-xs text-muted-foreground">
              {fields.length} field{fields.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No fields yet. Add a field below.
            </p>
          )}

          {fields.map((field, index) => {
            const fieldType = watchedFields[index]?.type;
            const TypeIcon = FIELD_TYPE_ICONS[fieldType] ?? Type;
            const hasOptions = fieldType === "select" || fieldType === "checkbox_group";

            return (
              <div
                key={field.id}
                className="border border-border/60 rounded-xl overflow-hidden"
              >
                {/* Field header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
                  <Grip className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <TypeIcon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground flex-1">
                    {FIELD_TYPE_LABELS[fieldType] ?? "Field"} #{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => index > 0 && swap(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => index < fields.length - 1 && swap(index, index + 1)}
                      disabled={index === fields.length - 1}
                      className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Field body */}
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Field Label *</Label>
                      <Input
                        placeholder="e.g. Full Name, Course Unit…"
                        {...register(`schemaJson.fields.${index}.label`)}
                      />
                      {errors.schemaJson?.fields?.[index]?.label && (
                        <p className="text-xs text-destructive">
                          {errors.schemaJson.fields[index]?.label?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Field Type *</Label>
                      <Select
                        value={fieldType}
                        onValueChange={(v) => setValue(`schemaJson.fields.${index}.type`, v as FieldType)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {FIELD_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(fieldType === "short_text" || fieldType === "long_text") && (
                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder Text</Label>
                      <Input
                        placeholder="Hint shown inside the field…"
                        {...register(`schemaJson.fields.${index}.placeholder`)}
                      />
                    </div>
                  )}

                  {hasOptions && (
                    <div className="space-y-2">
                      <Label className="text-xs">Options</Label>
                      {watchedFields[index]?.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <Input
                            className="h-7 text-xs flex-1"
                            placeholder="Option label"
                            value={opt.label}
                            onChange={(e) => {
                              const opts = [...(watchedFields[index].options ?? [])];
                              opts[optIdx] = {
                                label: e.target.value,
                                value: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                              };
                              setValue(`schemaJson.fields.${index}.options`, opts);
                            }}
                          />
                          <span className="text-xs font-mono text-muted-foreground/50 w-24 truncate">
                            {opt.value || "—"}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeOption(index, optIdx)}
                            disabled={(watchedFields[index].options?.length ?? 0) <= 1}
                            className="p-1 text-muted-foreground/40 hover:text-destructive disabled:opacity-20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(index)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add option
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id={`required-${index}`}
                      checked={watchedFields[index]?.required ?? false}
                      onCheckedChange={(v) =>
                        setValue(`schemaJson.fields.${index}.required`, v === true)
                      }
                    />
                    <Label htmlFor={`required-${index}`} className="text-xs cursor-pointer">
                      Required field
                    </Label>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add field buttons */}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Add a field:</p>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map((type) => {
                const Icon = FIELD_TYPE_ICONS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addField(type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border/60 rounded-lg hover:border-primary/40 hover:bg-primary/4 transition-all"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {FIELD_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {errors.schemaJson?.fields && !Array.isArray(errors.schemaJson.fields) && (
            <p className="text-xs text-destructive">
              {(errors.schemaJson.fields as { message?: string }).message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center gap-3 pb-8">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting
            ? "Saving…"
            : editingId
            ? "Save Changes"
            : "Create Template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setView("list")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
