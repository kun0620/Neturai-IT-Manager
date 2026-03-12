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
import { useAdminUsers } from '@/hooks/useAdminUsers';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Globe2,
  Info,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCog,
  Users2,
  Wrench,
  XCircle,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { mapLogToText } from '@/features/logs/mapLogToText';
import { notifyError, notifySuccess } from '@/lib/notify';
import { motion } from 'motion/react';
import { createFadeSlideUp } from '@/lib/motion';
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
  const { data: adminUsers, isLoading: isLoadingAdminUsers } = useAdminUsers();
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
  const [slaDrafts, setSlaDrafts] = useState<
    Record<string, { response: string; resolution: string }>
  >({});
  const [slaPolicyEnabled, setSlaPolicyEnabled] = useState<Record<string, boolean>>({});
  const [slaSuccessMessage, setSlaSuccessMessage] = useState<string | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const [appLanguage, setAppLanguage] = useState('en-US');
  const [appDateFormat, setAppDateFormat] = useState('MM/DD/YYYY');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoAssignmentEnabled, setAutoAssignmentEnabled] = useState(true);
  const [publicPortalEnabled, setPublicPortalEnabled] = useState(true);
  const [manageRoleOpen, setManageRoleOpen] = useState(false);
  const [managedRoleKey, setManagedRoleKey] = useState<'admin' | 'it' | 'user'>('it');
  const [managedRoleDescription, setManagedRoleDescription] = useState(
    'Standard administrative role for regional IT leads. Grants comprehensive operational access while restricting financial configurations.'
  );
  const [managedRoleActive, setManagedRoleActive] = useState(true);
  const [managedRoleRules, setManagedRoleRules] = useState({
    approvalRequired: true,
    ticketManagement: true,
    assetManagement: true,
    billingAccess: false,
    securityModification: false,
  });

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

  useEffect(() => {
    if (!slaPolicies?.length) return;

    setSlaDrafts(
      Object.fromEntries(
        slaPolicies.map((policy) => [
          policy.id,
          {
            response: String(policy.response_time_hours ?? 0),
            resolution: String(policy.resolution_time_hours ?? 0),
          },
        ])
      )
    );

    setSlaPolicyEnabled(
      Object.fromEntries(slaPolicies.map((policy) => [policy.id, true]))
    );
  }, [slaPolicies]);

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
      setSettingsFeedback(successMessage ?? 'Settings saved');
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
      setSlaSuccessMessage('Policy updated successfully.');
    } catch (err: unknown) {
      notifyError('Failed to update SLA policy', getErrorMessage(err));
    }
  };

  const handleSlaDraftChange = (
    id: string,
    field: 'response' | 'resolution',
    value: string
  ) => {
    setSlaDrafts((current) => ({
      ...current,
      [id]: {
        response: current[id]?.response ?? '',
        resolution: current[id]?.resolution ?? '',
        [field]: value,
      },
    }));
  };

  const handleSlaDraftCommit = (
    id: string,
    field: 'response' | 'resolution',
    currentValue: number
  ) => {
    const draft = slaDrafts[id];
    const nextValue = field === 'response' ? draft?.response : draft?.resolution;

    void handleUpdateSla(
      id,
      field === 'response' ? 'response_time_hours' : 'resolution_time_hours',
      nextValue ?? String(currentValue),
      currentValue
    );
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
      setSettingsFeedback('Settings saved');
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

  const settingsNavItems = [
    { value: 'general', label: 'General' },
    { value: 'users', label: 'Users & Roles' },
    { value: 'categories', label: 'Categories' },
    { value: 'sla', label: 'SLA Policies' },
    { value: 'logs', label: 'System Logs' },
  ] as const;

  const priorityBadgeClassMap: Record<string, string> = {
    Critical:
      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    High:
      'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    Medium:
      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    Low:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };

  const priorityCategoryMap: Record<string, string> = {
    Critical: 'Hardware',
    High: 'Software',
    Medium: 'Network',
    Low: 'Access',
  };

  const formatSlaHours = (value: number | null | undefined) => {
    if (!Number.isFinite(value)) return '—';
    if (value === 0.5) return '30m';
    if (value === 1) return '1h';
    return `${value}h`;
  };

  const businessDaySet = new Set(
    businessDays
      .split(',')
      .map((day) => Number(day.trim()))
      .filter((day) => Number.isInteger(day))
  );

  const businessDayOptions = [
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 7 },
  ] as const;

  const toggleBusinessDay = (value: number) => {
    const next = new Set(businessDaySet);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    setBusinessDays(Array.from(next).sort((a, b) => a - b).join(','));
  };

  const roleCardConfigs = [
    {
      key: 'admin',
      title: 'Super Admin',
      description:
        'Unrestricted access to all system modules, configurations, and user management.',
      icon: ShieldCheck,
      badge: 'System Role',
      count: (adminUsers ?? []).filter((user) => user.role === 'admin').length,
      countLabel: 'Users',
      muted: false,
    },
    {
      key: 'it',
      title: 'IT Manager',
      description:
        'Full control over assets and tickets. Limited access to billing and global security settings.',
      icon: UserCog,
      count: (adminUsers ?? []).filter((user) => user.role === 'it').length,
      countLabel: 'Users',
      muted: false,
    },
    {
      key: 'user',
      title: 'Technician',
      description:
        'Focus on ticket resolution and asset viewing. Cannot modify system-wide settings.',
      icon: Wrench,
      count: (adminUsers ?? []).filter((user) => user.role === 'user').length,
      countLabel: 'Users',
      muted: false,
    },
    {
      key: 'custom',
      title: 'Create Custom Role',
      description: 'Define new policy',
      icon: Plus,
      count: 0,
      countLabel: '',
      muted: true,
    },
  ] as const;

  const permissionSections = [
    {
      title: 'Ticket Management',
      rows: [
        { label: 'View All Tickets', values: ['full', 'full', 'full', 'full'] as const },
        { label: 'Create & Edit Tickets', values: ['full', 'full', 'full', 'none'] as const },
        { label: 'Delete Tickets', values: ['full', 'conditional', 'none', 'none'] as const },
      ],
    },
    {
      title: 'Asset Control',
      rows: [
        { label: 'Inventory Monitoring', values: ['full', 'full', 'full', 'full'] as const },
        { label: 'Add/Remove Assets', values: ['full', 'full', 'none', 'none'] as const },
      ],
    },
    {
      title: 'System Settings',
      rows: [
        { label: 'Manage Users', values: ['full', 'none', 'none', 'none'] as const },
        { label: 'Security Configuration', values: ['full', 'none', 'none', 'none'] as const },
      ],
    },
  ] as const;

  const renderPermissionIcon = (value: 'full' | 'conditional' | 'none') => {
    if (value === 'full') {
      return <CheckCircle2 className="mx-auto h-4.5 w-4.5 text-emerald-500" />;
    }
    if (value === 'conditional') {
      return <AlertTriangle className="mx-auto h-4.5 w-4.5 text-orange-500" />;
    }
    return <XCircle className="mx-auto h-4.5 w-4.5 text-slate-300 dark:text-slate-700" />;
  };

  const managedRoleMeta = roleCardConfigs.find((role) => role.key === managedRoleKey);
  const ManagedRoleIcon = managedRoleMeta?.icon ?? UserCog;
  const managedRoleUsers = (adminUsers ?? []).filter((user) => user.role === managedRoleKey);
  const managedRoleAccessibleModules = Object.values(managedRoleRules).filter(Boolean).length;
  const handleOpenManageRole = (roleKey: 'admin' | 'it' | 'user') => {
    setManagedRoleKey(roleKey);

    if (roleKey === 'admin') {
      setManagedRoleDescription(
        'Core platform administrators with unrestricted access to every operational and configuration module.'
      );
      setManagedRoleActive(true);
      setManagedRoleRules({
        approvalRequired: true,
        ticketManagement: true,
        assetManagement: true,
        billingAccess: true,
        securityModification: true,
      });
    } else if (roleKey === 'user') {
      setManagedRoleDescription(
        'Frontline technical staff focused on ticket execution and asset visibility with restricted governance privileges.'
      );
      setManagedRoleActive(true);
      setManagedRoleRules({
        approvalRequired: false,
        ticketManagement: true,
        assetManagement: false,
        billingAccess: false,
        securityModification: false,
      });
    } else {
      setManagedRoleDescription(
        'Standard administrative role for regional IT leads. Grants comprehensive operational access while restricting financial configurations.'
      );
      setManagedRoleActive(true);
      setManagedRoleRules({
        approvalRequired: true,
        ticketManagement: true,
        assetManagement: true,
        billingAccess: false,
        securityModification: false,
      });
    }

    setManageRoleOpen(true);
  };

  return (
    <motion.div
      className="w-full space-y-6 bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-8"
      {...createFadeSlideUp(0)}
    >
      {/* ===== Page Header ===== */}
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        {...createFadeSlideUp(0.04)}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your organization's global configurations and service level targets.
          </p>
        </div>
        {currentTab === 'general' && settingsFeedback ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-4.5 w-4.5" />
            <span className="text-sm font-medium">{settingsFeedback}</span>
          </div>
        ) : (
          <Button
            variant="outline"
            className="h-10 border-slate-200 bg-white px-4 font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => {
              if (currentTab === 'sla' && canManageSla) {
                setResetSlaOpen(true);
              }
            }}
          >
            Reset to Defaults
          </Button>
        )}
      </motion.div>

      <motion.div {...createFadeSlideUp(0.08)}>
        <Tabs
          value={currentTab}
          onValueChange={(value) => {
            if (!validTabs.includes(value as SettingsTab)) return;
            setSearchParams({ tab: value });
          }}
        >
        <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
          {settingsNavItems.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="rounded-none border-b-2 border-transparent px-0 pb-4 pt-0 text-sm font-bold text-slate-500 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none dark:text-slate-400"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ===== GENERAL ===== */}
        <TabsContent value="general" className="mt-6">
          <div className="space-y-10">
            <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">App Preferences</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Regional settings for the administrative interface.
                </p>
              </div>
              <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm dark:bg-slate-900/50 lg:col-span-2">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Language</Label>
                    <Select
                      value={appLanguage}
                      onValueChange={(value) => {
                        const previous = appLanguage;
                        setAppLanguage(value);
                        void handleUpdateSetting('app_language', value, () => setAppLanguage(previous), 'Settings saved');
                      }}
                    >
                      <SelectTrigger className="h-10 border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6}>
                        <SelectItem value="en-US">English (United States)</SelectItem>
                        <SelectItem value="es-MX">Spanish (Mexico)</SelectItem>
                        <SelectItem value="fr-FR">French (France)</SelectItem>
                        <SelectItem value="de-DE">German (Germany)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Timezone</Label>
                    <Select
                      value={businessTimezone}
                      onValueChange={(value) => {
                        const previous = businessTimezone;
                        setBusinessTimezone(value);
                        void handleUpdateSetting('business_timezone', value, () => setBusinessTimezone(previous), 'Settings saved');
                      }}
                    >
                      <SelectTrigger className="h-10 border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6}>
                        <SelectItem value="America/Los_Angeles">(UTC-08:00) Pacific Time</SelectItem>
                        <SelectItem value="America/New_York">(UTC-05:00) Eastern Time</SelectItem>
                        <SelectItem value="Europe/London">(UTC+00:00) London</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] italic text-slate-400 dark:text-slate-500">Auto-detected from browser</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Date Format</Label>
                    <Select
                      value={appDateFormat}
                      onValueChange={(value) => {
                        const previous = appDateFormat;
                        setAppDateFormat(value);
                        void handleUpdateSetting('app_date_format', value, () => setAppDateFormat(previous), 'Settings saved');
                      }}
                    >
                      <SelectTrigger className="h-10 border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={6}>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">System Toggles</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Core engine behavioral settings and portal visibility.
                </p>
              </div>
              <div className="space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-white p-4 dark:bg-slate-900/50">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Maintenance Mode</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Disable ticket creation and portal access for end users</p>
                    </div>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={(checked) => {
                      const previous = maintenanceMode;
                      setMaintenanceMode(checked);
                      void handleUpdateSetting('maintenance_mode', checked ? 'true' : 'false', () => setMaintenanceMode(previous), 'Settings saved');
                    }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-white p-4 dark:bg-slate-900/50">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Auto-assignment Engine</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Automatically route incoming tickets based on load and skill</p>
                    </div>
                  </div>
                  <Switch
                    checked={autoAssignmentEnabled}
                    onCheckedChange={(checked) => {
                      const previous = autoAssignmentEnabled;
                      setAutoAssignmentEnabled(checked);
                      void handleUpdateSetting('auto_assignment_enabled', checked ? 'true' : 'false', () => setAutoAssignmentEnabled(previous), 'Settings saved');
                    }}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-white p-4 dark:bg-slate-900/50">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20">
                      <Globe2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Public Ticket Portal</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Allow users to submit tickets without logging in</p>
                    </div>
                  </div>
                  <Switch
                    checked={publicPortalEnabled}
                    onCheckedChange={(checked) => {
                      const previous = publicPortalEnabled;
                      setPublicPortalEnabled(checked);
                      void handleUpdateSetting('public_ticket_portal_enabled', checked ? 'true' : 'false', () => setPublicPortalEnabled(previous), 'Settings saved');
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Business Calendar</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Configure service availability for SLA calculations.
                </p>
              </div>
              <div className="rounded-xl border border-primary/10 bg-white p-6 shadow-sm dark:bg-slate-900/50 lg:col-span-2">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    {businessDayOptions.map((day) => {
                      const active = businessDaySet.has(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleBusinessDay(day.value)}
                          className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                            active
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Shift Start</Label>
                      <Input
                        type="time"
                        value={businessHoursStart}
                        onChange={(e) => setBusinessHoursStart(e.target.value)}
                        className="h-10 border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex justify-center pb-2 text-slate-400">
                      <span aria-hidden="true">→</span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Shift End</Label>
                      <Input
                        type="time"
                        value={businessHoursEnd}
                        onChange={(e) => setBusinessHoursEnd(e.target.value)}
                        className="h-10 border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-primary/5 pt-4">
                    <Button
                      className="h-10 bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
                      onClick={() => void handleSaveBusinessCalendar()}
                      disabled={savingKey === 'business_calendar'}
                    >
                      Save Schedule
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Integration Tools</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Diagnostic tools and webhook management.
                </p>
              </div>
              <div className="lg:col-span-2">
                <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Send className="h-7 w-7" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Webhook Diagnostics</h4>
                  <p className="mb-6 mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Verify your notification delivery path is correctly configured by sending a payload to the primary endpoint.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSendLineGroupTest()}
                    disabled={isSendingLineTest}
                    className="h-11 gap-2 border-primary/20 bg-white px-5 text-sm font-bold text-primary hover:border-primary hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-800"
                  >
                    <Send className="h-4.5 w-4.5" />
                    {isSendingLineTest ? 'Sending Test Notification...' : 'Send Test Notification'}
                  </Button>
                </div>
              </div>
            </section>
          </div>
          {false && <SettingsSection
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
          </SettingsSection>}
        </TabsContent>

        {/* ===== USERS ===== */}
        <TabsContent value="users" className="mt-6">
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Users &amp; Roles</h2>
              <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                Manage organizational access control, define custom roles, and assign permissions across your infrastructure.
                Secure your environment with granular role governance.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {roleCardConfigs.map((role) => {
                const Icon = role.icon;
                if (role.muted) {
                  return (
                    <div
                      key={role.key}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition-all hover:border-primary/40 hover:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-colors dark:bg-slate-700 dark:text-slate-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{role.title}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{role.description}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={role.key}
                    className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-primary/50 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      {role.badge ? (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {role.badge}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{role.title}</h3>
                    <p className="mt-1 mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{role.description}</p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Users2 className="h-3.5 w-3.5" />
                        {role.count} {role.countLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenManageRole(role.key as 'admin' | 'it' | 'user')}
                        className="text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Role Permission Matrix</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Detailed overview of capability distribution across roles.
                  </p>
                </div>
                <Button className="h-10 gap-2 bg-primary px-4 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary/90">
                  <UserCog className="h-4 w-4" />
                  Edit Permissions
                </Button>
              </div>

              {isLoadingAdminUsers ? (
                <div className="p-6">
                  <LoadingSkeleton count={4} className="md:grid-cols-2 xl:grid-cols-4" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800">
                          <th className="border-b border-slate-200 px-6 py-4 font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">Module / Permission</th>
                          <th className="border-b border-slate-200 px-6 py-4 text-center font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">Super Admin</th>
                          <th className="border-b border-slate-200 px-6 py-4 text-center font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">IT Manager</th>
                          <th className="border-b border-slate-200 px-6 py-4 text-center font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">Technician</th>
                          <th className="border-b border-slate-200 px-6 py-4 text-center font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">Viewer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {permissionSections.map((section) => (
                          <React.Fragment key={section.title}>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                              <td colSpan={5} className="px-6 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                {section.title}
                              </td>
                            </tr>
                            {section.rows.map((row) => (
                              <tr key={row.label}>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.label}</td>
                                {row.values.map((value, index) => (
                                  <td key={`${row.label}-${index}`} className="px-6 py-4 text-center">
                                    {renderPermissionIcon(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Full Access
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Conditional Access
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                      No Access
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {false && <SettingsSection
            title="Users & Roles"
            description="Manage access control and profile administration"
          >
          </SettingsSection>}
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
        <TabsContent value="sla" className="mt-6 space-y-5">
          {slaSuccessMessage ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span className="text-sm font-medium">{slaSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSlaSuccessMessage(null)}
                className="rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {slaPolicies?.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/50">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Priority</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Category</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">First Response Target</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Resolution Target</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Audit Trail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {slaPolicies.map((policy) => {
                        const draft = slaDrafts[policy.id];
                        const isCritical = policy.priority === 'Critical';
                        const isEnabled = slaPolicyEnabled[policy.id] ?? true;

                        return (
                          <tr
                            key={policy.id}
                            className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${priorityBadgeClassMap[policy.priority] ?? priorityBadgeClassMap.Low}`}
                              >
                                {isCritical ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
                                {policy.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                              {priorityCategoryMap[policy.priority] ?? 'General'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                              {canManageSla ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={draft?.response ?? String(policy.response_time_hours ?? 0)}
                                    onChange={(e) => handleSlaDraftChange(policy.id, 'response', e.target.value)}
                                    onBlur={() =>
                                      handleSlaDraftCommit(
                                        policy.id,
                                        'response',
                                        policy.response_time_hours ?? 0
                                      )
                                    }
                                    className="h-8 w-14 border-slate-200 bg-slate-50 px-2 text-sm focus-visible:ring-primary/20 dark:border-slate-700 dark:bg-slate-800"
                                  />
                                  <span className="text-sm font-medium text-slate-500">h</span>
                                </div>
                              ) : (
                                formatSlaHours(policy.response_time_hours)
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {canManageSla ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={draft?.resolution ?? String(policy.resolution_time_hours ?? 0)}
                                    onChange={(e) => handleSlaDraftChange(policy.id, 'resolution', e.target.value)}
                                    onBlur={() =>
                                      handleSlaDraftCommit(
                                        policy.id,
                                        'resolution',
                                        policy.resolution_time_hours ?? 0
                                      )
                                    }
                                    className={`h-8 w-14 px-2 text-sm focus-visible:ring-primary/20 dark:bg-slate-800 ${
                                      isCritical
                                        ? 'border-primary bg-primary/5'
                                        : 'border-slate-200 bg-slate-50 dark:border-slate-700'
                                    }`}
                                  />
                                  <span className="text-sm font-medium text-slate-500">h</span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  {formatSlaHours(policy.resolution_time_hours)}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setSlaPolicyEnabled((current) => ({
                                    ...current,
                                    [policy.id]: !(current[policy.id] ?? true),
                                  }))
                                }
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                                  isEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                                    isEnabled ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-6 py-4 text-xs italic text-slate-400">
                              {policy.updated_at
                                ? `Last updated on ${format(new Date(policy.updated_at), 'MMM d, yyyy')}`
                                : 'No recent changes recorded'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-xs font-medium tracking-wide text-slate-500">
                    Showing {slaPolicies.length} of {slaPolicies.length} policies
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-8 border-primary/20 bg-white px-3 text-xs font-bold text-primary hover:bg-primary/5 dark:bg-slate-900"
                    >
                      Configure Alerts
                    </Button>
                    <Button
                      className="h-8 bg-primary px-3 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:bg-primary/90"
                    >
                      Add Custom Policy
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No SLA Policies"
                  message="Define SLA rules per priority"
                />
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/5 p-4">
            <Info className="mt-0.5 h-4.5 w-4.5 text-primary" />
            <div className="text-sm">
              <span className="font-bold text-slate-900 dark:text-white">Pro Tip:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">
                SLA targets are calculated based on your Business Hours settings. Update them in{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams({ tab: 'general' });
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  General Settings
                </button>
                .
              </span>
            </div>
          </div>
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

      <Dialog open={manageRoleOpen} onOpenChange={setManageRoleOpen}>
        <DialogContent className="max-h-[95vh] max-w-[920px] overflow-hidden border-slate-200 bg-[#f6f6f8] p-0 dark:border-slate-800 dark:bg-[#161220]">
          <DialogTitle className="sr-only">Manage Role</DialogTitle>
          <DialogDescription className="sr-only">
            Review role details, assigned users, and governance settings.
          </DialogDescription>

          <div className="flex max-h-[95vh] flex-col overflow-hidden">
            <div className="border-b border-primary/10 bg-white px-8 pt-8 pb-6 dark:bg-slate-900">
              <div className="flex flex-col gap-1">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <span>Users &amp; Roles</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-500 dark:text-slate-400">Manage Role</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-black leading-none tracking-tight text-slate-900 dark:text-slate-100">
                      Manage Role
                    </h2>
                    <p className="mt-2 text-base font-normal text-slate-500 dark:text-slate-400">
                      Review role details, assigned users, and governance settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManageRoleOpen(false)}
                    className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-b border-primary/10 bg-white px-8 py-4 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-6 rounded-xl border border-primary/20 bg-primary/[0.03] p-5 dark:bg-primary/10">
                  <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
                    <ManagedRoleIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {managedRoleMeta?.title ?? 'IT Manager'}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {managedRoleUsers.length} users
                        </span>
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {managedRoleKey === 'admin' ? 'System role' : managedRoleKey === 'it' ? 'System role' : 'Operational role'}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-tight text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {managedRoleActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {managedRoleMeta?.description}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4" />
                  Duplicate Role
                </Button>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-12 gap-8 overflow-y-auto p-8">
              <div className="col-span-7 flex flex-col gap-8">
                <section>
                  <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-primary">
                    Role Details
                  </h4>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role Name</Label>
                      <Input
                        readOnly
                        value={managedRoleMeta?.title ?? ''}
                        className="h-10 cursor-not-allowed border-slate-200 bg-slate-100 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</Label>
                      <textarea
                        rows={3}
                        value={managedRoleDescription}
                        onChange={(e) => setManagedRoleDescription(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role Type</Label>
                        <Input
                          readOnly
                          value={managedRoleKey === 'admin' || managedRoleKey === 'it' ? 'System Defined' : 'Operational Role'}
                          className="h-10 cursor-not-allowed border-slate-200 bg-slate-100 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</Label>
                        <div className="flex h-full items-center">
                          <label className="inline-flex items-center">
                            <Switch checked={managedRoleActive} onCheckedChange={setManagedRoleActive} />
                            <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                              {managedRoleActive ? 'Active' : 'Disabled'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-primary">
                    Governance Rules
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:divide-slate-800">
                    {[
                      ['approvalRequired', 'Approval Required', 'Require MDM approval for destructive actions'],
                      ['ticketManagement', 'Ticket Management', 'Can assign and escalate support tickets'],
                      ['assetManagement', 'Asset Management', 'Can provision and retire hardware assets'],
                      ['billingAccess', 'Billing Access', 'Can view invoices and payment history'],
                      ['securityModification', 'Security Modification', 'Can modify global firewall and MFA settings'],
                    ].map(([key, label, helper]) => (
                      <div key={key} className="flex items-center justify-between p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{helper}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={managedRoleRules[key as keyof typeof managedRoleRules]}
                          onChange={(e) =>
                            setManagedRoleRules((current) => ({
                              ...current,
                              [key]: e.target.checked,
                            }))
                          }
                          className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="col-span-5 flex flex-col gap-8">
                <section className="flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">
                      Assigned Users
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400">
                      {managedRoleUsers.length} TOTAL
                    </span>
                  </div>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      className="h-10 border-slate-200 bg-white pl-10 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-3">
                    {managedRoleUsers.slice(0, 5).map((user, index) => {
                      const initials = (user.full_name ?? user.name ?? user.email ?? 'U')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join('');
                      const palette = [
                        'bg-primary/10 text-primary',
                        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                        'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                        'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
                      ][index % 5];

                      return (
                        <div
                          key={user.id}
                          className="group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white dark:hover:bg-slate-800"
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${palette}`}>
                            {initials || 'U'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                              {user.full_name ?? user.name ?? 'Unknown User'}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {(user.department ?? 'IT Team')} • {user.email}
                            </p>
                          </div>
                          <span className="text-lg text-slate-300 transition-colors group-hover:text-slate-500">⋮</span>
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" className="mt-4 flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                    <span>View all {managedRoleUsers.length} users</span>
                    <span>→</span>
                  </button>
                </section>

                <section>
                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-6 dark:bg-primary/20">
                    <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-primary">
                      Role Summary
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Modules Accessible</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {managedRoleAccessibleModules} / 5
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Last Updated</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">Oct 24, 2023</span>
                      </div>
                      <div className="border-t border-primary/10 pt-4">
                        <div className="flex gap-3">
                          <Info className="h-5 w-5 text-primary" />
                          <p className="text-xs italic leading-relaxed text-slate-600 dark:text-slate-400">
                            System roles have limited editable properties to ensure core platform stability.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-8 py-6 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setManageRoleOpen(false)}
                className="rounded-lg px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-primary/30 px-6 text-sm font-bold text-primary hover:bg-primary/5"
                >
                  Save as New Role
                </Button>
                <Button
                  type="button"
                  className="h-11 bg-primary px-8 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:brightness-110"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
