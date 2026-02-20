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
  ({ className, style, ...props }, ref) => (
    <SelectContentBase
      ref={ref}
      position="popper"
      sideOffset={4}
      className={cn(
        "rounded-xl z-[1000] bg-popover shadow-lg border border-neutral-line-200 max-h-[260px]",
        className
      )}
      style={{ position: "fixed", ...style }}
      {...props}
    />
  )
);
AppSelectContent.displayName = "AppSelectContent";

export const AppSelect = Select;
export { AppSelectTrigger, AppSelectContent };
export {
  SelectValue as AppSelectValue,
  SelectGroup as AppSelectGroup,
  SelectItem as AppSelectItem,
  SelectLabel as AppSelectLabel,
  SelectSeparator as AppSelectSeparator,
  SelectScrollUpButton as AppSelectScrollUpButton,
  SelectScrollDownButton as AppSelectScrollDownButton,
};
