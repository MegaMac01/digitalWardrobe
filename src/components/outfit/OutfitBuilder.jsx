import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import TodayIcon from "@mui/icons-material/Today";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useClothes } from "../../hooks/useClothes";
import { useOutfits } from "../../hooks/useOutfits";
import { useWeather } from "../../hooks/useWeather";
import { suggestOutfit } from "../../utils/aiStylist";
import {
  buildOutfitName,
  buildSuggestedOutfit,
  missingEssentials,
  FORMALITY_OPTIONS,
  TYPE_ORDER,
  TYPE_ROLE,
  VIBE_OPTIONS,
} from "../../utils/outfitEngine";
import { toISODate, formatTemp } from "../../utils/helpers";
import { sanitizeText, validateOutfitName } from "../../utils/validation";
import { logClientError } from "../../utils/telemetry";
import Loader from "../layout/Loader";
import EmptyState from "../layout/EmptyState";
import Toast from "../layout/Toast";

// Visual order is top-of-body to bottom, then accessories.
const SLOTS = [
  { key: "outer", label: "Outer layer", roles: ["outer"], optional: true },
  { key: "mid", label: "Mid layer", roles: ["mid"], optional: true },
  { key: "top", label: "Top or dress", roles: ["base", "onepiece"] },
  { key: "bottom", label: "Bottom", roles: ["bottom"] },
  { key: "footwear", label: "Shoes", roles: ["footwear"] },
  { key: "accessory", label: "Accessories", roles: ["accessory"], optional: true, multi: true },
];

const CHECKER_BG = {
  backgroundColor: "#efe7d6",
  backgroundImage:
    "linear-gradient(45deg, rgba(111,75,50,0.1) 25%, transparent 25%), linear-gradient(-45deg, rgba(111,75,50,0.1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(111,75,50,0.1) 75%), linear-gradient(-45deg, transparent 75%, rgba(111,75,50,0.1) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

function formalityWord(items) {
  const values = items.map((item) => Number(item.formality ?? 3)).filter(Boolean);
  if (values.length === 0) return null;
  const avg = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  const match = FORMALITY_OPTIONS.find((option) => option.value === avg);
  return match ? match.label.split(" - ")[1] : null;
}

export default function OutfitBuilder() {
  const navigate = useNavigate();
  const { clothes, loading } = useClothes();
  const { addOutfit } = useOutfits();
  const { weather } = useWeather();

  const [selected, setSelected] = useState({}); // type -> itemId
  const [locked, setLocked] = useState(() => new Set()); // types
  const [vibe, setVibe] = useState("Any");
  const [name, setName] = useState("");
  const [styling, setStyling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(null); // slot config or null
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const clothesById = useMemo(() => {
    const map = new Map();
    clothes.forEach((item) => map.set(item.id, item));
    return map;
  }, [clothes]);

  const selectedItems = useMemo(() => {
    const map = {};
    Object.entries(selected).forEach(([type, id]) => {
      const item = clothesById.get(id);
      if (item) map[type] = item;
    });
    return map;
  }, [selected, clothesById]);

  const itemsList = useMemo(() => Object.values(selectedItems), [selectedItems]);
  const hasOnepiece = itemsList.some((item) => TYPE_ROLE[item.type] === "onepiece");
  const missing = missingEssentials(selectedItems);
  const colors = [...new Set(itemsList.map((item) => item.color).filter(Boolean))];
  const dressiness = formalityWord(itemsList);

  function applySelection(itemIdsByType) {
    const next = {};
    Object.entries(itemIdsByType).forEach(([type, id]) => {
      if (id) next[type] = id;
    });
    setSelected(next);
  }

  function setPick(item) {
    setSelected((prev) => {
      const next = { ...prev };
      const role = TYPE_ROLE[item.type];
      const clearRoles = {
        onepiece: ["onepiece", "base", "bottom"],
        base: ["base", "onepiece"],
        bottom: ["bottom", "onepiece"],
        mid: ["mid"],
        outer: ["outer"],
        footwear: ["footwear"],
        accessory: [],
      }[role] ?? [role];

      Object.keys(next).forEach((type) => {
        if (clearRoles.includes(TYPE_ROLE[type])) delete next[type];
      });

      if (role === "accessory") {
        const accTypes = Object.keys(next).filter((type) => TYPE_ROLE[type] === "accessory");
        if (accTypes.length >= 2 && !next[item.type]) delete next[accTypes[0]];
      }

      next[item.type] = item.id;
      return next;
    });
    setPicker(null);
  }

  function removeType(type) {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    setLocked((prev) => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  }

  function toggleLock(type) {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function lockedItemIds() {
    return [...locked].map((type) => selected[type]).filter(Boolean);
  }

  function lockedItemsList() {
    return [...locked].map((type) => selectedItems[type]).filter(Boolean);
  }

  async function handleStyle() {
    setStyling(true);
    try {
      const { suggestion, source } = await suggestOutfit(clothes, {
        vibe,
        weather,
        lockedItemIds: lockedItemIds(),
      });
      applySelection(suggestion.itemIdsByType);
      if (!name) setName(suggestion.name || buildOutfitName(vibe, weather));
      if (source === "rules") {
        setToast({ open: true, message: "AI stylist unavailable. Used the built-in engine.", severity: "info" });
      }
    } finally {
      setStyling(false);
    }
  }

  function handleShuffle() {
    const suggestion = buildSuggestedOutfit(clothes, { vibe, weather, locked: lockedItemsList() });
    applySelection(suggestion.itemIdsByType);
    if (!name) setName(buildOutfitName(vibe, weather));
  }

  async function handleSave({ wearToday } = {}) {
    const nameError = validateOutfitName(name);
    if (nameError) {
      setToast({ open: true, message: nameError, severity: "warning" });
      return;
    }
    if (missing.length > 0) {
      setToast({ open: true, message: `Add ${missing.join(", ")} first.`, severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      await addOutfit({
        name: sanitizeText(name, 60),
        notes: "",
        vibe,
        itemIdsByType: { ...selected },
        previewOrder: TYPE_ORDER.filter((type) => selected[type]),
        weatherSnapshot: weather ?? null,
        source: "builder",
        ...(wearToday ? { scheduledDates: [toISODate(new Date())] } : {}),
      });
      setToast({
        open: true,
        message: wearToday ? "Saved and added to today's plan." : "Outfit saved.",
        severity: "success",
      });
    } catch (error) {
      logClientError(error, { scope: "builder", action: "save-outfit" });
      setToast({ open: true, message: "Could not save the outfit.", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Loader />;
  }

  if (clothes.length === 0) {
    return (
      <EmptyState
        title="Nothing to build with yet"
        description="Add a few pieces to your closet, then come back to style them into outfits."
        actionLabel="Add clothes"
        onAction={() => navigate("/closet")}
      />
    );
  }

  const pickerItems = picker
    ? clothes.filter((item) => picker.roles.includes(TYPE_ROLE[item.type]))
    : [];

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.2}
        alignItems={{ xs: "stretch", sm: "center" }}
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
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="Any">Any</MenuItem>
          {VIBE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={styling ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
          onClick={handleStyle}
          disabled={styling}
        >
          {styling ? "Styling…" : "Style me"}
        </Button>
        <Button variant="outlined" startIcon={<ShuffleIcon />} onClick={handleShuffle} disabled={styling}>
          Shuffle
        </Button>
      </Stack>

      {locked.size > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Locked pieces stay put when you Style or Shuffle.
        </Typography>
      )}

      <Grid container spacing={2}>
        {/* The look, slot by slot */}
        <Grid item xs={12} md={7}>
          <Stack spacing={1.2}>
            {SLOTS.map((slot) => {
              const slotItems = itemsList.filter((item) => slot.roles.includes(TYPE_ROLE[item.type]));
              const bottomCovered = slot.key === "bottom" && hasOnepiece;

              return (
                <Card key={slot.key} variant="outlined">
                  <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" sx={{ width: 110, flexShrink: 0 }}>
                        {slot.label}
                        {!slot.optional && !bottomCovered && (
                          <Box component="span" sx={{ color: "error.main" }}>
                            {" "}
                            *
                          </Box>
                        )}
                      </Typography>

                      {bottomCovered ? (
                        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                          Covered by your dress.
                        </Typography>
                      ) : slotItems.length > 0 ? (
                        <Stack direction="row" spacing={1} sx={{ flexGrow: 1, flexWrap: "wrap", rowGap: 1 }}>
                          {slotItems.map((item) => (
                            <Stack key={item.id} direction="row" spacing={0.5} alignItems="center">
                              <CardMedia
                                component="img"
                                image={item.imageUrl}
                                alt={item.type}
                                sx={{
                                  width: 56,
                                  height: 56,
                                  borderRadius: 1,
                                  objectFit: "contain",
                                  ...CHECKER_BG,
                                }}
                              />
                              <Stack>
                                <Tooltip title={locked.has(item.type) ? "Locked" : "Lock this piece"}>
                                  <IconButton size="small" onClick={() => toggleLock(item.type)}>
                                    {locked.has(item.type) ? (
                                      <LockIcon fontSize="small" color="secondary" />
                                    ) : (
                                      <LockOpenIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove">
                                  <IconButton size="small" onClick={() => removeType(item.type)}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          ))}
                          {(slot.multi ? slotItems.length < 2 : false) && (
                            <Button size="small" startIcon={<AddIcon />} onClick={() => setPicker(slot)}>
                              Add
                            </Button>
                          )}
                          {!slot.multi && (
                            <Button size="small" startIcon={<SwapHorizIcon />} onClick={() => setPicker(slot)}>
                              Swap
                            </Button>
                          )}
                        </Stack>
                      ) : (
                        <Button
                          variant="text"
                          startIcon={<AddIcon />}
                          onClick={() => setPicker(slot)}
                          sx={{ flexGrow: 1, justifyContent: "flex-start", color: "text.secondary" }}
                        >
                          Add {slot.label.toLowerCase()}
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Read-out + save */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2, position: { md: "sticky" }, top: { md: 88 } }}>
            {weather && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {formatTemp(weather.temperature)} · {weather.label}
              </Typography>
            )}

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 1.5 }}>
              <Chip
                size="small"
                color={missing.length === 0 ? "success" : "warning"}
                label={missing.length === 0 ? "Ready to wear" : `Add ${missing.join(", ")}`}
              />
              {dressiness && <Chip size="small" variant="outlined" label={dressiness} />}
              {colors.map((color) => (
                <Chip key={color} size="small" variant="outlined" label={color} />
              ))}
            </Stack>

            <TextField
              label="Outfit name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1.5 }}
            />

            <Stack spacing={1}>
              <Button
                variant="contained"
                startIcon={<TodayIcon />}
                onClick={() => handleSave({ wearToday: true })}
                disabled={saving}
              >
                Wear today
              </Button>
              <Button
                variant="outlined"
                startIcon={<BookmarkBorderIcon />}
                onClick={() => handleSave()}
                disabled={saving}
              >
                Save outfit
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Picker */}
      <Dialog open={Boolean(picker)} onClose={() => setPicker(null)} fullWidth maxWidth="sm">
        <DialogTitle>{picker ? `Choose ${picker.label.toLowerCase()}` : ""}</DialogTitle>
        <DialogContent dividers>
          {pickerItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items for this slot yet. Add some in your closet.
            </Typography>
          ) : (
            <Grid container spacing={1.2}>
              {pickerItems.map((item) => {
                const isSelected = selected[item.type] === item.id;
                return (
                  <Grid item xs={4} sm={3} key={item.id}>
                    <Card
                      onClick={() => setPick(item)}
                      sx={{
                        cursor: "pointer",
                        border: isSelected ? "2px solid" : "1px solid transparent",
                        borderColor: isSelected ? "secondary.main" : "transparent",
                      }}
                    >
                      <CardMedia
                        component="img"
                        image={item.imageUrl}
                        alt={item.type}
                        sx={{ aspectRatio: "1 / 1", objectFit: "contain", ...CHECKER_BG }}
                      />
                      <Typography variant="caption" sx={{ display: "block", textAlign: "center", py: 0.3 }}>
                        {item.color || item.type}
                      </Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
