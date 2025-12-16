"use client";

import * as React from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "./utils";

// Functional select implementation without Radix UI dependency
interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel: React.ReactNode;
  setSelectedLabel: (label: React.ReactNode) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

const Select = ({ children, value, onValueChange }: any) => {
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<React.ReactNode>(null);
  
  // Reset selected label when value changes externally
  React.useEffect(() => {
    if (!value) {
      setSelectedLabel(null);
    }
  }, [value]);
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, selectedLabel, setSelectedLabel }}>
      <div data-select-root className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectGroup = ({ children }: any) => <div>{children}</div>;

const SelectValue = ({ placeholder }: any) => {
  const context = React.useContext(SelectContext);
  if (!context) return <span>{placeholder}</span>;
  
  // Display the selected label (which could be complex JSX) or placeholder
  if (context.selectedLabel) {
    return <>{context.selectedLabel}</>;
  }
  
  // Fallback to value if no label is set
  if (context.value) {
    return <span>{context.value}</span>;
  }
  
  return <span className="text-muted-foreground">{placeholder}</span>;
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, any>(
  ({ className, children, disabled, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={() => {
          if (context && !disabled) {
            context.setOpen(!context.open);
          }
        }}
        {...props}
      >
        {children}
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = ({ className, ...props }: any) => (
  <div className={cn("flex cursor-default items-center justify-center py-1", className)} {...props} />
);

const SelectScrollDownButton = ({ className, ...props }: any) => (
  <div className={cn("flex cursor-default items-center justify-center py-1", className)} {...props} />
);

const SelectContent = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, position = "popper", ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const contentRef = React.useRef<HTMLDivElement>(null);
    
    // Close on click outside
    React.useEffect(() => {
      if (!context?.open) return;
      
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          const trigger = (event.target as HTMLElement).closest('[data-select-root]');
          if (!trigger) {
            context.setOpen(false);
          }
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [context?.open]);
    
    // Always render children to mount SelectItems (they set labels via useEffect)
    // But only show the dropdown when open
    return (
      <div
        ref={contentRef}
        className={cn(
          "absolute z-50 max-h-96 min-w-[8rem] overflow-auto rounded-md border bg-white text-popover-foreground shadow-md mt-1 w-full",
          !context?.open && "hidden",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <div className="p-1">{children}</div>
      </div>
    );
  }
);
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  )
);
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;
    
    // Update selected label when this item is selected or when it mounts and is already selected
    React.useEffect(() => {
      if (context && isSelected) {
        context.setSelectedLabel(children);
      }
    }, [isSelected]);
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected && "bg-accent/50",
          className
        )}
        onClick={() => {
          if (context) {
            context.onValueChange(value);
            context.setSelectedLabel(children);
            context.setOpen(false);
          }
        }}
        {...props}
      >
        {isSelected && (
          <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
            <CheckIcon className="h-4 w-4" />
          </span>
        )}
        {children}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
);
SelectSeparator.displayName = "SelectSeparator";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};