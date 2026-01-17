import { motion } from 'framer-motion';
import { Tables } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TICKET_STATUS_OPTIONS } from '@/constants/enums';
import { format } from 'date-fns';
import { useTicketDrawer } from '@/context/TicketDrawerContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { DragStartEvent } from '@dnd-kit/core';


import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ================= Constants ================= */

const STATUS_LABEL: Record<string, string> = {
  open: 'OPEN',
  in_progress: 'IN PROGRESS',
  closed: 'CLOSED',
};

const STATUS_COLOR: Record<string, string> = {
  open: 'text-green-600',
  in_progress: 'text-yellow-600',
  closed: 'text-blue-600',
};

/* ================= Ticket Card ================= */

function KanbanTicketCard({
  ticket,
  categoryName,
  priorityVariant,
  onOpen,
}: {
  ticket: Tables<'tickets'>;
  categoryName: string;
  priorityVariant: 'outline' | 'secondary' | 'default' | 'destructive';
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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button,a')) return;
        onOpen();
      }}
      className={cn(
        'rounded-lg border bg-background p-3 shadow-sm',
        'cursor-grab active:cursor-grabbing',
        'transition hover:bg-muted/50',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
    >
      <h4 className="text-sm font-medium leading-snug line-clamp-2">
        {ticket.title}
      </h4>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[11px]">
          {categoryName}
        </Badge>

        <Badge variant={priorityVariant} className="text-[11px]">
          {ticket.priority}
        </Badge>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Created{' '}
        {ticket.created_at
          ? format(new Date(ticket.created_at), 'dd MMM')
          : ''}
      </p>
    </motion.div>
  );
}

function KanbanOverlayCard({
  ticket,
  categoryName,
  priorityVariant,
}: {
  ticket: Tables<'tickets'>;
  categoryName: string;
  priorityVariant: 'outline' | 'secondary' | 'default' | 'destructive';
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

        <Badge variant={priorityVariant} className="text-[11px]">
          {ticket.priority}
        </Badge>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Created{' '}
        {ticket.created_at
          ? format(new Date(ticket.created_at), 'dd MMM')
          : ''}
      </p>
    </div>
  );
}


/* ================= Column Wrapper ================= */

function KanbanColumn({
  id,
  children,
}: {
  id: Tables<'tickets'>['status'];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2 min-h-[120px] transition',
        isOver && 'bg-primary/5'
      )}
    >
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

  const [localTickets, setLocalTickets] = useState(tickets);
  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  /* ---------- Helpers ---------- */

  const getStatusFromOverId = (overId: string) => {
    if (TICKET_STATUS_OPTIONS.includes(overId as any)) {
      return overId as Tables<'tickets'>['status'];
    }

    const overTicket = tickets.find(t => t.id === overId);
    return overTicket?.status ?? null;
  };

  const getCategoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name || 'N/A';

  const getPriorityVariant = (
    priority: Tables<'tickets'>['priority']
  ) => {
    switch (priority) {
      case 'Medium':
        return 'secondary';
      case 'High':
        return 'default';
      case 'Critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  const resolveStatusFromOver = (overId: string) => {
  // 1. วางลง column
  if (TICKET_STATUS_OPTIONS.includes(overId as any)) {
    return overId as Tables<'tickets'>['status'];
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

  const { error } = await supabase
    .from('tickets')
    .update({ status: newStatus })
    .eq('id', ticketId);

  if (error) {
    console.error('Rollback status', error);
    setLocalTickets(prev);
  }
};



  /* ---------- Group Tickets ---------- */

  const ticketsByStatus = TICKET_STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = localTickets.filter(t => t.status === status);
    return acc;
  }, {} as Record<Tables<'tickets'>['status'], Tables<'tickets'>[]>);


  /* ---------- Render ---------- */

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start"
      >
        {TICKET_STATUS_OPTIONS.map((status) => (
          <Card key={status} className="flex flex-col">
            {/* Column Header */}
            <CardHeader className="pb-2 border-b bg-muted/20">
              <CardTitle className="flex items-center justify-between text-xs font-semibold">
                <span className={cn('uppercase', STATUS_COLOR[status])}>
                  {STATUS_LABEL[status]}
                </span>
                <Badge variant="outline" className="text-[11px]">
                  {ticketsByStatus[status].length}
                </Badge>
              </CardTitle>
            </CardHeader>

            {/* Column Content */}
            <CardContent className="p-2">
              <KanbanColumn id={status}>
                <SortableContext
                  items={ticketsByStatus[status].map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {ticketsByStatus[status].length === 0 && (
                    <div className="py-10 text-center text-xs text-muted-foreground">
                      No tickets
                    </div>
                  )}

                  {ticketsByStatus[status].map(ticket => (
                    <KanbanTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      categoryName={getCategoryName(ticket.category_id)}
                      priorityVariant={getPriorityVariant(ticket.priority)}
                      onOpen={() => openDrawer(ticket.id)}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            </CardContent>
          </Card>
        ))}
      </motion.div>
      <DragOverlay>
      {activeTicket ? (
        <KanbanOverlayCard
          ticket={activeTicket}
          categoryName={getCategoryName(activeTicket.category_id)}
          priorityVariant={getPriorityVariant(activeTicket.priority)}
        />
      ) : null}
    </DragOverlay>

    </DndContext>
    
  );
  
}
