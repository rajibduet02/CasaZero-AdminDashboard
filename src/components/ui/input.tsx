import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground placeholder:text-neutral-ink-400 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex h-11 w-full min-w-0 px-4 py-2.5 text-base bg-input-background transition-all duration-300 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "border-b-2 border-b-brand-sage-400",
        "focus-visible:border-b-brand-sage-500 focus-visible:shadow-[0_3px_8px_0_rgba(76,175,71,0.3)]",
        "hover:border-b-brand-sage-500",
        "aria-invalid:border-b-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
