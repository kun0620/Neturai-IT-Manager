import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { notifyInfo } from '@/lib/notify';

interface ExportButtonProps {
  onExport: (format: 'pdf' | 'csv') => void;
  isLoading?: boolean;
}

export function ExportButton({ onExport, isLoading }: ExportButtonProps) {
  const handleExport = (format: 'pdf' | 'csv') => {
    notifyInfo(`Exporting data as ${format.toUpperCase()}... (Placeholder)`);
    onExport(format);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => handleExport('csv')}
        disabled={isLoading}
      >
        <Download className="mr-2 h-4 w-4" /> Export CSV
      </Button>
      <Button
        variant="outline"
        onClick={() => handleExport('pdf')}
        disabled={isLoading}
      >
        <Download className="mr-2 h-4 w-4" /> Export PDF
      </Button>
    </div>
  );
}
