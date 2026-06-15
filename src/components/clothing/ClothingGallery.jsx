import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, Typography } from "@mui/material";
import Loader from "../layout/Loader";
import Toast from "../layout/Toast";
import EmptyState from "../layout/EmptyState";
import ClothingCard from "./ClothingCard";
import ClothingFilterBar from "./ClothingFilterBar";
import { useClothes } from "../../hooks/useClothes";
import { useDeferredDelete } from "../../hooks/useDeferredDelete";

const PAGE_SIZE = 24;

const DEFAULT_FILTERS = {
  search: "",
  type: "",
  season: "",
  vibe: "",
  favoritesOnly: false,
};

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

export default function ClothingGallery({ onAddItem }) {
  const { clothes, loading, error, updateClothing, deleteClothing } = useClothes();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info", undoId: null });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { pendingIds, scheduleDelete, undoDelete } = useDeferredDelete(deleteClothing);

  const filtered = useMemo(
    () => clothes.filter((item) => matchFilter(item, filters)),
    [clothes, filters]
  );

  // Hide items that are pending deletion so undo can restore them instantly.
  const shown = useMemo(
    () => filtered.filter((item) => !pendingIds.has(item.id)),
    [filtered, pendingIds]
  );

  // Reset to first page whenever filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const visible = shown.slice(0, visibleCount);
  const hasMore = shown.length > visibleCount;

  async function handleToggleFavorite(item) {
    await updateClothing(item.id, { favorite: !item.favorite });
  }

  function handleDelete(item) {
    scheduleDelete(item.id, item);
    setToast({ open: true, message: "Item removed.", severity: "info", undoId: item.id });
  }

  function handleUndo() {
    if (toast.undoId) undoDelete(toast.undoId);
    setToast((prev) => ({ ...prev, open: false, undoId: null }));
  }

  if (loading) {
    return <Loader />;
  }

  if (clothes.length === 0) {
    return (
      <EmptyState
        title="Your closet is empty"
        description="Snap a photo of a piece, tag its type and vibe, and the stylist can start building outfits. The background gets cut out automatically."
        actionLabel="Add your first item"
        onAction={onAddItem}
      />
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <ClothingFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.6 }}>
        Showing {visible.length} of {shown.length} pieces
        {clothes.length !== shown.length && ` (${clothes.length} total)`}
      </Typography>

      {shown.length === 0 ? (
        <Alert severity="info">No items match this filter yet.</Alert>
      ) : (
        <>
          <Grid container spacing={1.8}>
            {visible.map((item) => (
              <Grid item key={item.id} xs={12} sm={6} md={4} lg={3}>
                <ClothingCard
                  item={item}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                />
              </Grid>
            ))}
          </Grid>

          {hasMore && (
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Button
                variant="outlined"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Show more ({shown.length - visibleCount} remaining)
              </Button>
            </Box>
          )}
        </>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        action={
          toast.undoId ? (
            <Button color="inherit" size="small" onClick={handleUndo}>
              UNDO
            </Button>
          ) : undefined
        }
        onClose={() => setToast((prev) => ({ ...prev, open: false, undoId: null }))}
      />
    </Box>
  );
}
