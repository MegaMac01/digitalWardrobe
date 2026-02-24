import React, { useMemo, useState } from "react";
import { Alert, Box, Grid, Typography } from "@mui/material";
import Loader from "../layout/Loader";
import Toast from "../layout/Toast";
import ClothingCard from "./ClothingCard";
import { useClothes } from "../../hooks/useClothes";

function matchFilter(item, filters) {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const matchesSearch =
    !search ||
    item.color?.toLowerCase().includes(search) ||
    item.notes?.toLowerCase().includes(search) ||
    item.type?.toLowerCase().includes(search);
  const matchesType = !filters.type || item.type === filters.type;
  const matchesSeason =
    !filters.season ||
    item.seasonTags?.includes("Any") ||
    item.seasonTags?.includes(filters.season);
  const matchesVibe = !filters.vibe || item.vibes?.includes(filters.vibe);
  const matchesFavorite = !filters.favoritesOnly || Boolean(item.favorite);

  return matchesSearch && matchesType && matchesSeason && matchesVibe && matchesFavorite;
}

export default function ClothingGallery({ filters }) {
  const { clothes, loading, error, updateClothing, deleteClothing } = useClothes();
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const filtered = useMemo(
    () => clothes.filter((item) => matchFilter(item, filters)),
    [clothes, filters]
  );

  async function handleToggleFavorite(item) {
    await updateClothing(item.id, { favorite: !item.favorite });
  }

  async function handleDelete(item) {
    await deleteClothing(item);
    setToast({ open: true, message: "Item removed.", severity: "success" });
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.6 }}>
        Showing {filtered.length} of {clothes.length} pieces
      </Typography>

      {filtered.length === 0 ? (
        <Alert severity="info">No items match this filter yet.</Alert>
      ) : (
        <Grid container spacing={1.8}>
          {filtered.map((item) => (
            <Grid item key={item.id} xs={12} sm={6} md={4} lg={3}>
              <ClothingCard
                item={item}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
