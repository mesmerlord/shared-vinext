import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// QUIRK: cn = twMerge(clsx(...)) is the canonical tailwind-class merger
// used across all reference projects. See canonical.md Topic 6.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
