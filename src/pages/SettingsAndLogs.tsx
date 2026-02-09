import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from '@/components/ui/pagination';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import {
  useCategories,
  useCategoryStats,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';
import { useSLAPolicies, useUpdateSLAPolicy } from '@/hooks/useSLAPolicies';
import { useLogs } from '@/hooks/useLogs';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineEditableText } from '@/components/ui/inline-editable-text';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { mapLogToText } from '@/features/logs/mapLogToText';
import { notifyError, notifySuccess } from '@/lib/notify';


/* ================= PAGE ================= */

export const SettingsAndLogs: React.FC = () => {
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSetting = useUpdateSetting();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const {
    data: categoryStats,
    isLoading: isLoadingCategoryStats,
  } = useCategoryStats();
  const addCategory = useAddCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { data: slaPolicies, isLoading: isLoadingSLAPolicies } = useSLAPolicies();
  const updateSLAPolicy = useUpdateSLAPolicy();
  const { data: usersForAssignment, isLoading: isLoadingUsers } =
    useUsersForAssignment();
  const { isAdmin, isIT } = useCurrentProfile();

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(false);
  const [defaultAssigneeId, setDefaultAssigneeId] =
    useState<string | null>(null);
  const [defaultThemeDisplay, setDefaultThemeDisplay] =
    useState<string>('system');
  const [savingKey, setSavingKey] = useState<string | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [resetSlaOpen, setResetSlaOpen] = useState(false);

  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;

  const {
    data: logs,
    isLoading: isLoadingLogs,
  } = useLogs(logPage, logsPerPage, logSearchTerm);

  const getErrorMessage = (err: unknown) =>
    err instanceof Error ? err.message : 'Unknown error';

  useEffect(() => {
    if (!settings) return;

    setEmailNotificationsEnabled(
      settings.find(s => s.key === 'email_notifications_enabled')?.value ===
        'true'
    );

    const assigneeId = settings.find(
      s => s.key === 'default_assignee_id'
    )?.value;

    setDefaultAssigneeId(assigneeId ?? null);

    setDefaultThemeDisplay(
      settings.find(s => s.key === 'theme_default')?.value || 'system'
    );
  }, [settings, usersForAssignment]);

  const handleUpdateSetting = async (
    key: string,
    value: string,
    onRollback?: () => void,
    successMessage?: string
  ) => {
    setSavingKey(key);
    try {
      await updateSetting.mutateAsync({ key, value });
      notifySuccess(successMessage ?? 'Setting updated');
    } catch (err: unknown) {
      notifyError('Failed to update setting', getErrorMessage(err));
      onRollback?.();
    } finally {
      setSavingKey(null);
    }
  };

  const handleLogSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLogPage(1);
  };

  const canManageCategories = isAdmin || isIT;
  const canManageSla = isAdmin || isIT;

  const handleAddCategory = async () => {
    if (!canManageCategories) {
      notifyError('Permission denied', 'You cannot edit categories');
      return;
    }

    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      notifyError('Category name required');
      return;
    }

    const exists = categories?.some(
      c => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      notifyError('Category already exists');
      return;
    }

    try {
      await addCategory.mutateAsync({ name: trimmed });
      notifySuccess('Category added');
      setNewCategoryName('');
    } catch (err: unknown) {
      notifyError('Failed to add category', getErrorMessage(err));
    }
  };

  const handleRenameCategory = async (
    id: string,
    currentName: string,
    next: string | null
  ) => {
    if (!canManageCategories) {
      notifyError('Permission denied', 'You cannot edit categories');
      return;
    }

    const trimmed = (next ?? '').trim();
    if (!trimmed) {
      notifyError('Category name required');
      return;
    }

    if (trimmed === currentName) return;

    const exists = categories?.some(
      c =>
        c.id !== id &&
        c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      notifyError('Category already exists');
      return;
    }

    try {
      await updateCategory.mutateAsync({ id, name: trimmed });
      notifySuccess('Category updated');
    } catch (err: unknown) {
      notifyError('Failed to update category', getErrorMessage(err));
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      notifySuccess('Category deleted');
    } catch (err: unknown) {
      notifyError('Failed to delete category', getErrorMessage(err));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleUpdateSla = async (
    id: string,
    field: 'response_time_hours' | 'resolution_time_hours',
    next: string | null,
    currentValue: number
  ) => {
    if (!canManageSla) {
      notifyError('Permission denied', 'You cannot edit SLA policies');
      return;
    }

    const trimmed = (next ?? '').trim();
    if (!trimmed) {
      notifyError('Value required');
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      notifyError('Invalid number', 'Please enter a non-negative number');
      return;
    }

    if (parsed === currentValue) return;

    try {
      await updateSLAPolicy.mutateAsync({ id, [field]: parsed });
      notifySuccess('SLA policy updated');
    } catch (err: unknown) {
      notifyError('Failed to update SLA policy', getErrorMessage(err));
    }
  };


  const handleResetSla = async () => {
    if (!slaPolicies?.length) {
      setResetSlaOpen(false);
      return;
    }

    const defaults: Record<string, { response: number; resolution: number }> = {
      Low: { response: 48, resolution: 168 },
      Medium: { response: 24, resolution: 72 },
      High: { response: 8, resolution: 24 },
      Critical: { response: 1, resolution: 4 },
    };

    try {
      await Promise.all(
        slaPolicies.map(policy => {
          const fallback = defaults[policy.priority ?? ''];
          if (!fallback) return Promise.resolve();
          return updateSLAPolicy.mutateAsync({
            id: policy.id,
            response_time_hours: fallback.response,
            resolution_time_hours: fallback.resolution,
          });
        })
      );
      notifySuccess('SLA policies reset to defaults');
    } catch (err: unknown) {
      notifyError('Failed to reset SLA policies', getErrorMessage(err));
    } finally {
      setResetSlaOpen(false);
    }
  };

  const totalLogPages = logs
    ? Math.ceil(logs.count / logsPerPage)
    : 0;

  if (
    isLoadingSettings ||
    isLoadingCategories ||
    isLoadingCategoryStats ||
    isLoadingSLAPolicies ||
    isLoadingUsers ||
    isLoadingLogs
  ) {
    return <LoadingSpinner className="h-full" />;
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ===== Page Header ===== */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Neturai IT Manager
        </p>
        <h1 className="text-3xl font-semibold">Settings & Logs</h1>
        <p className="text-muted-foreground">
          Manage system configuration and audit activity.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="bg-muted/40 p-1 rounded-lg w-fit">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sla">SLA Policies</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        {/* ===== GENERAL ===== */}
        <TabsContent value="general" className="mt-6">
          <SettingsSection
            title="General Settings"
            description="Basic system configuration"
          >
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    Email Notifications
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Receive ticket updates by email
                  </div>
                </div>
                <Switch
                  checked={emailNotificationsEnabled}
                  disabled={savingKey === 'email_notifications_enabled'}
                  onCheckedChange={(checked) => {
                    const previous = emailNotificationsEnabled;
                    setEmailNotificationsEnabled(checked);
                    handleUpdateSetting(
                      'email_notifications_enabled',
                      checked ? 'true' : 'false',
                      () => setEmailNotificationsEnabled(previous),
                      'Email notifications updated'
                    );
                  }}
                />
              </div>

              <div>
                <div className="font-medium">Default Assignee</div>
                <div className="text-sm text-muted-foreground">
                  Automatically assigned user
                </div>
                <div className="mt-2 max-w-sm">
                  <Select
                    value={defaultAssigneeId ?? ''}
                    onValueChange={(value) => {
                      const previous = defaultAssigneeId;
                      const next = value || null;
                      setDefaultAssigneeId(next);
                      handleUpdateSetting(
                        'default_assignee_id',
                        value || '',
                        () => setDefaultAssigneeId(previous),
                        'Default assignee updated'
                      );
                    }}
                    disabled={savingKey === 'default_assignee_id'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6}>
                      <SelectItem value="">Unassigned</SelectItem>
                      {usersForAssignment?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email || u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="font-medium">Default Theme</div>
                <div className="text-sm text-muted-foreground">
                  Application appearance
                </div>
                <div className="mt-2 max-w-xs">
                  <Select
                    value={defaultThemeDisplay}
                    onValueChange={(value) => {
                      const previous = defaultThemeDisplay;
                      setDefaultThemeDisplay(value);
                      handleUpdateSetting(
                        'theme_default',
                        value,
                        () => setDefaultThemeDisplay(previous),
                        'Default theme updated'
                      );
                    }}
                    disabled={savingKey === 'theme_default'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6}>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ===== CATEGORIES ===== */}
        <TabsContent value="categories" className="mt-6">
          <SettingsSection
            title="Issue Categories"
            description="Ticket classification"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">Manage categories</div>
                  <div className="text-sm text-muted-foreground">
                    Add, rename, or remove ticket categories
                  </div>
                </div>
                {canManageCategories && (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Input
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-9"
                    />
                    <Button
                      onClick={handleAddCategory}
                      disabled={addCategory.isPending}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {categories?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[140px] text-right">
                        Tickets
                      </TableHead>
                      {canManageCategories && (
                        <TableHead className="w-[120px] text-right">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {canManageCategories ? (
                            <InlineEditableText
                              value={c.name}
                              onSave={(next) =>
                                handleRenameCategory(c.id, c.name, next)
                              }
                            />
                          ) : (
                            c.name
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {categoryStats?.find(stat => stat.category === c.name)
                            ?.count ?? 0}
                        </TableCell>
                        {canManageCategories && (
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setDeleteTarget({ id: c.id, name: c.name })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="No Categories"
                  message="No issue categories defined"
                />
              )}
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ===== SLA ===== */}
        <TabsContent value="sla" className="mt-6">
          <SettingsSection
            title="SLA Policies"
            description="Response & resolution targets"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Edit response and resolution targets per priority
                </div>
                {canManageSla && (
                  <Button
                    variant="secondary"
                    onClick={() => setResetSlaOpen(true)}
                  >
                    Reset to defaults
                  </Button>
                )}
              </div>

              {slaPolicies?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Priority</TableHead>
                      <TableHead>Response (hrs)</TableHead>
                      <TableHead>Resolution (hrs)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slaPolicies.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.priority}
                        </TableCell>
                        <TableCell>
                          {canManageSla ? (
                            <InlineEditableText
                              value={String(p.response_time_hours ?? 0)}
                              onSave={(next) =>
                                handleUpdateSla(
                                  p.id,
                                  'response_time_hours',
                                  next,
                                  p.response_time_hours ?? 0
                                )
                              }
                            />
                          ) : (
                            p.response_time_hours
                          )}
                        </TableCell>
                        <TableCell>
                          {canManageSla ? (
                            <InlineEditableText
                              value={String(p.resolution_time_hours ?? 0)}
                              onSave={(next) =>
                                handleUpdateSla(
                                  p.id,
                                  'resolution_time_hours',
                                  next,
                                  p.resolution_time_hours ?? 0
                                )
                              }
                            />
                          ) : (
                            p.resolution_time_hours
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="No SLA Policies"
                  message="Define SLA rules per priority"
                />
              )}
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ===== LOGS ===== */}
        <TabsContent value="logs" className="mt-6 space-y-4">
          <SettingsSection
            title="System Logs"
            description="Audit trail of system activity"
          >
            <form
              onSubmit={handleLogSearch}
              className="flex gap-2 mb-4"
            >
              <Input
                placeholder="Search logs..."
                value={logSearchTerm}
                onChange={e =>
                  setLogSearchTerm(e.target.value)
                }
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </form>

            {logs?.data.length ? (
              <>
                <div className="rounded-md border max-h-[420px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.data.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.created_at
                              ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {log.profiles?.name || log.profiles?.email || '—'}
                          </TableCell>
                          <TableCell>
                            {log.action}
                          </TableCell>
                          <TableCell className="space-y-1">
                            {(() => {
                              const { title, description } = mapLogToText(
                                log.action,
                                log.details as any
                              );

                              return (
                                <>
                                  <div className="font-medium">{title}</div>
                                  {description && (
                                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                                      {description}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalLogPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      {/* Previous */}
                      <PaginationItem>
                        <PaginationPrevious
                          aria-disabled={logPage <= 1}
                          className={
                            logPage <= 1
                              ? 'pointer-events-none opacity-50'
                              : ''
                          }
                          onClick={() => {
                            if (logPage <= 1) return;
                            setLogPage(prev => prev - 1);
                          }}
                        />
                      </PaginationItem>

                      {/* Page numbers */}
                      {Array.from({ length: totalLogPages }, (_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            isActive={logPage === i + 1}
                            onClick={() => setLogPage(i + 1)}
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      {/* Next */}
                      <PaginationItem>
                        <PaginationNext
                          aria-disabled={logPage >= totalLogPages}
                          className={
                            logPage >= totalLogPages
                              ? 'pointer-events-none opacity-50'
                              : ''
                          }
                          onClick={() => {
                            if (logPage >= totalLogPages) return;
                            setLogPage(prev => prev + 1);
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            ) : (
              <EmptyState
                title="No Logs"
                message="No system activity recorded"
              />
            )}
          </SettingsSection>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteTarget?.name}".
              Existing tickets may lose their category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCategory.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCategory.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetSlaOpen} onOpenChange={setResetSlaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset SLA policies</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore default response and resolution times for all
              priorities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSla}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={updateSLAPolicy.isPending}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ================= SECTION ================= */

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="px-6 py-4">{children}</div>
    </section>
  );
}
