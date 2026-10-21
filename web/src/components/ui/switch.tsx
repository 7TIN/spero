import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-[4px] border border-zinc-200 bg-zinc-200/60 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-zinc-300 data-[state=checked]:bg-zinc-300 dark:border-[#282828] dark:bg-[#282828] dark:data-[state=checked]:border-[#393939] dark:data-[state=checked]:bg-white/[0.14] dark:focus-visible:ring-white/20",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-3 rounded-[2px] bg-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] transition-transform data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5 data-[state=checked]:bg-zinc-700 dark:bg-[#979797] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)] dark:data-[state=checked]:bg-white",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
