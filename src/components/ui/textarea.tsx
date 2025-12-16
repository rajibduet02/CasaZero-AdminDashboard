import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content min-h-16 w-full bg-input-background px-3 py-2 text-base transition-[border-color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "border-b-2 border-b-brand-sage-500",
        "focus-visible:shadow-[0_2px_6px_0_rgba(76,175,71,0.4)]",
        "aria-invalid:border-b-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
