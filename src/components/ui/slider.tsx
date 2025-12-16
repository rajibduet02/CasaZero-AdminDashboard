"use client";

import * as React from "react";
import { cn } from "./utils";

// Simple slider implementation without Radix UI dependency
const Slider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number[];
    onValueChange?: (value: number[]) => void;
    max?: number;
    min?: number;
    step?: number;
  }
>(({ className, value = [0], onValueChange, max = 100, min = 0, step = 1, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onValueChange) {
      onValueChange([Number(e.target.value)]);
    }
  };

  return (
    <div
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <input
        type="range"
        value={value[0]}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        className="w-full h-2 bg-primary/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
      />
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider };
