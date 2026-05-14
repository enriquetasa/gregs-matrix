import { z } from "zod";

export const createMatrixSchema = z.object({
  title: z.string().max(200).optional(),
  password: z.string().min(4).max(128).optional(),
});

export const unlockMatrixSchema = z.object({
  password: z.string().min(1).max(128),
});

export const quadrantSchema = z.enum([
  "DO_NOW",
  "MAKE_EASY_THEN_DO",
  "DO_WHEN_PASSING",
  "IGNORE",
]);

export const createTopicSchema = z.object({
  text: z.string().min(1).max(120),
  quadrant: quadrantSchema,
});

export const patchTopicSchema = z.object({
  text: z.string().min(1).max(120).optional(),
  quadrant: quadrantSchema.optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
});

export const patchMatrixSchema = z.object({
  title: z.string().max(200).optional(),
  password: z.string().min(4).max(128).nullable().optional(),
  currentPassword: z.string().optional(),
});
