import { forwardRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
export const Tabs = TabsPrimitive.Root;
export const TabsList = forwardRef(({ className, ...p }, ref) => <TabsPrimitive.List ref={ref} className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)} {...p} />);
export const TabsTrigger = forwardRef(({ className, ...p }, ref) => <TabsPrimitive.Trigger ref={ref} className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm', className)} {...p} />);
export const TabsContent = forwardRef(({ className, ...p }, ref) => <TabsPrimitive.Content ref={ref} className={cn('mt-4 focus-visible:outline-none', className)} {...p} />);
TabsList.displayName = 'TabsList'; TabsTrigger.displayName = 'TabsTrigger'; TabsContent.displayName = 'TabsContent';
