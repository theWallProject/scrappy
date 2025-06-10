import { ReasonsSchema } from "@theWallProject/addonCommon";
import { z } from "zod";

const ScrappedItemSchema = z.object({
  name: z.string(),
  link: z.string().optional(),
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
  /** short_description */
  description: z.string().optional(),

  /** rank_org_company */
  cb: z.string().optional(),

  /** revenue_range */
  estRevenue: z.string().optional(),

  /** categories */
  industries: z
    .array(
      z.object({
        name: z.string(),
        link: z.string().url(),
      }),
    )
    .optional(),

  /** category_groups */
  industryGroups: z
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
  name: z.string().min(1, { message: "String cannot be empty" }),
  li: z.array(z.string()).optional(),
  ws: z.array(z.string()).min(1, { message: "String cannot be empty" }),
  fb: z.array(z.string()).optional(),
  tw: z.array(z.string()).optional(),
});

export const BuyIsraeliTechSchema = z.array(
  z.object({
    Name: z.string().min(1, { message: "String cannot be empty" }),
    Link: z.union([
      z.string().min(1, { message: "String cannot be empty" }),
      z.null(),
    ]),
    IsraelRelation: z.union([z.literal("HQ"), z.literal("Satellite Office")]),
  }),
);

export type ManualItemType = z.infer<typeof ManualItemSchema>;
export type ScrappedItemType = z.infer<typeof ScrappedItemSchema>;
export type ScrappedFileType = z.infer<typeof APIScrapperFileDataSchema>;
export type BuyIsraeliTechType = z.infer<typeof BuyIsraeliTechSchema>;
