"use client";

import * as React from "react";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "./utils";
import ReactDOM from "react-dom";

// Functional dropdown menu implementation without Radix UI dependency
interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined);

const DropdownMenu = ({ children }: any) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

const DropdownMenuTrigger = ({ children, asChild, ...props }: any) => {
  const context = React.useContext(DropdownMenuContext);
  const localRef = React.useRef<any>(null);
  
  React.useEffect(() => {
    if (context && localRef.current) {
      // Store the actual button element
      const buttonElement = localRef.current instanceof HTMLElement 
        ? localRef.current 
        : localRef.current?.querySelector('button');
      if (buttonElement) {
        context.triggerRef.current = buttonElement;
      }
    }
  }, [context]);
  
  // If asChild is true, we need to clone the child and add our onClick
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: localRef,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        if (context) {
          context.setOpen(!context.open);
        }
        // Call original onClick if it exists
        if ((children as any).props?.onClick) {
          (children as any).props.onClick(e);
        }
      },
    });
  }
  
  return (
    <div
      ref={localRef}
      onClick={(e) => {
        e.stopPropagation();
        if (context) {
          context.setOpen(!context.open);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};

const DropdownMenuGroup = ({ children }: any) => <div>{children}</div>;
const DropdownMenuPortal = ({ children }: any) => <>{children}</>;
const DropdownMenuSub = ({ children }: any) => <div>{children}</div>;
const DropdownMenuRadioGroup = ({ children }: any) => <div>{children}</div>;

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, any>(({ className, inset, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon className="ml-auto" />
  </div>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, any>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-md border p-1 shadow-lg",
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

const DropdownMenuContent = React.forwardRef<HTMLDivElement, any>(
  (
    {
      className,
      sideOffset = 4,
      align = "start",
      side = "bottom",
      // Radix / @radix-ui props — must not be spread onto a plain div
      alignOffset: _alignOffset,
      collisionPadding: _collisionPadding,
      avoidCollisions: _avoidCollisions,
      collisionBoundary: _collisionBoundary,
      sticky: _sticky,
      hideWhenDetached: _hideWhenDetached,
      ...props
    },
    ref,
  ) => {
  const context = React.useContext(DropdownMenuContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });
  
  // Calculate position relative to trigger with viewport collision detection
  React.useEffect(() => {
    if (context?.open && contentRef.current) {
      const trigger = context.triggerRef.current;
      if (trigger) {
        // Use requestAnimationFrame to ensure content is rendered and measured
        requestAnimationFrame(() => {
          if (!contentRef.current || !trigger) return;
          
          const triggerRect = trigger.getBoundingClientRect();
          const contentRect = contentRef.current.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const padding = 8; // Minimum distance from viewport edges
          
          let calculatedTop = 0;
          let calculatedLeft = 0;
          
          // Determine vertical position (top/bottom)
          if (side === "top") {
            calculatedTop = triggerRect.top - contentRect.height - sideOffset;
            // If doesn't fit above, flip to bottom
            if (calculatedTop < padding) {
              calculatedTop = triggerRect.bottom + sideOffset;
            }
          } else {
            // Default: bottom
            calculatedTop = triggerRect.bottom + sideOffset;
            // If doesn't fit below, flip to top
            if (calculatedTop + contentRect.height > viewportHeight - padding) {
              calculatedTop = triggerRect.top - contentRect.height - sideOffset;
            }
          }
          
          // Ensure vertical position stays within viewport
          calculatedTop = Math.max(padding, Math.min(calculatedTop, viewportHeight - contentRect.height - padding));
          
          // Determine horizontal position (left/right/start/end)
          if (side === "left") {
            calculatedLeft = triggerRect.left - contentRect.width - sideOffset;
            // If doesn't fit on left, flip to right
            if (calculatedLeft < padding) {
              calculatedLeft = triggerRect.right + sideOffset;
            }
          } else if (side === "right") {
            calculatedLeft = triggerRect.right + sideOffset;
            // If doesn't fit on right, flip to left
            if (calculatedLeft + contentRect.width > viewportWidth - padding) {
              calculatedLeft = triggerRect.left - contentRect.width - sideOffset;
            }
          } else {
            // Default: bottom/top with align
            if (align === "end") {
              calculatedLeft = triggerRect.right;
              // Adjust if overflows right edge
              if (calculatedLeft + contentRect.width > viewportWidth - padding) {
                calculatedLeft = viewportWidth - contentRect.width - padding;
              }
            } else if (align === "center") {
              calculatedLeft = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
              // Adjust if overflows
              if (calculatedLeft < padding) {
                calculatedLeft = padding;
              } else if (calculatedLeft + contentRect.width > viewportWidth - padding) {
                calculatedLeft = viewportWidth - contentRect.width - padding;
              }
            } else {
              // Default: start (left align)
              calculatedLeft = triggerRect.left;
              // Adjust if overflows right edge
              if (calculatedLeft + contentRect.width > viewportWidth - padding) {
                calculatedLeft = viewportWidth - contentRect.width - padding;
              }
            }
          }
          
          // Ensure horizontal position stays within viewport
          calculatedLeft = Math.max(padding, Math.min(calculatedLeft, viewportWidth - contentRect.width - padding));
          
          setPosition({
            top: calculatedTop,
            left: calculatedLeft,
            width: triggerRect.width,
          });
        });
      }
    }
  }, [context?.open, align, sideOffset, side]);
  
  // Recalculate position on window resize or scroll
  React.useEffect(() => {
    if (!context?.open) return;
    
    const recalculatePosition = () => {
      if (contentRef.current && context?.triggerRef.current) {
        const trigger = context.triggerRef.current;
        requestAnimationFrame(() => {
          if (!contentRef.current || !trigger) return;
          
          const triggerRect = trigger.getBoundingClientRect();
          const contentRect = contentRef.current.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const padding = 8;
          
          let calculatedTop = position.top;
          let calculatedLeft = position.left;
          
          // Recalculate if position is outside viewport
          if (calculatedTop < padding || calculatedTop + contentRect.height > viewportHeight - padding) {
            if (side === "top") {
              calculatedTop = triggerRect.top - contentRect.height - sideOffset;
              if (calculatedTop < padding) {
                calculatedTop = triggerRect.bottom + sideOffset;
              }
            } else {
              calculatedTop = triggerRect.bottom + sideOffset;
              if (calculatedTop + contentRect.height > viewportHeight - padding) {
                calculatedTop = triggerRect.top - contentRect.height - sideOffset;
              }
            }
            calculatedTop = Math.max(padding, Math.min(calculatedTop, viewportHeight - contentRect.height - padding));
          }
          
          if (calculatedLeft < padding || calculatedLeft + contentRect.width > viewportWidth - padding) {
            if (side === "left") {
              calculatedLeft = triggerRect.left - contentRect.width - sideOffset;
              if (calculatedLeft < padding) {
                calculatedLeft = triggerRect.right + sideOffset;
              }
            } else if (side === "right") {
              calculatedLeft = triggerRect.right + sideOffset;
              if (calculatedLeft + contentRect.width > viewportWidth - padding) {
                calculatedLeft = triggerRect.left - contentRect.width - sideOffset;
              }
            } else {
              if (align === "end") {
                calculatedLeft = triggerRect.right;
                if (calculatedLeft + contentRect.width > viewportWidth - padding) {
                  calculatedLeft = viewportWidth - contentRect.width - padding;
                }
              } else {
                calculatedLeft = triggerRect.left;
                if (calculatedLeft + contentRect.width > viewportWidth - padding) {
                  calculatedLeft = viewportWidth - contentRect.width - padding;
                }
              }
            }
            calculatedLeft = Math.max(padding, Math.min(calculatedLeft, viewportWidth - contentRect.width - padding));
          }
          
          setPosition(prev => ({
            ...prev,
            top: calculatedTop,
            left: calculatedLeft,
          }));
        });
      }
    };
    
    window.addEventListener('resize', recalculatePosition);
    window.addEventListener('scroll', recalculatePosition, true);
    
    return () => {
      window.removeEventListener('resize', recalculatePosition);
      window.removeEventListener('scroll', recalculatePosition, true);
    };
  }, [context?.open, align, sideOffset, side, position.top, position.left]);
  
  // Close on click outside
  React.useEffect(() => {
    if (!context?.open) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        const trigger = context.triggerRef.current;
        if (trigger && !trigger.contains(event.target as Node)) {
          context.setOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [context?.open]);
  
  if (!context?.open) return null;
  
  // Render in portal at document body level
  if (typeof document !== 'undefined') {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const maxWidth = Math.min(viewportWidth - 16, 192); // w-48 = 192px, with 8px padding on each side
    const maxHeight = viewportHeight - 16; // 8px padding on top and bottom
    
    return ReactDOM.createPortal(
      <div
        ref={contentRef}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 99999,
          maxWidth: `${maxWidth}px`,
          maxHeight: `${maxHeight}px`,
        }}
        className={cn(
          "min-w-32 overflow-hidden rounded-md border bg-white text-popover-foreground shadow-md",
          className,
        )}
        {...props}
      >
        <div className="p-1 overflow-y-auto max-h-full">{props.children}</div>
      </div>,
      document.body
    );
  }
  
  return null;
});
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<HTMLDivElement, any>(({ className, inset, onClick, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
        inset && "pl-8",
        className,
      )}
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        }
        if (context) {
          context.setOpen(false);
        }
      }}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, any>(({ className, children, checked, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      {checked && <CheckIcon className="size-4" />}
    </span>
    {children}
  </div>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, any>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <CircleIcon className="size-2 fill-current" />
    </span>
    {children}
  </div>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, any>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, any>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("bg-muted -mx-1 my-1 h-px", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};