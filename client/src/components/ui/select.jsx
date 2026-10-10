import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
/** shadcn-styled native <select>: keeps full keyboard / mobile / screen-reader behaviour with no extra JS. */
export const Select = forwardRef(({ className, children, ...p }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn('flex h-10 w-full appearance-none rounded-md border border-input bg-card px-3 py-2 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', className)} {...p}>{children}</select>
    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
  </div>
));
Select.displayName = 'Select';
