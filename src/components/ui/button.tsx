import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  default:
    "border-accent bg-accentSoft text-accentStrong hover:bg-accent hover:text-white",
  secondary:
    "border-violet/30 bg-violet/10 text-violet hover:bg-violet hover:text-white",
  ghost: "border-transparent bg-transparent text-textDim hover:bg-surfaceAlt",
  outline: "border-border bg-surface text-text hover:bg-surfaceAlt",
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-[11.5px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
