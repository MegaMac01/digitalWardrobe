import React, { useState } from "react";
import { Typography } from "@mui/material";
import ClothingUploader from "../components/clothing/ClothingUploader";
import ClothingGallery from "../components/clothing/ClothingGallery";
import ClothingFilterBar from "../components/clothing/ClothingFilterBar";

const DEFAULT_FILTERS = {
  search: "",
  type: "",
  season: "",
  vibe: "",
  favoritesOnly: false,
};

export default function GalleryPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  return (
    <>
      <Typography variant="h3" sx={{ mb: 1 }}>
        Your Wardrobe
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.2 }}>
        Upload each item once and let the app style complete looks.
      </Typography>
      <ClothingUploader />
      <ClothingFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />
      <ClothingGallery filters={filters} />
    </>
  );
}
