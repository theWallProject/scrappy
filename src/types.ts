import { ReasonsSchema } from "@theWallProject/addonCommon";
import { z } from "zod";

const ScrappedItemSchema = z.object({
  name: z.string(),
  reasons: ReasonsSchema,
  li: z.string().optional(),
  ws: z.string().optional(),
  fb: z.string().optional(),
  tw: z.string().optional(),
  founderIds: z
    .array(
      z.object({
        name: z.string(),
        link: z.string().url(),
      }),
    )
    .optional(),
  investorIds: z
    .array(
      z.object({
        name: z.string(),
        link: z.string().url(),
      }),
    )
    .optional(),
  acquirerIds: z
    .array(
      z.object({
        name: z.string(),
        link: z.string().url(),
      }),
    )
    .optional(),
});

export const APIScrapperFileDataSchema = z.array(ScrappedItemSchema);

export const ManualItemSchema = z.object({
  reasons: ReasonsSchema,
  name: z.string(),
  li: z.array(z.string()).optional(),
  ws: z.array(z.string()),
  fb: z.array(z.string()).optional(),
  tw: z.array(z.string()).optional(),
});

export type ManualItemType = z.infer<typeof ManualItemSchema>;
export type ScrappedItemType = z.infer<typeof ScrappedItemSchema>;
export type ScrappedFileType = z.infer<typeof APIScrapperFileDataSchema>;
