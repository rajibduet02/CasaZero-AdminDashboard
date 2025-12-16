"use client";

import * as React from "react";
import { cn } from "./utils";
import { buttonVariants } from "./button";

// Stub implementation without Radix UI dependency
const AlertDialog = ({ children, open, onOpenChange }: any) => {
  if (!open) return null;
  return <div>{children}</div>;
};

const AlertDialogTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
const AlertDialogPortal = ({ children }: any) => <>{children}</>;

const AlertDialogOverlay = React.forwardRef<HTMLDivElement, any>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
));
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = React.forwardRef<HTMLDivElement, any>(({ className, children, ...props }, ref) => (
  <>
    <AlertDialogOverlay />
    <div
      ref={ref}
      className={cn(
        "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  </>
));
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
);

const AlertDialogFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

const AlertDialogTitle = ({ className, ...props }: React.ComponentProps<"h2">) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props} />
);

const AlertDialogDescription = ({ className, ...props }: React.ComponentProps<"p">) => (
  <p className={cn("text-muted-foreground text-sm", className)} {...props} />
);

const AlertDialogAction = ({ className, ...props }: React.ComponentProps<"button">) => (
  <button className={cn(buttonVariants(), className)} {...props} />
);

const AlertDialogCancel = ({ className, ...props }: React.ComponentProps<"button">) => (
  <button className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />
);

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
