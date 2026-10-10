import { cn } from '@/lib/utils';
export const Skeleton = ({ className, ...p }) => <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" {...p} />;
