"use client";

import * as React from "react";
import { cn } from "./utils";

// Simple tooltip implementation without Radix UI dependency
const TooltipProvider = ({ children }: any) => <>{children}</>;

const Tooltip = ({ children }: any) => {
  return <div className="relative inline-block">{children}</div>;
};

const TooltipTrigger = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("cursor-pointer", className)} {...props}>
      {children}
    </div>
  )
);
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<HTMLDivElement, any>(
  ({ className, sideOffset = 4, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
