import { useEffect, useMemo, useState } from 'react';
import { AssetWithType } from '@/types/asset';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { AssetDynamicSection } from './AssetDynamicSection';
import { AssetHistory } from './AssetHistory';

import { useAssetFields } from '@/hooks/useAssetFields';
import { useAssetFieldValues } from '@/hooks/useAssetFieldValues';
import { useAssetLogs } from '../hooks/useAssetLogs';
import { useUserNames } from '../hooks/useUserNames';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useAuth } from '@/hooks/useAuth';
import { notifyError, notifySuccess } from '@/lib/notify';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logSystemAction } from '@/features/logs/utils/logSystemAction';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/types/supabase';
import { useTicketDrawer } from '@/context/TicketDrawerContext';

/* ================= TYPES ================= */

type SimpleUser = {
  id: string;
  name: string;
};

type Props = {
  asset: AssetWithType | null;
  open: boolean;
  onClose: () => void;
  onEdit: (asset: AssetWithType) => void;
  users: SimpleUser[];
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  positionLabel?: string;
};

const ASSET_DRAWER_SECTIONS_KEY = 'neturai_asset_drawer_sections_v1';
type QuickActionKey = 'assign_me' | 'status_repair' | 'status_available' | null;
type QuickActionUpdates = Partial<Pick<AssetWithType, 'assigned_to' | 'status'>>;
type QuickActionErrorState = {
  message: string;
  pending: {
    actionKey: Exclude<QuickActionKey, null>;
    updates: QuickActionUpdates;
    successMessage: string;
  };
};
type RelatedTicket = Pick<
  Database['public']['Tables']['tickets']['Row'],
  'id' | 'title' | 'status' | 'priority' | 'created_at'
>;

/* ================= COMPONENT ================= */

export function AssetDrawer({
  asset,
  open,
  onClose,
  onEdit,
  users,
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  positionLabel,
}: Props) {
  // ✅ Hooks MUST be called first
  const { can } = useCurrentProfile();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { openDrawer } = useTicketDrawer();

  const assetId: string | undefined = asset?.id;
  const assetTypeId: string | undefined = asset?.asset_type?.id;

  const { data: assetFields = [] } = useAssetFields(assetTypeId);
  const { data: rawCustomValues = {} } = useAssetFieldValues(assetId);
  const { data: headerLogs = [] } = useAssetLogs(assetId ?? '');
  const latestHeaderLog = headerLogs[0];
  const { nameMap: latestActorNameMap } = useUserNames([
    latestHeaderLog?.performed_by ?? null,
  ]);

  const canViewHistory = can('asset.history.view');
  const canViewTickets = can('ticket.view');
  const hasSpecs = assetFields.length > 0;

  const availableSections = useMemo(() => {
    const sections = ['info'];
    if (hasSpecs) sections.push('specs');
    if (canViewTickets) sections.push('related');
    if (canViewHistory) sections.push('history');
    return sections;
  }, [hasSpecs, canViewTickets, canViewHistory]);

  const defaultSections = useMemo(
    () => ['info', ...(hasSpecs ? ['specs'] : [])],
    [hasSpecs]
  );

  const [expandedSections, setExpandedSections] = useState<string[]>(defaultSections);
  const [quickActionLoading, setQuickActionLoading] = useState<QuickActionKey>(null);
  const [quickActionError, setQuickActionError] =
    useState<QuickActionErrorState | null>(null);
  const [displayStatus, setDisplayStatus] = useState<AssetWithType['status'] | null>(
    asset?.status ?? null
  );
  const [displayAssignedTo, setDisplayAssignedTo] = useState<string | null>(
    asset?.assigned_to ?? null
  );
  const relatedAssetKeywords = useMemo(() => {
    const values = [asset?.asset_code ?? '', asset?.name ?? '']
      .map((v) => v.trim())
      .filter((v) => v.length >= 2)
      .map((v) => v.replace(/,/g, ' '));
    return Array.from(new Set(values));
  }, [asset?.asset_code, asset?.name]);

  const { data: relatedTickets = [], isLoading: relatedTicketsLoading } = useQuery({
    queryKey: ['asset-related-tickets', asset?.id, relatedAssetKeywords.join('|')],
    enabled: !!asset?.id && relatedAssetKeywords.length > 0 && canViewTickets,
    queryFn: async () => {
      const filters = relatedAssetKeywords.flatMap((keyword) => [
        `title.ilike.%${keyword}%`,
        `description.ilike.%${keyword}%`,
      ]);
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, created_at')
        .or(filters.join(','))
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data ?? []) as RelatedTicket[];
    },
  });

  const customValues: Record<string, string> = Object.fromEntries(
    Object.entries(rawCustomValues).map(([k, v]) => [k, v ?? ''])
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrev && onPrev) {
        event.preventDefault();
        onPrev();
      }
      if (event.key === 'ArrowRight' && hasNext && onNext) {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, hasPrev, hasNext, onPrev, onNext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(ASSET_DRAWER_SECTIONS_KEY);
      if (!raw) {
        setExpandedSections(defaultSections);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setExpandedSections(defaultSections);
        return;
      }
      const filtered = parsed
        .filter((value): value is string => typeof value === 'string')
        .filter((value) => availableSections.includes(value));
      setExpandedSections(filtered.length > 0 ? filtered : defaultSections);
    } catch {
      setExpandedSections(defaultSections);
    }
  }, [availableSections, defaultSections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      ASSET_DRAWER_SECTIONS_KEY,
      JSON.stringify(expandedSections)
    );
  }, [expandedSections]);

  useEffect(() => {
    setDisplayStatus(asset?.status ?? null);
    setDisplayAssignedTo(asset?.assigned_to ?? null);
    setQuickActionError(null);
  }, [asset?.id, asset?.status, asset?.assigned_to]);

  // ✅ Early return AFTER hooks
  if (!asset) return null;

  const currentStatus = displayStatus ?? asset.status;
  const currentAssignedTo = displayAssignedTo;
  const assignedUser =
    users.find((u) => u.id === currentAssignedTo)?.name ?? '—';
  const canEditAsset = can('asset.edit');
  const canChangeAssetStatus = can('asset.status.change');
  const assignToMeDisabledReason = !session?.user?.id
    ? 'Please sign in first'
    : !can('asset.assign')
      ? 'You do not have permission to assign assets'
      : currentAssignedTo === session.user.id
        ? 'This asset is already assigned to you'
        : quickActionLoading !== null
          ? 'Action in progress'
          : null;
  const markInRepairDisabledReason = !canChangeAssetStatus
    ? 'You do not have permission to change status'
    : currentStatus === 'In Repair'
      ? 'Asset is already in repair'
      : quickActionLoading !== null
        ? 'Action in progress'
        : null;
  const markAvailableDisabledReason = !canChangeAssetStatus
    ? 'You do not have permission to change status'
    : currentStatus === 'Available'
      ? 'Asset is already available'
      : quickActionLoading !== null
        ? 'Action in progress'
        : null;

  const copyText = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess('Copied', `${label} copied to clipboard`);
    } catch {
      notifyError('Copy failed', 'Unable to copy text');
    }
  };

  const statusVariant =
    currentStatus === 'Available'
      ? 'default'
      : currentStatus === 'Assigned'
        ? 'secondary'
        : currentStatus === 'In Repair'
          ? 'outline'
          : 'destructive';
  const lastUpdatedAt = latestHeaderLog?.created_at ?? asset.updated_at;
  const lastUpdatedBy = latestHeaderLog?.performed_by
    ? latestActorNameMap[latestHeaderLog.performed_by] ?? 'Unknown user'
    : 'System';

  const runQuickAction = async (
    actionKey: Exclude<QuickActionKey, null>,
    updates: QuickActionUpdates,
    successMessage: string
  ) => {
    setQuickActionError(null);
    setQuickActionLoading(actionKey);

    const previousStatus = currentStatus;
    const previousAssignedTo = currentAssignedTo;

    if (updates.status) {
      setDisplayStatus(updates.status);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'assigned_to')) {
      setDisplayAssignedTo(updates.assigned_to ?? null);
    }

    const { error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', asset.id);

    if (error) {
      setDisplayStatus(previousStatus);
      setDisplayAssignedTo(previousAssignedTo);
      setQuickActionError({
        message: error.message,
        pending: { actionKey, updates, successMessage },
      });
      notifyError('Action failed', error.message);
      setQuickActionLoading(null);
      return;
    }

    const userId = session?.user?.id ?? null;
    if (updates.status && updates.status !== previousStatus) {
      await logSystemAction({
        action: 'asset.status_changed',
        details: {
          asset_id: asset.id,
          asset_code: asset.asset_code,
          from: previousStatus,
          to: updates.status,
        },
        userId,
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, 'assigned_to') &&
      updates.assigned_to !== previousAssignedTo
    ) {
      await logSystemAction({
        action: 'asset.assigned_changed',
        details: {
          asset_id: asset.id,
          asset_code: asset.asset_code,
          from: previousAssignedTo,
          to: updates.assigned_to ?? null,
        },
        userId,
      });
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['asset-logs', asset.id] }),
      queryClient.invalidateQueries({ queryKey: ['logs'] }),
    ]);

    notifySuccess('Updated', successMessage);
    setQuickActionError(null);
    setQuickActionLoading(null);
  };

  const openRelatedTicket = (ticketId: string) => {
    navigate('/tickets');
    requestAnimationFrame(() => openDrawer(ticketId));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[420px] p-0 flex flex-col">
        {/* ===== Header ===== */}
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">
                {asset.name}
              </SheetTitle>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{asset.asset_code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyText(asset.asset_code, 'Asset code')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Last update:{' '}
                {lastUpdatedAt ? format(new Date(lastUpdatedAt), 'PPP p') : '—'} by{' '}
                {lastUpdatedBy}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={statusVariant}>{currentStatus}</Badge>
              {positionLabel && (
                <span className="text-xs text-muted-foreground">{positionLabel}</span>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="space-y-3"
          >
            <AccordionItem value="info" className="rounded-md border px-4">
              <AccordionTrigger className="py-3 text-sm font-semibold">
                Asset Information
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4 flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!assignToMeDisabledReason}
                            onClick={() =>
                              runQuickAction(
                                'assign_me',
                                { assigned_to: session?.user?.id ?? null },
                                'Assigned to you'
                              )
                            }
                          >
                            {quickActionLoading === 'assign_me' && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            Assign to me
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {assignToMeDisabledReason && (
                        <TooltipContent>{assignToMeDisabledReason}</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!markInRepairDisabledReason}
                            onClick={() =>
                              runQuickAction(
                                'status_repair',
                                { status: 'In Repair' },
                                'Status updated to In Repair'
                              )
                            }
                          >
                            {quickActionLoading === 'status_repair' && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            Mark In Repair
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {markInRepairDisabledReason && (
                        <TooltipContent>{markInRepairDisabledReason}</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!markAvailableDisabledReason}
                            onClick={() =>
                              runQuickAction(
                                'status_available',
                                { status: 'Available' },
                                'Status updated to Available'
                              )
                            }
                          >
                            {quickActionLoading === 'status_available' && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            Mark Available
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {markAvailableDisabledReason && (
                        <TooltipContent>{markAvailableDisabledReason}</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {quickActionError && (
                  <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive">
                      Quick action failed: {quickActionError.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={quickActionLoading !== null}
                        onClick={() =>
                          runQuickAction(
                            quickActionError.pending.actionKey,
                            quickActionError.pending.updates,
                            quickActionError.pending.successMessage
                          )
                        }
                      >
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={quickActionLoading !== null}
                        onClick={() => setQuickActionError(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                <section className="grid grid-cols-2 gap-x-6 gap-y-4 pb-1">
                  <InfoRow label="Category">
                    {asset.category?.name ?? '—'}
                  </InfoRow>

                  <InfoRow label="Asset Type">
                    {asset.asset_type?.name ?? '—'}
                  </InfoRow>

                  <InfoRow label="Status">
                    <Badge variant={statusVariant}>{currentStatus}</Badge>
                  </InfoRow>

                  <InfoRow label="Assigned To">
                    {assignedUser}
                  </InfoRow>

                  <InfoRow label="Location">
                    {asset.location ?? '—'}
                  </InfoRow>

                  <InfoRow label="Serial Number">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{asset.serial_number ?? '—'}</span>
                      {asset.serial_number && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyText(asset.serial_number ?? '', 'Serial number')}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </InfoRow>

                  <InfoRow label="Last Service">
                    {asset.last_service_date
                      ? format(new Date(asset.last_service_date), 'PPP')
                      : '—'}
                  </InfoRow>

                  <InfoRow label="Updated At">
                    {asset.updated_at
                      ? format(new Date(asset.updated_at), 'PPP p')
                      : '—'}
                  </InfoRow>
                </section>
              </AccordionContent>
            </AccordionItem>

            {assetFields.length > 0 && (
              <AccordionItem value="specs" className="rounded-md border px-4">
                <AccordionTrigger className="py-3 text-sm font-semibold">
                  Specifications
                </AccordionTrigger>
                <AccordionContent>
                  <AssetDynamicSection
                    assetId={asset.id}
                    fields={assetFields}
                    values={customValues}
                  />
                </AccordionContent>
              </AccordionItem>
            )}

            {canViewTickets && (
              <AccordionItem value="related" className="rounded-md border px-4">
                <AccordionTrigger className="py-3 text-sm font-semibold">
                  Related Tickets
                </AccordionTrigger>
                <AccordionContent>
                  {relatedTicketsLoading ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading related tickets...
                    </div>
                  ) : relatedTickets.length === 0 ? (
                    <p className="py-1 text-sm text-muted-foreground">
                      No related tickets found for this asset.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {relatedTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                          onClick={() => openRelatedTicket(ticket.id)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="line-clamp-1 text-sm font-medium">{ticket.title}</p>
                            <Badge variant="outline" className="shrink-0">
                              {ticket.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Priority: {ticket.priority || '—'} •{' '}
                            {ticket.created_at
                              ? format(new Date(ticket.created_at), 'PPP')
                              : '—'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const q = asset.asset_code || asset.name;
                        navigate(`/tickets?q=${encodeURIComponent(q)}`);
                      }}
                    >
                      Open in Tickets
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {canViewHistory && (
              <AccordionItem value="history" className="rounded-md border px-4">
                <AccordionTrigger className="py-3 text-sm font-semibold">
                  History
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-[260px] overflow-y-auto pr-2">
                    <AssetHistory assetId={asset.id} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        {/* ===== Footer ===== */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!hasPrev}
                      onClick={onPrev}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Prev
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasPrev && <TooltipContent>This is the first asset</TooltipContent>}
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!hasNext}
                      onClick={onNext}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasNext && <TooltipContent>This is the last asset</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>
          {canEditAsset && (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                onClose();
                onEdit(asset);
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ================= HELPER ================= */

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
