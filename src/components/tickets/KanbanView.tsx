import { motion } from 'motion/react';
import { Tables } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TICKET_STATUS_OPTIONS } from '@/constants/enums';
import { format } from 'date-fns';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DragStartEvent } from '@dnd-kit/core';
import { notifyError, notifySuccess } from '@/lib/notify';
import { cardRevealVariants, createFadeSlideUp } from '@/lib/motion';
import type { BadgeProps } from '@/components/ui/badge';
import { getTicketPriorityUi, getTicketStatusUi } from '@/lib/ticket-ui';


import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ================= Ticket Card ================= */

function KanbanTicketCard({
  ticket,
  categoryName,
  priorityBadgeVariant,
  priorityLabel,
  index,
  onOpen,
}: {
  ticket: Tables<'tickets'>;
  categoryName: string;
  priorityBadgeVariant: NonNullable<BadgeProps['variant']>;
  priorityLabel: string;
  index: number;
  onOpen: () => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const shortId = ticket.id.slice(0, 8).toUpperCase();
  const dueDateLabel = ticket.due_at
    ? format(new Date(ticket.due_at), 'dd MMM')
    : 'No due date';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`Move ticket ${ticket.title}`}
      layout
      variants={cardRevealVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button,a')) return;
        onOpen();
      }}
      className={cn(
        'group rounded-xl border border-border/70 bg-card/95 p-3 shadow-sm',
        'cursor-grab active:cursor-grabbing',
        'transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
    >
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 font-medium text-muted-foreground">
          #{shortId}
        </span>
        <span className="text-muted-foreground">{dueDateLabel}</span>
      </div>

      <h4 className="text-sm font-medium leading-snug line-clamp-2">
        {ticket.title}
      </h4>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[11px]">
          {categoryName}
        </Badge>

        <Badge variant={priorityBadgeVariant} className="text-[11px]">
          {priorityLabel}
        </Badge>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Created{' '}
        {ticket.created_at
          ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
          : '—'
        }
      </p>
    </motion.div>
  );
}

function KanbanOverlayCard({
  ticket,
  categoryName,
  priorityBadgeVariant,
  priorityLabel,
}: {
  ticket: Tables<'tickets'>;
  categoryName: string;
  priorityBadgeVariant: NonNullable<BadgeProps['variant']>;
  priorityLabel: string;
}) {
  return (
    <div
      className="
        w-[260px]
        rounded-lg
        border
        bg-background
        p-3
        shadow-xl
        opacity-90
        rotate-1
        cursor-grabbing
      "
    >
      <h4 className="text-sm font-medium leading-snug line-clamp-2">
        {ticket.title}
      </h4>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[11px]">
          {categoryName}
        </Badge>

        <Badge variant={priorityBadgeVariant} className="text-[11px]">
          {priorityLabel}
        </Badge>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Created{' '}
        {ticket.created_at
            ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')
            : '—'
          }
      </p>
    </div>
  );
}


/* ================= Column Wrapper ================= */

function KanbanColumn({
  id,
  statusLabel,
  hasTickets,
  children,
}: {
  id: Tables<'tickets'>['status'];
  statusLabel: string;
  hasTickets: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[140px] flex-col gap-2 rounded-lg border border-transparent p-1.5 transition',
        isOver &&
          'border-primary/60 bg-primary/10 ring-1 ring-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
      )}
    >
      {!hasTickets && (
        <div
          className={cn(
            'rounded-md border border-dashed border-border/80 px-3 py-5 text-center text-xs text-muted-foreground',
            isOver && 'border-primary/60 text-primary'
          )}
        >
          <p className="font-medium">
            {isOver ? `Drop to ${statusLabel}` : `No tickets in ${statusLabel}`}
          </p>
          <p className="mt-1 text-[11px]">
            Drag a ticket card here to change its status.
          </p>
        </div>
      )}
      {children}
    </div>
  );
}

/* ================= Main View ================= */

interface KanbanViewProps {
  tickets: Tables<'tickets'>[];
  categories: Tables<'ticket_categories'>[];
}

export function KanbanView({ tickets, categories }: KanbanViewProps) {
  const { openDrawer } = useTicketDrawer();
  const [activeTicket, setActiveTicket] = useState<Tables<'tickets'> | null>(null);
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const [localTickets, setLocalTickets] = useState(tickets);
  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /* ---------- Helpers ---------- */
  const isTicketStatus = (
    value: string
  ): value is Tables<'tickets'>['status'] =>
    (TICKET_STATUS_OPTIONS as readonly string[]).includes(value);

  const getCategoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name || 'N/A';
  
  const resolveStatusFromOver = (overId: string) => {
    // 1. วางลง column
    if (isTicketStatus(overId)) {
      return overId;
    }

    // 2. วางบน ticket ใบอื่น → ใช้ status ของใบนั้น
    const overTicket = localTickets.find(t => t.id === overId);
    return overTicket?.status ?? null;
  };

  /* ---------- Drag End ---------- */

  const handleDragStart = (event: DragStartEvent) => {
  const ticketId = event.active.id as string;
  const ticket = localTickets.find(t => t.id === ticketId);
  if (ticket) setActiveTicket(ticket);
};

const handleDragEnd = async (event: DragEndEvent) => {
  setActiveTicket(null); // 🔑 สำคัญ
  if (isUpdating) return;

  const { active, over } = event;
  if (!over) return;

  const ticketId = active.id as string;
  const currentTicket = localTickets.find(t => t.id === ticketId);
  if (!currentTicket) return;

  const newStatus = resolveStatusFromOver(over.id as string);
  if (!newStatus || newStatus === currentTicket.status) return;

  const prev = [...localTickets];

  // Optimistic UI
  setLocalTickets(t =>
    t.map(ticket =>
      ticket.id === ticketId
        ? { ...ticket, status: newStatus }
        : ticket
    )
  );

  setIsUpdating(true);
  const { error } = await supabase
    .from('tickets')
    .update({ status: newStatus })
    .eq('id', ticketId);

  if (error) {
    notifyError('Failed to update ticket status', error.message);
    setLocalTickets(prev);
  } else {
    notifySuccess('Status updated');
    queryClient.invalidateQueries({ queryKey: ['allTickets'] });
    queryClient.invalidateQueries({ queryKey: ['recentTickets'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
  }
  setIsUpdating(false);
};



  /* ---------- Group Tickets ---------- */

  const ticketsByStatus = useMemo(
    () =>
      TICKET_STATUS_OPTIONS.reduce((acc, status) => {
        acc[status] = localTickets.filter(t => t.status === status);
        return acc;
      }, {} as Record<Tables<'tickets'>['status'], Tables<'tickets'>[]>),
    [localTickets]
  );

  const activePriorityUi = activeTicket
    ? getTicketPriorityUi(activeTicket.priority)
    : null;
  const totalTickets = localTickets.length;

  /* ---------- Render ---------- */

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        <p className="sr-only">
          Kanban keyboard hint: focus a ticket card, press Space to pick up,
          use arrow keys to move, then press Space to drop.
        </p>
        {isUpdating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="rounded-md border bg-card px-3 py-2 text-xs font-medium shadow-md">
              Updating ticket status...
            </div>
          </div>
        )}

        <motion.div
          {...createFadeSlideUp(0)}
          className="mb-3 flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2"
        >
          <p className="text-sm font-medium">Kanban board</p>
          <p className="text-xs text-muted-foreground">{totalTickets} tickets</p>
        </motion.div>

        <motion.div
          {...createFadeSlideUp(0)}
          className="grid grid-cols-1 items-start gap-4 md:grid-cols-3 xl:gap-5"
        >
          {TICKET_STATUS_OPTIONS.map((status, columnIndex) => {
            const statusUi = getTicketStatusUi(status);
            const columnTickets = ticketsByStatus[status];
            return (
            <motion.div key={status} {...createFadeSlideUp(columnIndex * 0.04)}>
              <Card className="flex min-h-[430px] max-h-[70vh] flex-col overflow-hidden rounded-xl border-border/70 bg-card/85 shadow-sm">
              {/* Column Header */}
              <CardHeader className="sticky top-0 z-10 border-b bg-muted/30 pb-2 backdrop-blur supports-[backdrop-filter]:bg-muted/20">
                <CardTitle className="flex items-center justify-between text-xs font-semibold tracking-wide">
                  <span className={cn('uppercase', statusUi.textClass)}>
                    {statusUi.label}
                  </span>
                  <Badge
                    variant={statusUi.variant}
                    className="rounded-full px-2.5 text-[11px]"
                  >
                    {columnTickets.length}
                  </Badge>
                </CardTitle>
              </CardHeader>

              {/* Column Content */}
              <CardContent className="overflow-y-auto p-2">
                <SortableContext
                  items={columnTickets.map((ticket) => ticket.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <KanbanColumn
                    id={status}
                    statusLabel={statusUi.label}
                    hasTickets={columnTickets.length > 0}
                  >
                    {columnTickets.map((ticket, ticketIndex) => {
                      const priorityUi = getTicketPriorityUi(ticket.priority);
                      return (
                        <KanbanTicketCard
                          key={ticket.id}
                          ticket={ticket}
                          categoryName={getCategoryName(ticket.category_id)}
                          priorityBadgeVariant={priorityUi.variant}
                          priorityLabel={priorityUi.label}
                          index={ticketIndex}
                          onOpen={() => openDrawer(ticket.id)}
                        />
                      );
                    })}
                  </KanbanColumn>
                </SortableContext>
              </CardContent>
              </Card>
            </motion.div>
            );
          })}
        </motion.div>
        <DragOverlay>
        {activeTicket ? (
          <KanbanOverlayCard
            ticket={activeTicket}
            categoryName={getCategoryName(activeTicket.category_id)}
            priorityBadgeVariant={activePriorityUi?.variant ?? 'outline'}
            priorityLabel={activePriorityUi?.label ?? 'Low'}
          />
        ) : null}
      </DragOverlay>
      </div>
    </DndContext>
    
  );
  
}
