import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cardRevealVariants, hoverLift } from '@/lib/motion';

interface SummaryCardProps {
  title: string;
  value: number | string;
  valueSuffix?: string;
  decimalPlaces?: number;
  icon: LucideIcon;
  description?: string;
  color?: string;
  trend?: {
    value: number;
    label?: string;
    mode?: 'increase_is_good' | 'increase_is_bad' | 'neutral';
  };
  index?: number;
  onClick?: () => void;
  clickHint?: string;
  className?: string;
}

export function SummaryCard({
  title,
  value,
  valueSuffix,
  decimalPlaces = 0,
  icon: Icon,
  description,
  color = 'text-primary',
  trend,
  index = 0,
  onClick,
  clickHint,
  className,
}: SummaryCardProps) {
  const [animatedValue, setAnimatedValue] = useState(
    typeof value === 'number' ? value : 0
  );
  const previousValueRef = useRef<number | null>(
    typeof value === 'number' ? value : null
  );

  useEffect(() => {
    if (typeof value !== 'number') return;

    const fromValue = previousValueRef.current ?? value;
    if (fromValue === value) {
      setAnimatedValue(value);
      previousValueRef.current = value;
      return;
    }

    const durationMs = 380;
    const startAt = performance.now();
    let frameId = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = fromValue + (value - fromValue) * eased;
      if (decimalPlaces > 0) {
        const scale = Math.pow(10, decimalPlaces);
        setAnimatedValue(Math.round(nextValue * scale) / scale);
      } else {
        setAnimatedValue(Math.round(nextValue));
      }

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        previousValueRef.current = value;
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [value, decimalPlaces]);

  const formattedAnimatedValue =
    typeof value === 'number'
      ? animatedValue.toLocaleString(undefined, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        })
      : value;

  const getTrendClasses = () => {
    if (!trend) {
      return 'border-border bg-muted/40 text-muted-foreground';
    }

    const mode = trend.mode ?? 'increase_is_good';
    if (trend.value === 0) {
      return 'border-border bg-muted/40 text-muted-foreground';
    }

    if (mode === 'neutral') {
      return 'border-blue-500/30 bg-blue-500/10 text-blue-700';
    }

    const isPositive = trend.value > 0;
    const isGood = mode === 'increase_is_good' ? isPositive : !isPositive;

    return isGood
      ? 'border-green-500/30 bg-green-500/10 text-green-600'
      : 'border-red-500/30 bg-red-500/10 text-red-600';
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardRevealVariants}
      custom={index}
      className={cn(onClick && 'group cursor-pointer', "print:scale-100")}
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

        <CardContent className="flex min-h-[108px] flex-col gap-2 pt-0">
          <div className="text-2xl font-semibold leading-tight tracking-tight">
            {formattedAnimatedValue}
            {typeof value === 'number' && valueSuffix ? ` ${valueSuffix}` : ''}
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
              className={`mt-auto inline-flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-xs ${getTrendClasses()}`}
            >
              {trend.value > 0 && <ArrowUp className="h-3 w-3" />}
              {trend.value < 0 && <ArrowDown className="h-3 w-3" />}

              <span>
                {trend.value === 0
                  ? 'No change'
                  : `${Math.abs(trend.value)} ${trend.label ?? 'vs yesterday'}`}
              </span>
            </div>
          )}

          {onClick && (
            <p className="h-4 text-[11px] text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {clickHint ?? 'Click to open details'}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
