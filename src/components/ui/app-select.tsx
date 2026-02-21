"use client";

import * as React from "react";
import { cn } from "./utils";
import {
  Select,
  SelectContent as SelectContentBase,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger as SelectTriggerBase,
  SelectValue,
  SelectViewport as SelectViewportBase,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./select";

const AppSelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof SelectTriggerBase>>(
  ({ className, ...props }, ref) => (
    <SelectTriggerBase
      ref={ref}
      className={cn(
        "rounded-none border-0 border-b-2 border-neutral-line-200 focus:border-[#6A8F7B] shadow-sm focus:shadow-md transition-all focus:ring-0",
        className
      )}
      {...props}
    />
  )
);
AppSelectTrigger.displayName = "AppSelectTrigger";

const AppSelectContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof SelectContentBase>>(
  ({ className, ...props }, ref) => (
    <SelectContentBase
      ref={ref}
      position="popper"
      sideOffset={2}
      align="start"
      avoidCollisions
      collisionPadding={12}
      className={cn(
        "z-[1000] rounded-xl bg-popover shadow-xl border border-neutral-line-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  )
);
AppSelectContent.displayName = "AppSelectContent";

const AppSelectViewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof SelectViewportBase>
>(({ className, ...props }, ref) => (
  <SelectViewportBase ref={ref} className={cn("max-h-[280px] overflow-y-auto", className)} {...props} />
));
AppSelectViewport.displayName = "AppSelectViewport";

export const AppSelect = Select;
export { AppSelectTrigger, AppSelectContent, AppSelectViewport };
export {
  SelectValue as AppSelectValue,
  SelectGroup as AppSelectGroup,
  SelectItem as AppSelectItem,
  SelectLabel as AppSelectLabel,
  SelectSeparator as AppSelectSeparator,
  SelectScrollUpButton as AppSelectScrollUpButton,
  SelectScrollDownButton as AppSelectScrollDownButton,
};
