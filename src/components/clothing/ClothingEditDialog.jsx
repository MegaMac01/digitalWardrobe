import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { FORMALITY_OPTIONS, SEASON_OPTIONS, TYPE_ORDER, VIBE_OPTIONS } from "../../utils/outfitEngine";
import { sanitizeText } from "../../utils/validation";

function fromItem(item) {
  return {
    type: item?.type ?? "Shirt",
    color: item?.color ?? "",
    brand: item?.brand ?? "",
    seasonTags: item?.seasonTags?.length ? item.seasonTags : ["Any"],
    vibes: item?.vibes?.length ? item.vibes : [],
    warmth: item?.warmth ?? 3,
    formality: item?.formality ?? 3,
    isRainFriendly: Boolean(item?.isRainFriendly),
    favorite: Boolean(item?.favorite),
    notes: item?.notes ?? "",
  };
}

export default function ClothingEditDialog({ open, item, onClose, onSave }) {
  const [form, setForm] = useState(fromItem(item));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setForm(fromItem(item));
  }, [item]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  function handleSave() {
    setSaving(true);
    Promise.resolve(
      onSave(item.id, {
        type: form.type,
        color: sanitizeText(form.color, 40),
        brand: sanitizeText(form.brand, 40),
        seasonTags: form.seasonTags,
        vibes: form.vibes,
        warmth: Number(form.warmth),
        formality: Number(form.formality),
        isRainFriendly: form.isRainFriendly,
        favorite: form.favorite,
        notes: sanitizeText(form.notes, 280),
      })
    ).finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit item</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.6} sx={{ mt: 0.5 }}>
          <TextField
            select
            label="Type"
            value={form.type}
            onChange={(event) => update({ type: event.target.value })}
          >
            {TYPE_ORDER.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Color"
            placeholder="Tan, navy, olive..."
            value={form.color}
            onChange={(event) => update({ color: event.target.value })}
          />
          <TextField
            label="Brand"
            placeholder="Levi's, Nike, Uniqlo..."
            value={form.brand}
            onChange={(event) => update({ brand: event.target.value })}
          />
          <TextField
            select
            SelectProps={{ multiple: true }}
            label="Seasons"
            value={form.seasonTags}
            onChange={(event) =>
              update({
                seasonTags:
                  typeof event.target.value === "string"
                    ? event.target.value.split(",")
                    : event.target.value,
              })
            }
          >
            {SEASON_OPTIONS.map((season) => (
              <MenuItem key={season} value={season}>
                {season}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            SelectProps={{ multiple: true }}
            label="Vibes"
            value={form.vibes}
            onChange={(event) =>
              update({
                vibes:
                  typeof event.target.value === "string"
                    ? event.target.value.split(",")
                    : event.target.value,
              })
            }
          >
            {VIBE_OPTIONS.map((vibe) => (
              <MenuItem key={vibe} value={vibe}>
                {vibe}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Warmth"
            value={String(form.warmth)}
            onChange={(event) => update({ warmth: Number(event.target.value) })}
          >
            <MenuItem value="1">1 - Breezy</MenuItem>
            <MenuItem value="2">2 - Light</MenuItem>
            <MenuItem value="3">3 - Mid</MenuItem>
            <MenuItem value="4">4 - Warm</MenuItem>
            <MenuItem value="5">5 - Heavy</MenuItem>
          </TextField>
          <TextField
            select
            label="Dressiness"
            value={String(form.formality)}
            onChange={(event) => update({ formality: Number(event.target.value) })}
          >
            {FORMALITY_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={String(option.value)}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Notes"
            multiline
            minRows={2}
            value={form.notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isRainFriendly}
                  onChange={(event) => update({ isRainFriendly: event.target.checked })}
                />
              }
              label="Rain-friendly"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.favorite}
                  onChange={(event) => update({ favorite: event.target.checked })}
                />
              }
              label="Favorite"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
