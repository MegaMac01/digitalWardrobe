import React from "react";
import { Box, Stack } from "@mui/material";
import { TYPE_ORDER, TYPE_ROLE } from "../../utils/outfitEngine";

// Read-only flat-lay of an outfit: layers up top, body line down the middle,
// accessories at the foot. Expects itemIdsByType (type -> id) and a clothesById
// object/Map. Items are background-free cutouts, drawn "contain" with no fill.
export default function OutfitPreview({ itemIdsByType = {}, clothesById }) {
  const lookup = (id) => (clothesById?.get ? clothesById.get(id) : clothesById?.[id]) ?? null;

  const itemForRoles = (roles) => {
    const type = TYPE_ORDER.find((t) => roles.includes(TYPE_ROLE[t]) && itemIdsByType[t]);
    return type ? lookup(itemIdsByType[type]) : null;
  };

  const accessories = TYPE_ORDER.filter((t) => TYPE_ROLE[t] === "accessory" && itemIdsByType[t])
    .map((t) => lookup(itemIdsByType[t]))
    .filter(Boolean);

  const top = itemForRoles(["base", "onepiece"]);
  const isDress = top && TYPE_ROLE[top.type] === "onepiece";
  const outer = itemForRoles(["outer"]);
  const mid = itemForRoles(["mid"]);
  const bottom = itemForRoles(["bottom"]);
  const shoes = itemForRoles(["footwear"]);

  const piece = (item, width, height = width) =>
    item ? (
      <Box
        component="img"
        src={item.imageUrl}
        alt={item.type}
        loading="lazy"
        sx={{ width, height, objectFit: "contain" }}
      />
    ) : null;

  return (
    <Box sx={{ maxWidth: 360, mx: "auto" }}>
      {(outer || mid) && (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
          {piece(outer, 84)}
          {piece(mid, 84)}
        </Stack>
      )}
      <Stack spacing={1} alignItems="center">
        {piece(top, 168, isDress ? 230 : 168)}
        {!isDress && piece(bottom, 168)}
        {piece(shoes, 168, 120)}
      </Stack>
      {accessories.length > 0 && (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }}>
          {accessories.map((item) => (
            <React.Fragment key={item.id}>{piece(item, 76)}</React.Fragment>
          ))}
        </Stack>
      )}
    </Box>
  );
}
