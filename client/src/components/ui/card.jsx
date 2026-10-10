import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
const make = (name, base, Tag = 'div') => { const C = forwardRef(({ className, ...p }, ref) => <Tag ref={ref} className={cn(base, className)} {...p} />); C.displayName = name; return C; };
export const Card = make('Card', 'rounded-xl border bg-card text-card-foreground shadow-sm');
export const CardHeader = make('CardHeader', 'flex flex-col space-y-1.5 p-5');
export const CardTitle = make('CardTitle', 'font-semibold leading-none tracking-tight', 'h3');
export const CardDescription = make('CardDescription', 'text-sm text-muted-foreground', 'p');
export const CardContent = make('CardContent', 'p-5 pt-0');
export const CardFooter = make('CardFooter', 'flex items-center p-5 pt-0');
