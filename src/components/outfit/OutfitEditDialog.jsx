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
import { TYPE_ORDER, TYPE_ROLE, orderItems, outfitItemIds } from "../../utils/outfitEngine";
import { sanitizeText, validateOutfitName } from "../../utils/validation";

const MAX_ACCESSORIES = 3;
const STRUCTURAL_TYPES = TYPE_ORDER.filter((type) => TYPE_ROLE[type] !== "accessory");

function itemLabel(item) {
  const color = item.color ? item.color : "Item";
  const note = item.notes ? ` · ${item.notes.slice(0, 24)}` : "";
  return `${color}${note}`;
}

export default function OutfitEditDialog({ open, outfit, clothes, onClose, onSave }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [structural, setStructural] = useState({}); // structural type -> id ("" = none)
  const [accessoryIds, setAccessoryIds] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const groupedByType = useMemo(() => {
    return TYPE_ORDER.reduce((acc, type) => {
      acc[type] = clothes.filter((item) => item.type === type);
      return acc;
    }, {});
  }, [clothes]);

  const accessoryOptions = useMemo(
    () => clothes.filter((item) => TYPE_ROLE[item.type] === "accessory"),
    [clothes]
  );

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
    const struct = {};
    const accs = [];
    outfitItemIds(outfit)
      .map((id) => clothesById[id])
      .filter(Boolean)
      .forEach((item) => {
        if (TYPE_ROLE[item.type] === "accessory") accs.push(item.id);
        else if (!struct[item.type]) struct[item.type] = item.id;
      });
    setStructural(struct);
    setAccessoryIds(accs.slice(0, MAX_ACCESSORIES));
    setError("");
  }, [outfit, clothesById]);

  function handleSave() {
    const nameError = validateOutfitName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const chosenIds = [
      ...STRUCTURAL_TYPES.map((type) => structural[type]).filter(Boolean),
      ...accessoryIds,
    ];

    if (chosenIds.length === 0) {
      setError("Pick at least one item.");
      return;
    }

    const itemIds = orderItems(chosenIds.map((id) => clothesById[id]).filter(Boolean)).map(
      (item) => item.id
    );

    setSaving(true);
    Promise.resolve(
      onSave(outfit.id, {
        name: sanitizeText(name, 60),
        notes: sanitizeText(notes, 240),
        itemIds,
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
            {STRUCTURAL_TYPES.map((type) => {
              const options = groupedByType[type] ?? [];
              const chosen = structural[type] ? clothesById[structural[type]] : null;
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
                      value={structural[type] ?? ""}
                      onChange={(event) =>
                        setStructural((prev) => ({ ...prev, [type]: event.target.value }))
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

            <Grid item xs={12}>
              <TextField
                select
                SelectProps={{ multiple: true }}
                label={`Accessories (up to ${MAX_ACCESSORIES})`}
                size="small"
                value={accessoryIds}
                onChange={(event) => {
                  const value =
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : event.target.value;
                  setAccessoryIds(value.slice(0, MAX_ACCESSORIES));
                }}
                fullWidth
                disabled={accessoryOptions.length === 0}
                helperText={
                  accessoryOptions.length === 0 ? "No accessories in wardrobe" : undefined
                }
              >
                {accessoryOptions.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.type} · {itemLabel(item)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
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
