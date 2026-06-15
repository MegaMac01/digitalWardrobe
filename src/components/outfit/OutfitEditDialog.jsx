import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { TYPE_ORDER } from "../../utils/outfitEngine";
import { sanitizeText, validateOutfitName } from "../../utils/validation";

function itemLabel(item) {
  const color = item.color ? item.color : "Item";
  const note = item.notes ? ` · ${item.notes.slice(0, 24)}` : "";
  return `${color}${note}`;
}

export default function OutfitEditDialog({ open, outfit, clothes, onClose, onSave }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const groupedByType = useMemo(() => {
    return TYPE_ORDER.reduce((acc, type) => {
      acc[type] = clothes.filter((item) => item.type === type);
      return acc;
    }, {});
  }, [clothes]);

  const clothesById = useMemo(() => {
    const map = {};
    clothes.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [clothes]);

  // Load the outfit's current values when the dialog opens for a new outfit.
  useEffect(() => {
    if (!outfit) return;
    setName(outfit.name ?? "");
    setNotes(outfit.notes ?? "");
    const items = outfit.itemIdsByType || {};
    setSelected(
      TYPE_ORDER.reduce((acc, type) => {
        acc[type] = items[type] ?? "";
        return acc;
      }, {})
    );
    setError("");
  }, [outfit]);

  function handleSave() {
    const nameError = validateOutfitName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const itemIdsByType = TYPE_ORDER.reduce((acc, type) => {
      acc[type] = selected[type] || null;
      return acc;
    }, {});

    if (!TYPE_ORDER.some((type) => itemIdsByType[type])) {
      setError("Pick at least one item.");
      return;
    }

    const previewOrder = (outfit.previewOrder?.length ? outfit.previewOrder : TYPE_ORDER).filter(
      (type) => itemIdsByType[type]
    );

    setSaving(true);
    Promise.resolve(
      onSave(outfit.id, {
        name: sanitizeText(name, 60),
        notes: sanitizeText(notes, 240),
        itemIdsByType,
        previewOrder,
      })
    ).finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit outfit</DialogTitle>
      <DialogContent>
        <Stack spacing={1.6} sx={{ mt: 0.5 }}>
          <TextField
            label="Outfit name"
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
            multiline
            minRows={2}
          />

          <Grid container spacing={1.2}>
            {TYPE_ORDER.map((type) => {
              const options = groupedByType[type] ?? [];
              const chosen = selected[type] ? clothesById[selected[type]] : null;
              return (
                <Grid item xs={12} sm={6} key={type}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {chosen ? (
                      <CardMedia
                        component="img"
                        image={chosen.imageUrl}
                        alt={type}
                        sx={{ width: 44, height: 44, borderRadius: 1, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 1,
                          border: "1px dashed rgba(111,75,50,0.3)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <TextField
                      select
                      label={type}
                      size="small"
                      value={selected[type] ?? ""}
                      onChange={(event) =>
                        setSelected((prev) => ({ ...prev, [type]: event.target.value }))
                      }
                      fullWidth
                      disabled={options.length === 0}
                      helperText={options.length === 0 ? "None in wardrobe" : undefined}
                    >
                      <MenuItem value="">None</MenuItem>
                      {options.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {itemLabel(item)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
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
