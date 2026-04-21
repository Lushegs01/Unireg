"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp, Download, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReviewSheet from "@/components/admin/ReviewSheet";
import { formatDateShort, STATUS_LABELS, STATUS_VARIANTS, exportToCsv } from "@/lib/utils";
import type { Department, FormSchema } from "@/lib/supabase/types";

interface ApplicationRow {
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

type TabFilter = "all" | "pending" | "approved" | "changes_requested" | "under_review";

const TAB_FILTERS: { value: TabFilter; label: string; count?: number }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Needs Revision" },
];

export default function ApplicationsTable({
  applications,
  departments,
}: {
  applications: ApplicationRow[];
  departments: Department[];
}) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tableData, setTableData] = useState<ApplicationRow[]>(applications);

  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return tableData;
    return tableData.filter((a) => a.status === activeTab);
  }, [tableData, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tableData.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    return counts;
  }, [tableData]);

  const columns: ColumnDef<ApplicationRow>[] = useMemo(
    () => [
      {
        accessorFn: (row) => row.profiles?.full_name ?? "Unknown",
        id: "full_name",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Student
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-3 h-3" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-40" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm">
              {row.original.profiles?.full_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {row.original.profiles?.email}
            </p>
          </div>
        ),
      },
      {
        accessorFn: (row) => row.profiles?.student_id ?? "—",
        id: "student_id",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">Student ID</span>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue() as string}</span>
        ),
      },
      {
        accessorFn: (row) => row.form_templates?.name ?? "—",
        id: "form_name",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">Form</span>
        ),
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium truncate max-w-[160px]">
              {row.original.form_templates?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.form_templates?.semester}
            </p>
          </div>
        ),
      },
      {
        accessorFn: (row) =>
          (row.form_templates?.departments as { name: string } | null)?.name ?? "—",
        id: "department",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">Department</span>
        ),
        cell: ({ getValue }) => (
          <span className="text-sm">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: "submitted_at",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting()}
          >
            Submitted
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-3 h-3" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-40" />
            )}
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateShort(getValue() as string | null)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="text-xs font-semibold text-muted-foreground">Status</span>
        ),
        cell: ({ getValue }) => {
          const status = getValue() as string;
          const variant = STATUS_VARIANTS[status] ?? "secondary";
          return (
            <Badge variant={variant as "default" | "secondary" | "destructive" | "outline"}>
              {STATUS_LABELS[status] ?? status}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedApp(row.original);
              setSheetOpen(true);
            }}
            className="h-7 px-2 text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Review
          </Button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredByTab,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExportCsv = () => {
    const rows = table.getFilteredRowModel().rows.map((row) => ({
      "Student Name": row.original.profiles?.full_name ?? "—",
      "Student ID": row.original.profiles?.student_id ?? "—",
      Email: row.original.profiles?.email ?? "—",
      Form: row.original.form_templates?.name ?? "—",
      Semester: row.original.form_templates?.semester ?? "—",
      Department:
        (row.original.form_templates?.departments as { name: string } | null)?.name ?? "—",
      Status: STATUS_LABELS[row.original.status] ?? row.original.status,
      "Submitted At": row.original.submitted_at ?? "—",
      "Admin Feedback": row.original.admin_feedback ?? "",
    }));
    exportToCsv(
      `applications_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
          <TabsList className="h-8">
            {TAB_FILTERS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs px-2.5 h-6 gap-1.5"
              >
                {tab.label}
                {tab.value !== "all" && tabCounts[tab.value] !== undefined && (
                  <span className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded-full font-mono">
                    {tabCounts[tab.value]}
                  </span>
                )}
                {tab.value === "all" && (
                  <span className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded-full font-mono">
                    {tableData.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search students, forms…"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 text-sm w-full sm:w-56"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left first:pl-5 last:pr-5"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    {globalFilter
                      ? "No applications match your search."
                      : "No applications in this category."}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-card hover:bg-muted/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 first:pl-5 last:pr-5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          {table.getFilteredRowModel().rows.length} result
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Review Sheet */}
      <ReviewSheet
        application={selectedApp}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onActionComplete={() => {
          // Optimistically update status in table data
          if (selectedApp) {
            setTableData((prev) =>
              prev.map((a) =>
                a.id === selectedApp.id ? { ...a, ...selectedApp } : a
              )
            );
          }
        }}
      />
    </div>
  );
}
