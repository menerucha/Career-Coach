import { forwardRef } from 'react';
import * as P from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';
export const Progress = forwardRef(({ className, value = 0, indicatorClassName, ...p }, ref) => (
  <P.Root ref={ref} value={value} className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-secondary', className)} {...p}>
    <P.Indicator className={cn('h-full w-full flex-1 bg-primary transition-all', indicatorClassName)} style={{ transform: `translateX(-${100 - value}%)` }} />
  </P.Root>
));
Progress.displayName = 'Progress';
