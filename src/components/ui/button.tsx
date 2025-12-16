import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 shadow-md hover:shadow-lg",
        outline:
          "border bg-background text-foreground dark:bg-input/30 dark:border-input hover:bg-neutral-line-100/50 hover:border-brand-sage-400",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:shadow-md hover:bg-brand-sage-400",
        ghost:
          "text-foreground hover:bg-neutral-line-100/50",
        link: "text-primary underline-offset-4 hover:brightness-110",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-3.5",
        sm: "h-9 rounded-xl gap-1.5 px-3.5 has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-7 has-[>svg]:px-5",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
