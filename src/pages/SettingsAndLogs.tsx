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
import { useCategories } from '@/hooks/useCategories';
import { useSLAPolicies } from '@/hooks/useSLAPolicies';
import { useLogs } from '@/hooks/useLogs';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { mapLogToText } from '@/features/logs/mapLogToText';
import { notifyError, notifySuccess } from '@/lib/notify';


/* ================= PAGE ================= */

export const SettingsAndLogs: React.FC = () => {
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSetting = useUpdateSetting();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const { data: slaPolicies, isLoading: isLoadingSLAPolicies } = useSLAPolicies();
  const { data: usersForAssignment, isLoading: isLoadingUsers } =
    useUsersForAssignment();

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] =
    useState(false);
  const [defaultAssigneeId, setDefaultAssigneeId] =
    useState<string | null>(null);
  const [defaultThemeDisplay, setDefaultThemeDisplay] =
    useState<string>('system');
  const [savingKey, setSavingKey] = useState<string | null>(
    null
  );

  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;

  const {
    data: logs,
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
  } = useLogs(logPage, logsPerPage, logSearchTerm);

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
    } catch (err: any) {
      notifyError('Failed to update setting', err?.message);
      onRollback?.();
    } finally {
      setSavingKey(null);
    }
  };

  const handleLogSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLogPage(1);
  };

  const totalLogPages = logs
    ? Math.ceil(logs.count / logsPerPage)
    : 0;

  if (
    isLoadingSettings ||
    isLoadingCategories ||
    isLoadingSLAPolicies ||
    isLoadingUsers ||
    isLoadingLogs
  ) {
    return <LoadingSpinner className="h-full" />;
  }

  return (
    <div className="space-y-6">
      {/* ===== Page Header ===== */}
      <div>
        <h1 className="text-2xl font-bold">Settings & Logs</h1>
        <p className="text-muted-foreground">
          Manage system configuration and audit activity
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
            {categories?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.name}
                      </TableCell>
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
          </SettingsSection>
        </TabsContent>

        {/* ===== SLA ===== */}
        <TabsContent value="sla" className="mt-6">
          <SettingsSection
            title="SLA Policies"
            description="Response & resolution targets"
          >
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
                        {p.response_time_hours}
                      </TableCell>
                      <TableCell>
                        {p.resolution_time_hours}
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
