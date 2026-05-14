import { Quadrant } from "@prisma/client";

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  DO_NOW: "Do now",
  MAKE_EASY_THEN_DO: "Make easy, then do",
  DO_WHEN_PASSING: "Do when passing by",
  IGNORE: "Ignore",
};

export const QUADRANTS: Quadrant[] = [
  "DO_NOW",
  "MAKE_EASY_THEN_DO",
  "DO_WHEN_PASSING",
  "IGNORE",
];

export function parseQuadrant(value: unknown): Quadrant | null {
  if (typeof value !== "string") return null;
  if (QUADRANTS.includes(value as Quadrant)) return value as Quadrant;
  return null;
}
