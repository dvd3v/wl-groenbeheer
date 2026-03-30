import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface SectionProps {
  value: string;
  title: string;
  children: ReactNode;
  subtitle?: string;
}

export function Accordion({
  children,
  defaultValue,
}: {
  children: ReactNode;
  defaultValue: string[];
}) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      defaultValue={defaultValue}
      className="space-y-3"
    >
      {children}
    </AccordionPrimitive.Root>
  );
}

export function AccordionSection({
  value,
  title,
  subtitle,
  children,
}: SectionProps) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className="overflow-hidden rounded-card border border-border bg-surface shadow-soft"
    >
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
          <div>
            <div className="text-[13px] font-semibold text-text">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-[11px] text-textDim">{subtitle}</div>
            ) : null}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-textMuted transition data-[state=open]:rotate-180" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="border-t border-border px-5 py-4">
        {children}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
