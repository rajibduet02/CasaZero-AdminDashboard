"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "./utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  displayLabel: React.ReactNode;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

// Derive label from value by finding the option (child with value prop) that matches valueStr.
// Supports SelectContent > SelectViewport > SelectItem or SelectContent > SelectItem.
function findLabelFromChildren(children: React.ReactNode, valueStr: string): React.ReactNode {
  if (!valueStr) return null;
  const arr = React.Children.toArray(children);
  for (const node of arr) {
    const c = node as React.ReactElement<{ children?: React.ReactNode }>;
    const optionList = c?.props?.children;
    if (optionList == null) continue;
    let options = React.Children.toArray(optionList);
    if (!options.some((o: unknown) => (o as React.ReactElement)?.props?.value != null)) {
      const first = options[0] as React.ReactElement<{ children?: React.ReactNode }> | undefined;
      if (first?.props?.children != null) {
        options = React.Children.toArray(first.props.children);
      }
    }
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
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const valueStr = value != null ? String(value) : "";

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inRoot = rootRef.current?.contains(target);
      const inContent = contentRef.current?.contains(target);
      if (!inRoot && !inContent) {
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
        contentRef,
        displayLabel,
      }}
    >
      <div ref={rootRef} data-select-root className="relative w-full z-10">
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

const SELECT_PANEL_MAX_HEIGHT = 280;
const SIDE_OFFSET_DEFAULT = 2;
const COLLISION_PADDING_DEFAULT = 12;
const MIN_SPACE_TO_FLIP_ABOVE = 80;

const SelectContent = React.forwardRef<HTMLDivElement, any>(
  (
    {
      className,
      children,
      style,
      position = "popper",
      sideOffset = SIDE_OFFSET_DEFAULT,
      align = "start",
      avoidCollisions = true,
      collisionPadding = COLLISION_PADDING_DEFAULT,
      ...props
    },
    ref
  ) => {
    const context = React.useContext(SelectContext);
    const [coords, setCoords] = React.useState<{
      top: number;
      left: number;
      width: number;
      maxHeight: number;
      side: "top" | "bottom";
    } | null>(null);

    React.useLayoutEffect(() => {
      if (!context?.open || !context.triggerRef?.current) return;
      const el = context.triggerRef.current;
      const update = () => {
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const padding = avoidCollisions ? collisionPadding : 0;
        const maxH = SELECT_PANEL_MAX_HEIGHT;

        let top = rect.bottom + sideOffset;
        let left = rect.left;
        let width = rect.width;
        let maxHeight = maxH;

        let side: "top" | "bottom" = "bottom";
        if (avoidCollisions && padding > 0) {
          const spaceBelow = vh - padding - (rect.bottom + sideOffset);
          const spaceAbove = rect.top - sideOffset - padding;
          if (spaceBelow < MIN_SPACE_TO_FLIP_ABOVE && spaceAbove > spaceBelow) {
            side = "top";
            top = rect.top - sideOffset - maxH;
            if (top < padding) {
              maxHeight = Math.max(0, rect.top - sideOffset - padding);
              top = padding;
            }
          } else {
            maxHeight = Math.min(maxH, vh - padding - top);
          }
          if (maxHeight < 0) maxHeight = maxH;

          left = Math.max(padding, Math.min(left, vw - padding - width));
          if (left + width > vw - padding) width = Math.max(0, vw - padding - left);
          top = Math.max(padding, Math.min(top, vh - padding - maxHeight));
        }

        setCoords({ top, left, width, maxHeight, side });
      };
      update();
      const resize = new ResizeObserver(update);
      resize.observe(el);
      window.addEventListener("scroll", update, true);
      window.addEventListener("resize", update);
      return () => {
        resize.disconnect();
        window.removeEventListener("scroll", update, true);
        window.removeEventListener("resize", update);
      };
    }, [context?.open, context?.triggerRef, sideOffset, avoidCollisions, collisionPadding]);

    React.useEffect(() => {
      if (!context?.open) setCoords(null);
    }, [context?.open]);

    const setRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        (context?.contentRef as React.MutableRefObject<HTMLDivElement | null> | undefined) &&
          ((context.contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node);
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [context?.contentRef, ref]
    );

    if (!context?.open) return null;

    const maxPanelHeight = coords?.maxHeight ?? SELECT_PANEL_MAX_HEIGHT;

    const content = (
      <div
        ref={setRef}
        data-state={context?.open ? "open" : "closed"}
        data-side={coords?.side ?? "bottom"}
        className={cn(
          "rounded-xl border border-neutral-line-200 bg-popover shadow-lg text-popover-foreground",
          className
        )}
        style={{
          position: "fixed",
          top: coords?.top ?? 0,
          left: coords?.left ?? 0,
          width: coords?.width ? `${coords.width}px` : undefined,
          maxHeight: `${maxPanelHeight}px`,
          isolation: "isolate",
          zIndex: 1000,
          overflow: "hidden",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );

    if (typeof document !== "undefined") {
      return ReactDOM.createPortal(content, document.body);
    }
    return content;
  }
);
SelectContent.displayName = "SelectContent";

const SelectViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-x-hidden overscroll-contain p-1 bg-popover min-h-0",
        "max-h-[280px]",
        className
      )}
      style={{
        height: "fit-content",
        maxHeight: 280,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        ...style,
      }}
      {...props}
    />
  )
);
SelectViewport.displayName = "SelectViewport";

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
          "w-full flex-shrink-0 px-4 py-2 cursor-pointer select-none rounded-sm text-sm outline-none text-foreground",
          "hover:bg-neutral-100 hover:text-foreground",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "relative flex items-center pr-8 whitespace-nowrap",
          isSelected && "bg-accent/50 text-accent-foreground",
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
  SelectViewport,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};