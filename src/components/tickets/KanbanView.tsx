import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DropAnimation,
  defaultDropAnimation,
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTicketCard } from './KanbanTicketCard';
import { Ticket } from '@/types/supabase'; // Assuming Ticket type is defined here
import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming ScrollArea exists
import { CreateTicketDialog } from './CreateTicketDialog'; // Assuming this exists
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TicketDetailDialog } from './TicketDetailDialog'; // Assuming this exists

interface KanbanViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onTicketStatusChange: (ticketId: string, newStatus: string) => void;
  onTicketAssigneeChange: (ticketId: string, newAssigneeId: string | null) => void;
  onTicketUpdate: (ticket: Ticket) => void; // For general updates
}

const dropAnimation: DropAnimation = {
  ...defaultDropAnimation,
  dragSourceOpacity: 0.5,
};

export const KanbanView: React.FC<KanbanViewProps> = ({
  tickets,
  onTicketClick,
  onTicketStatusChange,
  onTicketAssigneeChange,
  onTicketUpdate,
}) => {
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const statuses = ['Open', 'In Progress', 'Resolved', 'Closed']; // Example statuses

  const columns = useMemo(() => {
    return statuses.map((status) => ({
      id: status,
      title: status,
      tickets: tickets.filter((ticket) => ticket.status === status),
    }));
  }, [tickets, statuses]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const findColumn = (id: string) => {
    if (statuses.includes(id)) {
      return columns.find((col) => col.id === id);
    }
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      return columns.find((col) => col.id === ticket.status);
    }
    return undefined;
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    const activeTicket = tickets.find((t) => t.id === active.id);
    setActiveTicket(activeTicket || null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn) return;

    if (activeColumn.id !== overColumn.id) {
      // Moving ticket between columns (status change)
      onTicketStatusChange(activeId, overColumn.id);
    } else {
      // Reordering within the same column (not implemented for now, but dnd-kit supports it)
      // For simplicity, we're only handling status changes for now.
      // If reordering within a column is needed, arrayMove logic would go here.
    }
    setActiveTicket(null);
  };

  const handleOpenTicketDetails = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setIsDetailDialogOpen(true);
  };

  const handleCloseTicketDetails = () => {
    setIsDetailDialogOpen(false);
    setActiveTicket(null);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateTicketDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Ticket
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <KanbanColumn id={column.id} title={column.title}>
                <SortableContext items={column.tickets.map((t) => t.id)}>
                  {column.tickets.map((ticket) => (
                    <KanbanTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onClick={() => handleOpenTicketDetails(ticket)}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            </div>
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTicket ? (
            <KanbanTicketCard ticket={activeTicket} onClick={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateTicketDialog
        isOpen={isCreateTicketDialogOpen}
        onClose={() => setIsCreateTicketDialogOpen(false)}
        onSuccess={() => {
          setIsCreateTicketDialogOpen(false);
          onTicketUpdate(activeTicket!); // Trigger a refresh
        }}
      />

      {activeTicket && (
        <TicketDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={handleCloseTicketDetails}
          ticketId={activeTicket.id}
          onTicketUpdate={onTicketUpdate}
        />
      )}
    </div>
  );
};
