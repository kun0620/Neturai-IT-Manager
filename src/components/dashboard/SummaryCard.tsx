import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cardRevealVariants, hoverLift } from '@/lib/motion';

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
  index?: number;
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
  index = 0,
  onClick,
  className,
}: SummaryCardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardRevealVariants}
      custom={index}
      className={cn(onClick && 'cursor-pointer', "print:scale-100")}
      whileHover={onClick ? hoverLift : undefined}
      onClick={onClick}
    >
      <Card
        className={cn(
          'h-full min-h-[148px] border-border/80 bg-card/90',
          className
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </CardTitle>
          <div className="rounded-md border border-border/70 bg-muted/40 p-1.5">
            <Icon className={cn('h-4 w-4', color)} />
          </div>
        </CardHeader>

        <CardContent className="flex h-[92px] flex-col justify-between pt-0">
          <div className="text-2xl font-semibold leading-tight tracking-tight">
            {value}
          </div>

          {description ? (
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
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
