import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', {
  variants: { variant: { default: 'border-transparent bg-primary text-primary-foreground', secondary: 'border-transparent bg-secondary text-secondary-foreground', outline: 'text-foreground', destructive: 'border-transparent bg-destructive/10 text-destructive', success: 'border-transparent bg-success/10 text-success', warning: 'border-transparent bg-warning/20 text-warning-foreground' } },
  defaultVariants: { variant: 'default' },
});
export const Badge = ({ className, variant, ...props }) => <span className={cn(badgeVariants({ variant }), className)} {...props} />;
