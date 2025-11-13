import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm p-4 h-full',
        isOver ? 'bg-accent/50' : ''
      )}
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {children}
      </div>
    </div>
  );
};
