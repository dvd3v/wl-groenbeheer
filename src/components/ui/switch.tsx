import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "relative h-[18px] w-[34px] rounded-full border transition",
        checked
          ? "border-accent bg-accentSoft"
          : "border-border bg-surfaceAlt"
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block h-3 w-3 rounded-full transition will-change-transform",
          checked ? "translate-x-[18px] bg-accent" : "translate-x-[2px] bg-borderStrong"
        )}
      />
    </SwitchPrimitive.Root>
  );
}
