import React from "react";
import { Box } from "@mui/material";
import { TYPE_ROLE, itemForRole } from "../../utils/outfitEngine";

// A stylized "on-body" view: garment cutouts laid over a simple figure, grouped
// by where they sit on the body. Flat-photographed clothes won't drape like a
// real photo — this is an illustrative paper-doll, not photoreal.
//
// SWAP POINT for the future photoreal phase: pass `tryOnImageUrl` (a generated
// image of the user wearing the outfit) and it is shown instead of the
// composite, with no change to any caller. The figure stays as the fallback
// while a try-on image is being generated or when one isn't available.

// Region boxes as percentages of the figure frame: { top, left, width, height }.
// `left` omitted means horizontally centered. Torso and bottom overlap slightly
// so there's no bare-figure gap at the waist.
const REGIONS = {
  hat: { top: 1, width: 24, height: 13 },
  torso: { top: 13, width: 64, height: 38 },
  dress: { top: 14, width: 66, height: 54 },
  bottom: { top: 44, width: 54, height: 42 },
  shoes: { top: 87, width: 46, height: 13 },
  bag: { top: 44, left: 71, width: 25, height: 23 },
};

function Piece({ item, region }) {
  if (!item) return null;
  const { top, left, width, height } = region;
  return (
    <Box
      component="img"
      src={item.imageUrl}
      alt={item.type}
      loading="lazy"
      sx={{
        position: "absolute",
        top: `${top}%`,
        left: left != null ? `${left}%` : "50%",
        transform: left != null ? "none" : "translateX(-50%)",
        width: `${width}%`,
        height: `${height}%`,
        objectFit: "contain",
        filter: "drop-shadow(0 2px 4px rgba(60,40,25,0.18))",
      }}
    />
  );
}

// Neutral full-body silhouette drawn behind the clothes.
function Silhouette() {
  return (
    <Box
      component="svg"
      viewBox="0 0 100 200"
      preserveAspectRatio="xMidYMid meet"
      sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {/* A slim, faint figure that sits behind the clothes as a guide. */}
      {/* head */}
      <circle cx="50" cy="14" r="9" fill="rgba(111,75,50,0.12)" />
      {/* slim neck + torso + legs as one soft body shape */}
      <path
        d="M46 23 h8 q6 2 7 10 l-1 27 q-1 5 -4 6 l1 39 q0 8 -2 39 h-7 l-2 -37 h-2 l-2 37 h-7 q-2 -31 -2 -39 l1 -39 q-3 -1 -4 -6 l-1 -27 q1 -8 7 -10 z"
        fill="rgba(111,75,50,0.12)"
      />
    </Box>
  );
}

export default function OutfitFigure({ items = [], tryOnImageUrl = null, height = 460 }) {
  const frame = {
    position: "relative",
    width: "100%",
    maxWidth: 260,
    mx: "auto",
    height,
  };

  // Future photoreal phase: a generated image wins over the composite.
  if (tryOnImageUrl) {
    return (
      <Box sx={frame}>
        <Box
          component="img"
          src={tryOnImageUrl}
          alt="You wearing this outfit"
          sx={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 2 }}
        />
      </Box>
    );
  }

  const dress = itemForRole(items, ["onepiece"]);
  // The outermost torso layer is the one you'd actually see.
  const torso = itemForRole(items, ["outer"]) || itemForRole(items, ["mid"]) || itemForRole(items, ["base"]);
  const bottom = itemForRole(items, ["bottom"]);
  const shoes = itemForRole(items, ["footwear"]);

  const accessories = items.filter((item) => TYPE_ROLE[item.type] === "accessory");
  const hat = accessories.find((item) => item.type === "Hat");
  const bag = accessories.find((item) => item.type === "Bag");

  return (
    <Box sx={frame}>
      <Silhouette />
      {dress ? (
        <Piece item={dress} region={REGIONS.dress} />
      ) : (
        <>
          <Piece item={torso} region={REGIONS.torso} />
          <Piece item={bottom} region={REGIONS.bottom} />
        </>
      )}
      <Piece item={shoes} region={REGIONS.shoes} />
      <Piece item={hat} region={REGIONS.hat} />
      <Piece item={bag} region={REGIONS.bag} />
    </Box>
  );
}
