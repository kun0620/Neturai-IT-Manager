import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  color?: string;
  trend?: {
    value: number;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'text-primary',
  trend,
  onClick,
  className,
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(onClick && 'cursor-pointer')}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      onClick={onClick}
    >
      <Card
        className={cn(
          'h-full min-h-[140px] transition-shadow hover:shadow-md',
          className
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn('h-4 w-4', color)} />
        </CardHeader>

        <CardContent className="flex h-[88px] flex-col justify-between pt-0">
          <div className="text-3xl font-semibold leading-tight">
            {value}
          </div>

          {description ? (
            <p className="text-xs text-muted-foreground leading-snug">
              {description}
            </p>
          ) : (
            <div className="h-[16px]" />
          )}

          {trend && (
            <div
              className={`mt-1 flex items-center gap-1 text-xs ${
                trend.value > 0
                  ? 'text-green-600'
                  : trend.value < 0
                  ? 'text-red-600'
                  : 'text-muted-foreground'
              }`}
            >
              {trend.value > 0 && <ArrowUp className="h-3 w-3" />}
              {trend.value < 0 && <ArrowDown className="h-3 w-3" />}

              <span>
                {trend.value === 0
                  ? 'No change'
                  : `${Math.abs(trend.value)} ${trend.label ?? 'since yesterday'}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
