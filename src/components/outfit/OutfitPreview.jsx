import React from "react";
import { Box, Stack } from "@mui/material";
import { TYPE_ROLE, itemForRole, accessoriesOf } from "../../utils/outfitEngine";

// Read-only flat-lay of an outfit, top-of-body to bottom, accessories at the
// foot. Pieces are background-free cutouts drawn "contain" at a consistent
// size, so any number of pieces stays balanced. Accepts either a resolved
// `items` array or an `itemIds` array plus a `clothesById` object/Map.
export default function OutfitPreview({ items, itemIds = [], clothesById }) {
  const lookup = (id) => (clothesById?.get ? clothesById.get(id) : clothesById?.[id]) ?? null;
  const resolved = items ?? itemIds.map(lookup).filter(Boolean);

  const top = itemForRole(resolved, ["base", "onepiece"]);
  const isDress = top && TYPE_ROLE[top.type] === "onepiece";

  // Main pieces, in the order you'd see them on the body.
  const mainPieces = [
    itemForRole(resolved, ["outer"]),
    itemForRole(resolved, ["mid"]),
    top,
    isDress ? null : itemForRole(resolved, ["bottom"]),
    itemForRole(resolved, ["footwear"]),
  ].filter(Boolean);

  const accessories = accessoriesOf(resolved);

  return (
    <Box sx={{ maxWidth: 320, mx: "auto" }}>
      <Stack spacing={1.2} alignItems="center">
        {mainPieces.map((item) => (
          <Box
            key={item.id}
            component="img"
            src={item.imageUrl}
            alt={item.type}
            loading="lazy"
            sx={{
              width: 160,
              height: TYPE_ROLE[item.type] === "onepiece" ? 220 : 160,
              objectFit: "contain",
            }}
          />
        ))}
      </Stack>
      {accessories.length > 0 && (
        <Stack
          direction="row"
          spacing={1.2}
          justifyContent="center"
          sx={{ mt: 1.2, flexWrap: "wrap", rowGap: 1.2 }}
        >
          {accessories.map((item) => (
            <Box
              key={item.id}
              component="img"
              src={item.imageUrl}
              alt={item.type}
              loading="lazy"
              sx={{ width: 84, height: 84, objectFit: "contain" }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
