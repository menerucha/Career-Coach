import { forwardRef } from 'react';
import * as A from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Accordion = A.Root;
export const AccordionItem = forwardRef(({ className, ...p }, ref) => <A.Item ref={ref} className={cn('border-b last:border-b-0', className)} {...p} />);
export const AccordionTrigger = forwardRef(({ className, children, ...p }, ref) => (
  <A.Header className="flex"><A.Trigger ref={ref} className={cn('flex flex-1 items-center justify-between gap-3 py-4 text-left text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180', className)} {...p}>{children}<ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" /></A.Trigger></A.Header>
));
export const AccordionContent = forwardRef(({ className, children, ...p }, ref) => (
  <A.Content ref={ref} className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...p}><div className={cn('pb-4 pt-0', className)}>{children}</div></A.Content>
));
AccordionItem.displayName = 'AccordionItem'; AccordionTrigger.displayName = 'AccordionTrigger'; AccordionContent.displayName = 'AccordionContent';
