import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toDbBool(value: unknown): 0 | 1 {
  return value === true || value === 1 || value === "1" ? 1 : 0
}

export function fromDbBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1"
}
