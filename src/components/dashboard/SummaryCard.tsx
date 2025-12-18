import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  color?: string;
  onClick?: () => void; // Add onClick prop
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'text-primary',
  onClick, // Destructure onClick
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={onClick ? 'cursor-pointer' : ''} // Apply cursor-pointer if onClick is present
      whileHover={onClick ? { scale: 1.02, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' } : {}} // Add hover effect
      onClick={onClick} // Attach onClick handler
    >
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
