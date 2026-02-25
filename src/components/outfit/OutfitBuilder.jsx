import React, { useMemo, useState } from "react";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import {
  Alert,
  Box,
  Button,
  Card,
  CardMedia,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useClothes } from "../../hooks/useClothes";
import { useOutfits } from "../../hooks/useOutfits";
import { useWeather } from "../../hooks/useWeather";
import Loader from "../layout/Loader";
import Toast from "../layout/Toast";
import {
  buildOutfitName,
  buildSuggestedOutfit,
  TYPE_ORDER,
  VIBE_OPTIONS,
} from "../../utils/outfitEngine";
import { logClientError } from "../../utils/telemetry";
import { sanitizeText, validateOutfitName } from "../../utils/validation";

function reorderTypes(order, draggingType, targetType) {
  if (!draggingType || draggingType === targetType) {
    return order;
  }

  const next = [...order];
  const dragIndex = next.indexOf(draggingType);
  const targetIndex = next.indexOf(targetType);
  if (dragIndex < 0 || targetIndex < 0) {
    return order;
  }

  next.splice(dragIndex, 1);
  next.splice(targetIndex, 0, draggingType);
  return next;
}

function moveTypeByStep(order, type, step) {
  const currentIndex = order.indexOf(type);
  const targetIndex = currentIndex + step;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return order;
  }
  const next = [...order];
  next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, type);
  return next;
}

export default function OutfitBuilder() {
  const { clothes, groupedByType, loading } = useClothes();
  const { addOutfit } = useOutfits();
  const { weather } = useWeather();

  const [selected, setSelected] = useState({});
  const [previewOrder, setPreviewOrder] = useState(TYPE_ORDER);
  const [draggingType, setDraggingType] = useState(null);
  const [vibe, setVibe] = useState("Any");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const selectedItems = useMemo(() => {
    return TYPE_ORDER.reduce((acc, type) => {
      acc[type] = clothes.find((item) => item.id === selected[type]) ?? null;
      return acc;
    }, {});
  }, [clothes, selected]);

  const missingRequired = ["Shirt", "Pants", "Shoes"].filter((type) => !selected[type]);

  function handleSelect(type, itemId) {
    setSelected((prev) => ({ ...prev, [type]: prev[type] === itemId ? null : itemId }));
  }

  function handleAutoSuggest() {
    const suggestion = buildSuggestedOutfit(clothes, { vibe, weather });
    setSelected(suggestion.itemIdsByType);
    if (suggestion.previewOrder?.length) {
      const remaining = TYPE_ORDER.filter((type) => !suggestion.previewOrder.includes(type));
      setPreviewOrder([...suggestion.previewOrder, ...remaining]);
    }
    if (!name) {
      setName(buildOutfitName(vibe, weather));
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    const nameError = validateOutfitName(name);
    if (nameError) {
      setToast({ open: true, message: nameError, severity: "warning" });
      return;
    }
    if (missingRequired.length > 0) {
      setToast({
        open: true,
        message: `Pick ${missingRequired.join(", ")} before saving.`,
        severity: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const orderedPreview = previewOrder.filter((type) => selected[type]);

      await addOutfit({
        name: sanitizeText(name, 60),
        notes: sanitizeText(notes, 240),
        vibe,
        itemIdsByType: selected,
        previewOrder: orderedPreview,
        weatherSnapshot: weather ?? null,
        source: "builder",
      });
      setSelected({});
      setName("");
      setNotes("");
      setToast({ open: true, message: "Outfit saved.", severity: "success" });
    } catch (error) {
      logClientError(error, { scope: "builder", action: "save-outfit" });
      setToast({ open: true, message: "Could not save outfit.", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loader />;
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.2}
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 2 }}
      >
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Outfit Builder
        </Typography>
        <TextField
          select
          size="small"
          label="Vibe"
          value={vibe}
          onChange={(event) => setVibe(event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="Any">Any</MenuItem>
          {VIBE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          startIcon={<AutoFixHighIcon />}
          onClick={handleAutoSuggest}
          disabled={clothes.length === 0}
        >
          Auto Pick
        </Button>
      </Stack>

      {weather && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Weather cue: {Math.round(weather.temperature)}F, {weather.label}.
        </Alert>
      )}

      <Grid container spacing={2}>
        {TYPE_ORDER.map((type) => (
          <Grid item xs={12} md={6} key={type}>
            <Card sx={{ p: 1.2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {type}
              </Typography>
              <Grid container spacing={1}>
                {groupedByType[type]?.length ? (
                  groupedByType[type].map((item) => (
                    <Grid item xs={4} sm={3} key={item.id}>
                      <Card
                        onClick={() => handleSelect(type, item.id)}
                        sx={{
                          cursor: "pointer",
                          overflow: "hidden",
                          border:
                            selected[type] === item.id
                              ? "2px solid rgba(111,75,50,0.9)"
                              : "1px solid transparent",
                        }}
                      >
                        <CardMedia
                          component="img"
                          image={item.imageUrl}
                          alt={item.type}
                          loading="lazy"
                          decoding="async"
                          sx={{ aspectRatio: "1 / 1", objectFit: "cover" }}
                        />
                      </Card>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      No {type.toLowerCase()} items yet.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card component="form" onSubmit={handleSave} sx={{ mt: 3, p: 2 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Save This Outfit
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField
            label="Outfit Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Card>

      <Card sx={{ mt: 2.2, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.2 }}>
          Preview
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Drag pieces to reorder how this outfit is displayed in saved cards.
        </Typography>
        <Grid container spacing={1}>
          {previewOrder.map((type) => (
            <Grid item xs={6} sm={4} md={2} key={type}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                ::
                {type}
              </Typography>
              <Stack direction="row" spacing={0.4} sx={{ mt: 0.2, mb: 0.2 }}>
                <IconButton
                  size="small"
                  onClick={() => setPreviewOrder((prev) => moveTypeByStep(prev, type, -1))}
                  aria-label={`Move ${type} earlier`}
                >
                  <ArrowBackIosNewIcon fontSize="inherit" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setPreviewOrder((prev) => moveTypeByStep(prev, type, 1))}
                  aria-label={`Move ${type} later`}
                >
                  <ArrowForwardIosIcon fontSize="inherit" />
                </IconButton>
              </Stack>
              {selectedItems[type] ? (
                <CardMedia
                  component="img"
                  image={selectedItems[type].imageUrl}
                  alt={type}
                  loading="lazy"
                  decoding="async"
                  draggable
                  onDragStart={() => setDraggingType(type)}
                  onDragEnd={() => setDraggingType(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setPreviewOrder((prev) => reorderTypes(prev, draggingType, type));
                    setDraggingType(null);
                  }}
                  sx={{
                    mt: 0.5,
                    borderRadius: 1.2,
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    cursor: "grab",
                    opacity: draggingType === type ? 0.5 : 1,
                  }}
                />
              ) : (
                <Box
                  draggable
                  onDragStart={() => setDraggingType(type)}
                  onDragEnd={() => setDraggingType(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setPreviewOrder((prev) => reorderTypes(prev, draggingType, type));
                    setDraggingType(null);
                  }}
                  sx={{
                    mt: 0.5,
                    border: "1px dashed rgba(111,75,50,0.3)",
                    borderRadius: 1.2,
                    aspectRatio: "1 / 1",
                    display: "grid",
                    placeItems: "center",
                    color: "text.secondary",
                    fontSize: 12,
                    cursor: "grab",
                    opacity: draggingType === type ? 0.5 : 1,
                  }}
                >
                  Empty
                </Box>
              )}
            </Grid>
          ))}
        </Grid>
      </Card>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
