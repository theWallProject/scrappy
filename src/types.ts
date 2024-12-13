import { ReasonsSchema } from "@thewall/common";
import { z } from "zod";

const ScrappedItemSchema = z.object({
  reasons: ReasonsSchema,
  name: z.string(),
  li: z.string(),
  ws: z.string(),
  fb: z.string(),
  tw: z.string(),
  founderIds: z.array(
    z.object({
      name: z.string(),
      link: z.string().url(),
    }),
  ),
  investorIds: z.array(
    z.object({
      name: z.string(),
      link: z.string().url(),
    }),
  ),
  acquirerIds: z.array(
    z.object({
      name: z.string(),
      link: z.string().url(),
    }),
  ),
});

export const APIScrapperFileDataSchema = z.array(ScrappedItemSchema);

export type ScrappedItemType = z.infer<typeof ScrappedItemSchema>;
export type ScrappedFileType = z.infer<typeof APIScrapperFileDataSchema>;
