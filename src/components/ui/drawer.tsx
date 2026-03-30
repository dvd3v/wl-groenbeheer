import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/18 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-full max-w-[420px] border-l border-border bg-white/95 shadow-panel outline-none backdrop-blur md:max-w-[420px]",
            className
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div className="space-y-1">
                <Dialog.Title className="text-[14px] font-semibold text-text">
                  {title}
                </Dialog.Title>
                {description ? (
                  <Dialog.Description className="text-[11px] text-textDim">
                    {description}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close className="rounded-md border border-border bg-surfaceAlt p-1 text-textDim transition hover:bg-surface">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="app-scrollbar flex-1 overflow-y-auto">{children}</div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
