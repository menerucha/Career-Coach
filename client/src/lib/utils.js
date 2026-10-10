import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/** shadcn's class-name helper: merges conditional classes and resolves Tailwind conflicts. */
export const cn = (...inputs) => twMerge(clsx(inputs));
