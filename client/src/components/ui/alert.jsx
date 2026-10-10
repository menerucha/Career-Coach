import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const alertVariants = cva('relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7', {
  variants: { variant: { default: 'bg-card', destructive: 'border-destructive/40 bg-destructive/5 text-destructive', warning: 'border-warning/50 bg-warning/10 text-warning-foreground', success: 'border-success/40 bg-success/5 text-success' } }, defaultVariants: { variant: 'default' } });
export const Alert = forwardRef(({ className, variant, ...p }, ref) => <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...p} />);
export const AlertTitle = forwardRef(({ className, ...p }, ref) => <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...p} />);
export const AlertDescription = forwardRef(({ className, ...p }, ref) => <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...p} />);
Alert.displayName = 'Alert';
