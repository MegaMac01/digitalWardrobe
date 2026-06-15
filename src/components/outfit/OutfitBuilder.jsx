import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import TodayIcon from "@mui/icons-material/Today";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
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

// Pieces laid out like a real outfit: layers up top, the body line down the
// middle (top/dress -> bottom -> shoes), accessories at the foot.
const OUTER_CFG = { label: "Outer", roles: ["outer"] };
const MID_CFG = { label: "Mid", roles: ["mid"] };
const TOP_CFG = { label: "Top / dress", roles: ["base", "onepiece"] };
const BOTTOM_CFG = { label: "Bottom", roles: ["bottom"] };
const SHOES_CFG = { label: "Shoes", roles: ["footwear"] };
const ACC_CFG = { label: "Accessory", roles: ["accessory"], multi: true };

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

  const itemFor = (roles) => itemsList.find((item) => roles.includes(TYPE_ROLE[item.type])) ?? null;
  const accessoryItems = itemsList.filter((item) => TYPE_ROLE[item.type] === "accessory");

  // One piece in the flat-lay. Tappable to pick/swap; empty shows an add prompt.
  function tile(cfg, item, width, height = width) {
    if (!item) {
      return (
        <ButtonBase
          onClick={() => setPicker(cfg)}
          sx={{
            width,
            height,
            borderRadius: 1.5,
            border: "1px dashed",
            borderColor: "rgba(111,75,50,0.35)",
            color: "text.secondary",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
          }}
        >
          <AddIcon fontSize="small" />
          <Typography variant="caption">{cfg.label}</Typography>
        </ButtonBase>
      );
    }
    return (
      <Box sx={{ position: "relative", width, height }}>
        <ButtonBase
          onClick={() => setPicker(cfg)}
          sx={{ width: "100%", height: "100%", borderRadius: 1.5, overflow: "hidden" }}
        >
          <Box
            component="img"
            src={item.imageUrl}
            alt={item.type}
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </ButtonBase>
        <IconButton
          size="small"
          onClick={() => toggleLock(item.type)}
          sx={{ position: "absolute", top: 2, left: 2, p: 0.3, bgcolor: "rgba(255,248,234,0.85)" }}
        >
          {locked.has(item.type) ? (
            <LockIcon sx={{ fontSize: 16 }} color="secondary" />
          ) : (
            <LockOpenIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => removeType(item.type)}
          sx={{ position: "absolute", top: 2, right: 2, p: 0.3, bgcolor: "rgba(255,248,234,0.85)" }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    );
  }

  // Step through the items available for a slot's role(s).
  function cycle(cfg, item, dir) {
    const pool = clothes.filter((c) => cfg.roles.includes(TYPE_ROLE[c.type]));
    if (pool.length === 0) return;
    if (!item) {
      setPick(dir > 0 ? pool[0] : pool[pool.length - 1]);
      return;
    }
    const index = pool.findIndex((c) => c.id === item.id);
    const nextIndex = index < 0 ? 0 : (index + dir + pool.length) % pool.length;
    setPick(pool[nextIndex]);
  }

  // A tile flanked by prev/next arrows to flip through that slot's items.
  function withArrows(cfg, item, width, height = width) {
    const poolEmpty = !clothes.some((c) => cfg.roles.includes(TYPE_ROLE[c.type]));
    return (
      <Stack direction="row" alignItems="center" spacing={0.25}>
        <IconButton size="small" onClick={() => cycle(cfg, item, -1)} disabled={poolEmpty}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        {tile(cfg, item, width, height)}
        <IconButton size="small" onClick={() => cycle(cfg, item, 1)} disabled={poolEmpty}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
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

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {/* The look, slot by slot */}
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Box sx={{ maxWidth: 440, mx: "auto", py: 1 }}>
            {/* Layers */}
            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              sx={{ mb: 1.2, flexWrap: "wrap", rowGap: 1 }}
            >
              {withArrows(OUTER_CFG, itemFor(["outer"]), 96)}
              {withArrows(MID_CFG, itemFor(["mid"]), 96)}
            </Stack>

            {/* Body line: top/dress -> bottom -> shoes */}
            <Stack spacing={1.2} alignItems="center">
              {withArrows(TOP_CFG, itemFor(["base", "onepiece"]), 176, hasOnepiece ? 240 : 176)}
              {!hasOnepiece && withArrows(BOTTOM_CFG, itemFor(["bottom"]), 176)}
              {withArrows(SHOES_CFG, itemFor(["footwear"]), 176, 128)}
            </Stack>

            {/* Accessories */}
            <Stack
              direction="row"
              spacing={1.2}
              justifyContent="center"
              sx={{ mt: 1.2, flexWrap: "wrap", rowGap: 1.2 }}
            >
              {accessoryItems.map((item) => (
                <React.Fragment key={item.id}>{tile(ACC_CFG, item, 96)}</React.Fragment>
              ))}
              {accessoryItems.length < 2 && tile(ACC_CFG, null, 96)}
            </Stack>
          </Box>
        </Box>

        {/* Read-out + save */}
        <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
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
        </Box>
      </Box>

      {/* Picker */}
      <Dialog open={Boolean(picker)} onClose={() => setPicker(null)} fullWidth maxWidth="sm">
        <DialogTitle>{picker ? `Choose ${picker.label.toLowerCase()}` : ""}</DialogTitle>
        <DialogContent dividers>
          {pickerItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items for this slot yet. Add some in your closet.
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                gap: 1.2,
              }}
            >
              {pickerItems.map((item) => {
                const isSelected = selected[item.type] === item.id;
                return (
                  <Card
                    key={item.id}
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
                      sx={{ aspectRatio: "1 / 1", objectFit: "contain" }}
                    />
                    <Typography variant="caption" sx={{ display: "block", textAlign: "center", py: 0.3 }}>
                      {item.color || item.type}
                    </Typography>
                  </Card>
                );
              })}
            </Box>
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
