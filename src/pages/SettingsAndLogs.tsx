import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
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
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';
import { UserManagementPanel } from '@/pages/Users';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';


/* ================= PAGE ================= */

export const SettingsAndLogs: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const validTabs = ['general', 'users', 'categories', 'sla', 'logs'] as const;
  type SettingsTab = (typeof validTabs)[number];
  const currentTab: SettingsTab = validTabs.includes(tabFromQuery as SettingsTab)
    ? (tabFromQuery as SettingsTab)
    : 'general';
  const isLogsTab = currentTab === 'logs';

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
  const [purgeLogsOpen, setPurgeLogsOpen] = useState(false);
  const [isPurgingLogs, setIsPurgingLogs] = useState(false);
  const [logsRetentionDays, setLogsRetentionDays] = useState('90');
  const [businessTimezone, setBusinessTimezone] = useState('UTC');
  const [businessHoursStart, setBusinessHoursStart] = useState('09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState('18:00');
  const [businessDays, setBusinessDays] = useState('1,2,3,4,5');
  const [defaultTicketPriority, setDefaultTicketPriority] = useState('Low');
  const [defaultTicketStatus, setDefaultTicketStatus] = useState('open');
  const [defaultTicketCategoryId, setDefaultTicketCategoryId] = useState('');
  const [sessionIdleTimeoutMinutes, setSessionIdleTimeoutMinutes] = useState('120');
  const [attachmentMaxSizeMb, setAttachmentMaxSizeMb] = useState('10');
  const [attachmentAllowedTypes, setAttachmentAllowedTypes] = useState(
    'image/*'
  );
  const [lineGroupNotifyEnabled, setLineGroupNotifyEnabled] = useState(false);
  const [lineGroupNotifyEvents, setLineGroupNotifyEvents] = useState(
    'new_critical,sla_breach,reopened'
  );
  const [lineGroupNotifyMinPriority, setLineGroupNotifyMinPriority] =
    useState('high');
  const [isSendingLineTest, setIsSendingLineTest] = useState(false);

  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logSearchInput, setLogSearchInput] = useState('');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;
  const logsContainerRef = useRef<HTMLDivElement | null>(null);
  const logSearchRestoreRef = useRef<number | null>(null);

  const {
    data: logs,
    isLoading: isLoadingLogs,
  } = useLogs(logPage, logsPerPage, logSearchTerm, isLogsTab);
  const { data: ticketPriorities = [] } = useQuery({
    queryKey: ['ticket_priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_priorities')
        .select('id, name');
      if (error) throw error;
      return data ?? [];
    },
  });

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

    setLogsRetentionDays(
      settings.find(s => s.key === 'logs_retention_days')?.value || '90'
    );
    setBusinessTimezone(
      settings.find(s => s.key === 'business_timezone')?.value || 'UTC'
    );
    setBusinessHoursStart(
      settings.find(s => s.key === 'business_hours_start')?.value || '09:00'
    );
    setBusinessHoursEnd(
      settings.find(s => s.key === 'business_hours_end')?.value || '18:00'
    );
    setBusinessDays(
      settings.find(s => s.key === 'business_days')?.value || '1,2,3,4,5'
    );
    setDefaultTicketPriority(
      settings.find(s => s.key === 'default_ticket_priority')?.value || 'Low'
    );
    setDefaultTicketStatus(
      settings.find(s => s.key === 'default_ticket_status')?.value || 'open'
    );
    setDefaultTicketCategoryId(
      settings.find(s => s.key === 'default_ticket_category_id')?.value || ''
    );
    setSessionIdleTimeoutMinutes(
      settings.find(s => s.key === 'session_idle_timeout_minutes')?.value || '120'
    );
    setAttachmentMaxSizeMb(
      settings.find(s => s.key === 'attachment_max_size_mb')?.value || '10'
    );
    setAttachmentAllowedTypes(
      settings.find(s => s.key === 'attachment_allowed_types')?.value ||
        'image/*'
    );
    setLineGroupNotifyEnabled(
      settings.find(s => s.key === 'line_group_notify_enabled')?.value ===
        'true'
    );
    setLineGroupNotifyEvents(
      settings.find(s => s.key === 'line_group_notify_events')?.value ||
        'new_critical,sla_breach,reopened'
    );
    setLineGroupNotifyMinPriority(
      settings.find(s => s.key === 'line_group_notify_min_priority')?.value ||
        'high'
    );
  }, [settings, usersForAssignment]);

  const lineGroupEventOptions = [
    {
      key: 'new_critical',
      label: 'New critical ticket',
      description: 'Alert when a critical ticket is created.',
    },
    {
      key: 'sla_breach',
      label: 'SLA breach',
      description: 'Alert when a ticket enters SLA breach.',
    },
    {
      key: 'reopened',
      label: 'Ticket reopened',
      description: 'Alert when a closed ticket gets reopened.',
    },
    {
      key: 'new_high',
      label: 'New high ticket',
      description: 'Alert when a high-priority ticket is created.',
    },
    {
      key: 'assigned',
      label: 'Ticket assigned',
      description: 'Alert when assignee changes on a ticket.',
    },
  ] as const;

  const parseLineGroupEvents = (csv: string) =>
    new Set(
      csv
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    );

  const buildLineGroupEventsCsv = (set: Set<string>) =>
    lineGroupEventOptions
      .map((event) => event.key)
      .filter((key) => set.has(key))
      .join(',');

  const handleSendLineGroupTest = async () => {
    setIsSendingLineTest(true);
    try {
      const { data, error } = await supabase.rpc(
        'enqueue_line_group_test_notification',
        {
          p_message: 'Test alert from Settings page',
        }
      );
      if (error) throw error;
      notifySuccess('LINE test queued', `Job id: ${data}`);
    } catch (err: unknown) {
      notifyError('Failed to queue LINE test', getErrorMessage(err));
    } finally {
      setIsSendingLineTest(false);
    }
  };

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
    if (logsContainerRef.current) {
      logSearchRestoreRef.current = logsContainerRef.current.scrollTop;
    }
    setLogPage(1);
    setLogSearchTerm(logSearchInput.trim());
  };

  useEffect(() => {
    if (!isLogsTab || isLoadingLogs) return;
    if (logSearchRestoreRef.current === null) return;
    if (!logsContainerRef.current) return;
    logsContainerRef.current.scrollTop = logSearchRestoreRef.current;
    logSearchRestoreRef.current = null;
  }, [isLogsTab, isLoadingLogs, logs?.data]);

  const canManageCategories = isAdmin || isIT;
  const canManageSla = isAdmin || isIT;
  const canManageLogs = isAdmin || isIT;

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

  const handlePurgeLogs = async () => {
    const retention = Number(logsRetentionDays);
    if (!Number.isFinite(retention) || retention < 1) {
      notifyError('Invalid retention', 'Retention must be at least 1 day');
      return;
    }

    setIsPurgingLogs(true);
    try {
      const { data, error } = await supabase.rpc('purge_old_logs', {
        p_retention_days: retention,
      });
      if (error) throw error;

      const deleted = typeof data === 'number' ? data : 0;
      notifySuccess('Logs purged', `${deleted} old logs were removed`);
      await queryClient.invalidateQueries({ queryKey: ['logs'] });
    } catch (err: unknown) {
      notifyError('Failed to purge logs', getErrorMessage(err));
    } finally {
      setIsPurgingLogs(false);
      setPurgeLogsOpen(false);
    }
  };

  const handleSaveBusinessCalendar = async () => {
    const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!hhmm.test(businessHoursStart) || !hhmm.test(businessHoursEnd)) {
      notifyError('Invalid time', 'Use 24-hour format HH:MM');
      return;
    }

    if (businessHoursStart >= businessHoursEnd) {
      notifyError('Invalid window', 'Start time must be earlier than end time');
      return;
    }

    const parsedDays = businessDays
      .split(',')
      .map((d) => Number(d.trim()))
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);

    if (!parsedDays.length) {
      notifyError('Invalid business days', 'Use comma-separated values from 1 to 7');
      return;
    }

    const normalizedDays = Array.from(new Set(parsedDays)).sort((a, b) => a - b).join(',');
    const tz = businessTimezone.trim() || 'UTC';

    setSavingKey('business_calendar');
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'business_timezone', value: tz }),
        updateSetting.mutateAsync({ key: 'business_hours_start', value: businessHoursStart }),
        updateSetting.mutateAsync({ key: 'business_hours_end', value: businessHoursEnd }),
        updateSetting.mutateAsync({ key: 'business_days', value: normalizedDays }),
      ]);
      setBusinessDays(normalizedDays);
      notifySuccess('Business calendar updated');
    } catch (err: unknown) {
      notifyError('Failed to save business calendar', getErrorMessage(err));
    } finally {
      setSavingKey(null);
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
    isLoadingUsers
  ) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-1/3 rounded bg-muted animate-pulse"></div>
        <div className="h-5 w-1/2 rounded bg-muted animate-pulse"></div>
        <LoadingSkeleton count={6} className="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3" />
      </div>
    );
  }

  return (
    <motion.div className="flex flex-col gap-6 p-4 md:p-6" {...createFadeSlideUp(0)}>
      {/* ===== Page Header ===== */}
      <motion.div className="space-y-2" {...createFadeSlideUp(0.04)}>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Neturai IT Manager
        </p>
        <h1 className="text-3xl font-semibold">Settings & Logs</h1>
        <p className="text-muted-foreground">
          Manage system configuration and audit activity.
        </p>
      </motion.div>

      <motion.div {...createFadeSlideUp(0.08)}>
        <Tabs
          value={currentTab}
          onValueChange={(value) => {
            if (!validTabs.includes(value as SettingsTab)) return;
            setSearchParams({ tab: value });
          }}
        >
        <TabsList className="bg-muted/40 p-1 rounded-lg w-fit">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
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

              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="mb-3">
                  <div className="font-medium">Default ticket workflow</div>
                  <div className="text-sm text-muted-foreground">
                    Applied when creating new tickets.
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Category</div>
                    <Select
                      value={defaultTicketCategoryId || '__none__'}
                      onValueChange={(value) => {
                        const previous = defaultTicketCategoryId;
                        const next = value === '__none__' ? '' : value;
                        setDefaultTicketCategoryId(next);
                        void handleUpdateSetting(
                          'default_ticket_category_id',
                          next,
                          () => setDefaultTicketCategoryId(previous),
                          'Default category updated'
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default category" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6}>
                        <SelectItem value="__none__">None</SelectItem>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Priority</div>
                    <Select
                      value={defaultTicketPriority}
                      onValueChange={(value) => {
                        const previous = defaultTicketPriority;
                        setDefaultTicketPriority(value);
                        void handleUpdateSetting(
                          'default_ticket_priority',
                          value,
                          () => setDefaultTicketPriority(previous),
                          'Default priority updated'
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default priority" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6}>
                        {ticketPriorities.map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Status</div>
                    <Select
                      value={defaultTicketStatus}
                      onValueChange={(value) => {
                        const previous = defaultTicketStatus;
                        setDefaultTicketStatus(value);
                        void handleUpdateSetting(
                          'default_ticket_status',
                          value,
                          () => setDefaultTicketStatus(previous),
                          'Default status updated'
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default status" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6}>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="mb-3">
                  <div className="font-medium">Security</div>
                  <div className="text-sm text-muted-foreground">
                    Automatically sign out users after inactivity.
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:max-w-xs">
                  <Label>Idle session timeout</Label>
                  <Select
                    value={sessionIdleTimeoutMinutes}
                    onValueChange={(value) => {
                      const previous = sessionIdleTimeoutMinutes;
                      setSessionIdleTimeoutMinutes(value);
                      void handleUpdateSetting(
                        'session_idle_timeout_minutes',
                        value,
                        () => setSessionIdleTimeoutMinutes(previous),
                        'Security setting updated'
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={6}>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="mb-3">
                  <div className="font-medium">Attachment policy</div>
                  <div className="text-sm text-muted-foreground">
                    Enforce allowed file types and maximum upload size.
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="attachment-max-size-mb"
                      className="flex min-h-[40px] items-end"
                    >
                      Max file size (MB)
                    </Label>
                    <Input
                      id="attachment-max-size-mb"
                      inputMode="numeric"
                      className="h-9"
                      value={attachmentMaxSizeMb}
                      onChange={(e) => setAttachmentMaxSizeMb(e.target.value)}
                      onBlur={() => {
                        const parsed = Number(attachmentMaxSizeMb);
                        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
                          notifyError('Invalid attachment size', 'Use a number between 1 and 100 MB');
                          setAttachmentMaxSizeMb(
                            settings?.find((s) => s.key === 'attachment_max_size_mb')?.value || '10'
                          );
                          return;
                        }
                        void handleUpdateSetting(
                          'attachment_max_size_mb',
                          String(Math.floor(parsed)),
                          () =>
                            setAttachmentMaxSizeMb(
                              settings?.find((s) => s.key === 'attachment_max_size_mb')?.value || '10'
                            ),
                          'Attachment max size updated'
                        );
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="attachment-allowed-types"
                      className="flex min-h-[40px] items-end"
                    >
                      Allowed types
                    </Label>
                    <Input
                      id="attachment-allowed-types"
                      className="h-9"
                      value={attachmentAllowedTypes}
                      onChange={(e) => setAttachmentAllowedTypes(e.target.value)}
                      onBlur={() => {
                        const normalized = attachmentAllowedTypes
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .join(',');

                        if (!normalized) {
                          notifyError('Invalid allowed types', 'At least one type is required');
                          setAttachmentAllowedTypes(
                            settings?.find((s) => s.key === 'attachment_allowed_types')?.value ||
                              'image/*'
                          );
                          return;
                        }

                        void handleUpdateSetting(
                          'attachment_allowed_types',
                          normalized,
                          () =>
                            setAttachmentAllowedTypes(
                              settings?.find((s) => s.key === 'attachment_allowed_types')?.value ||
                                'image/*'
                            ),
                          'Attachment allowed types updated'
                        );
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated MIME or extension, e.g. image/*,.png,.jpg
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="mb-3">
                  <div className="font-medium">LINE group alert policy</div>
                  <div className="text-sm text-muted-foreground">
                    Configure high-signal alerts only for shared group channel.
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">Send test notification</div>
                      <div className="text-xs text-muted-foreground">
                        Queue a test message to verify LINE delivery flow.
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleSendLineGroupTest()}
                      disabled={isSendingLineTest}
                    >
                      {isSendingLineTest ? 'Queueing...' : 'Send test'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">Enable LINE group alerts</div>
                      <div className="text-xs text-muted-foreground">
                        Keep disabled until sender integration is ready.
                      </div>
                    </div>
                    <Switch
                      checked={lineGroupNotifyEnabled}
                      disabled={savingKey === 'line_group_notify_enabled'}
                      onCheckedChange={(checked) => {
                        const previous = lineGroupNotifyEnabled;
                        setLineGroupNotifyEnabled(checked);
                        void handleUpdateSetting(
                          'line_group_notify_enabled',
                          checked ? 'true' : 'false',
                          () => setLineGroupNotifyEnabled(previous),
                          'LINE group alert setting updated'
                        );
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    {lineGroupEventOptions.map((event) => {
                      const enabled = parseLineGroupEvents(lineGroupNotifyEvents).has(
                        event.key
                      );
                      return (
                        <div
                          key={event.key}
                          className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium">{event.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.description}
                            </div>
                          </div>
                          <Switch
                            checked={enabled}
                            disabled={savingKey === 'line_group_notify_events'}
                            onCheckedChange={(checked) => {
                              const previous = lineGroupNotifyEvents;
                              const nextSet = parseLineGroupEvents(previous);
                              if (checked) {
                                nextSet.add(event.key);
                              } else {
                                nextSet.delete(event.key);
                              }
                              const next = buildLineGroupEventsCsv(nextSet);
                              setLineGroupNotifyEvents(next);
                              void handleUpdateSetting(
                                'line_group_notify_events',
                                next,
                                () => setLineGroupNotifyEvents(previous),
                                'LINE group events updated'
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex max-w-xs flex-col gap-2">
                    <Label>Minimum priority</Label>
                    <Select
                      value={lineGroupNotifyMinPriority}
                      onValueChange={(value) => {
                        const previous = lineGroupNotifyMinPriority;
                        setLineGroupNotifyMinPriority(value);
                        void handleUpdateSetting(
                          'line_group_notify_min_priority',
                          value,
                          () => setLineGroupNotifyMinPriority(previous),
                          'LINE group min priority updated'
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select minimum priority" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6}>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ===== USERS ===== */}
        <TabsContent value="users" className="mt-6">
          <SettingsSection
            title="Users & Roles"
            description="Manage access control and profile administration"
          >
            <UserManagementPanel embedded />
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
              <div className="rounded-md border border-border/70 bg-muted/20 p-4">
                <div className="mb-3">
                  <div className="font-medium">Business hours & calendar</div>
                  <div className="text-sm text-muted-foreground">
                    SLA due dates are calculated using timezone, workday window, and business days.
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Timezone</div>
                    <Input
                      value={businessTimezone}
                      onChange={(e) => setBusinessTimezone(e.target.value)}
                      placeholder="UTC"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Start time</div>
                    <Input
                      type="time"
                      value={businessHoursStart}
                      onChange={(e) => setBusinessHoursStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">End time</div>
                    <Input
                      type="time"
                      value={businessHoursEnd}
                      onChange={(e) => setBusinessHoursEnd(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Business days (1-7)</div>
                    <Input
                      value={businessDays}
                      onChange={(e) => setBusinessDays(e.target.value)}
                      placeholder="1,2,3,4,5"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Example: Mon-Fri = 1,2,3,4,5 (ISO weekday; 7 = Sunday)
                  </p>
                  <Button
                    onClick={() => void handleSaveBusinessCalendar()}
                    disabled={savingKey === 'business_calendar'}
                  >
                    Save calendar
                  </Button>
                </div>
              </div>

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
            {canManageLogs && (
              <div className="mb-4 rounded-md border border-border/70 bg-muted/20 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="font-medium">Log retention policy</div>
                    <div className="text-sm text-muted-foreground">
                      Logs older than this threshold are eligible for purge.
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-[170px]">
                      <Select
                        value={logsRetentionDays}
                        onValueChange={(value) => {
                          const previous = logsRetentionDays;
                          setLogsRetentionDays(value);
                          void handleUpdateSetting(
                            'logs_retention_days',
                            value,
                            () => setLogsRetentionDays(previous),
                            'Log retention updated'
                          );
                        }}
                        disabled={savingKey === 'logs_retention_days'}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Retention" />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={6}>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="180">180 days</SelectItem>
                          <SelectItem value="365">365 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9"
                      onClick={() => setPurgeLogsOpen(true)}
                      disabled={isPurgingLogs}
                    >
                      Purge old logs
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <form
              onSubmit={handleLogSearch}
              className="flex gap-2 mb-4"
            >
              <Input
                placeholder="Search logs..."
                value={logSearchInput}
                onChange={e =>
                  setLogSearchInput(e.target.value)
                }
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </form>

            {isLoadingLogs ? (
              <LoadingSkeleton count={6} className="md:grid-cols-1" />
            ) : logs?.data.length ? (
              <>
                <div
                  ref={logsContainerRef}
                  className="rounded-md border max-h-[420px] overflow-y-auto"
                >
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
                              const logDetails =
                                (log.details as Record<string, unknown>) ?? null;
                              const { title, description } = mapLogToText(
                                log.action,
                                logDetails
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
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Page {logPage} of {totalLogPages} • Total {logs?.count ?? 0} logs
                    </div>
                    <Pagination>
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
                  </div>
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
      </motion.div>

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

      <AlertDialog open={purgeLogsOpen} onOpenChange={setPurgeLogsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge old logs</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove system logs older than {logsRetentionDays} days.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPurgingLogs}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurgeLogs}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPurgingLogs}
            >
              Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
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
