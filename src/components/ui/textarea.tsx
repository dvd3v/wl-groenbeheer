import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-[12px] text-text shadow-sm outline-none transition placeholder:text-textMuted focus:border-accent",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
