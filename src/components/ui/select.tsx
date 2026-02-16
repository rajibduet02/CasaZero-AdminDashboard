"use client";

import * as React from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "./utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  displayLabel: React.ReactNode;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

// Derive label from value by finding the option (child with value prop) that matches valueStr. Select's children include one node whose children are option-like (have value).
function findLabelFromChildren(children: React.ReactNode, valueStr: string): React.ReactNode {
  if (!valueStr) return null;
  const arr = React.Children.toArray(children);
  for (const node of arr) {
    const c = node as React.ReactElement<{ children?: React.ReactNode }>;
    const optionList = c?.props?.children;
    if (optionList == null) continue;
    const options = React.Children.toArray(optionList);
    const hasValueProp = options.some((o: unknown) => (o as React.ReactElement)?.props?.value != null);
    if (!hasValueProp) continue;
    for (const opt of options) {
      const item = opt as React.ReactElement<{ value?: unknown; children?: React.ReactNode }>;
      if (item?.props != null && String(item.props.value) === valueStr) {
        return item.props.children ?? null;
      }
    }
    return null;
  }
  return null;
}

const Select = ({ children, value, onValueChange }: any) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const valueStr = value != null ? String(value) : "";

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleValueChange = React.useCallback((v: string) => {
    const next = v != null ? String(v) : "";
    onValueChangeRef.current?.(next);
  }, []);

  const displayLabel = valueStr ? findLabelFromChildren(children, valueStr) : null;

  return (
    <SelectContext.Provider
      value={{
        value: valueStr,
        onValueChange: handleValueChange,
        open,
        setOpen,
        triggerRef,
        displayLabel,
      }}
    >
      <div ref={rootRef} data-select-root className="relative z-10">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectGroup = ({ children }: any) => <div>{children}</div>;

const SelectValue = ({ placeholder }: any) => {
  const context = React.useContext(SelectContext);
  if (!context) return <span>{placeholder}</span>;

  if (context.displayLabel != null && context.displayLabel !== "") {
    return <>{context.displayLabel}</>;
  }
  if (context.value) {
    return <span>{context.value}</span>;
  }
  return <span className="text-muted-foreground">{placeholder}</span>;
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, any>(
  ({ className, children, disabled, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const setRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        const triggerRef = context?.triggerRef as React.MutableRefObject<HTMLButtonElement | null> | undefined;
        if (triggerRef) triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) {
          const refObj = ref as React.MutableRefObject<HTMLButtonElement | null>;
          refObj.current = node;
        }
      },
      [context?.triggerRef, ref]
    );

    return (
      <button
        ref={setRef}
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
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    if (!context?.open) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "absolute left-0 w-full z-50 max-h-[240px] overflow-y-auto rounded-xl border border-neutral-line-200 bg-white text-popover-foreground shadow-lg",
          "top-[calc(100%+6px)]",
          className
        )}
        style={{
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
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
    const valueStr = value != null ? String(value) : "";
    const isSelected = context?.value === valueStr;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        className={cn(
          "w-full px-4 py-2 cursor-pointer select-none rounded-sm text-sm outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "relative flex items-center pr-8",
          isSelected && "bg-accent/50",
          className
        )}
        onClick={() => {
          if (context) {
            context.onValueChange(valueStr);
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