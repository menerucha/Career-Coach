import { forwardRef } from 'react';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Dialog = D.Root, DialogTrigger = D.Trigger, DialogClose = D.Close;
export const DialogContent = forwardRef(({ className, children, ...p }, ref) => (
  <D.Portal>
    <D.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <D.Content ref={ref} className={cn('fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-lg', className)} {...p}>
      {children}
      <D.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring" aria-label="Close"><X className="h-4 w-4" /></D.Close>
    </D.Content>
  </D.Portal>
));
export const DialogHeader = ({ className, ...p }) => <div className={cn('flex flex-col space-y-1.5', className)} {...p} />;
export const DialogFooter = ({ className, ...p }) => <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...p} />;
export const DialogTitle = forwardRef(({ className, ...p }, ref) => <D.Title ref={ref} className={cn('text-lg font-semibold', className)} {...p} />);
export const DialogDescription = forwardRef(({ className, ...p }, ref) => <D.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...p} />);
DialogContent.displayName = 'DialogContent';
