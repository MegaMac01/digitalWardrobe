import React, { useEffect, useState } from "react";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useClothes } from "../../hooks/useClothes";
import { SEASON_OPTIONS, TYPE_ORDER, VIBE_OPTIONS } from "../../utils/outfitEngine";
import { logClientError } from "../../utils/telemetry";
import { sanitizeText, validateImageFile } from "../../utils/validation";

function makeEmptyForm() {
  return {
    type: "Shirt",
    color: "",
    notes: "",
    vibes: ["Classic"],
    seasonTags: ["Any"],
    warmth: 3,
    isRainFriendly: false,
    favorite: false,
  };
}

export default function ClothingUploader() {
  const [form, setForm] = useState(makeEmptyForm);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { addClothing } = useClothes();

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return () => {};
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleSubmit(event) {
    event.preventDefault();
    const fileError = validateImageFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    if (!form.type) {
      setError("Pick a clothing type.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await addClothing({
        file,
        ...form,
        color: sanitizeText(form.color, 40),
        notes: sanitizeText(form.notes, 280),
      });
      setFile(null);
      setForm(makeEmptyForm());
    } catch (uploadError) {
      logClientError(uploadError, { scope: "clothes", action: "upload-item" });
      setError("Upload failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card sx={{ mb: 3.5 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Add To Wardrobe
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.2 }}>
          Tag your pieces once so outfits can be suggested by weather and vibe.
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1.3fr" }, gap: 2 }}
        >
          <Stack spacing={1.3}>
            <Button component="label" variant="contained" startIcon={<UploadFileIcon />}>
              {file ? "Change Image" : "Upload Image"}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            {file && (
              <Typography variant="caption" color="text.secondary">
                {file.name}
              </Typography>
            )}
            {previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                alt="Preview"
                loading="lazy"
                decoding="async"
                sx={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 2 }}
              />
            )}
          </Stack>

          <Stack spacing={1.2}>
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
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
              onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
            />
            <TextField
              select
              SelectProps={{ multiple: true }}
              label="Seasons"
              value={form.seasonTags}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  seasonTags:
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : event.target.value,
                }))
              }
              helperText="Pick where this piece works best."
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
                setForm((prev) => ({
                  ...prev,
                  vibes:
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : event.target.value,
                }))
              }
            >
              {VIBE_OPTIONS.map((vibe) => (
                <MenuItem key={vibe} value={vibe}>
                  {vibe}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 0.8 }}>
              {form.vibes.map((vibe) => (
                <Chip key={vibe} label={vibe} size="small" color="secondary" />
              ))}
            </Stack>
            <TextField
              select
              label="Warmth Level"
              value={String(form.warmth)}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, warmth: Number(event.target.value) }))
              }
            >
              <MenuItem value="1">1 - Breezy</MenuItem>
              <MenuItem value="2">2 - Light</MenuItem>
              <MenuItem value="3">3 - Mid</MenuItem>
              <MenuItem value="4">4 - Warm</MenuItem>
              <MenuItem value="5">5 - Heavy</MenuItem>
            </TextField>
            <TextField
              label="Notes"
              multiline
              minRows={2}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isRainFriendly}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isRainFriendly: event.target.checked }))
                    }
                  />
                }
                label="Rain-friendly"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.favorite}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, favorite: event.target.checked }))
                    }
                  />
                }
                label="Favorite"
              />
            </Stack>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={22} /> : "Save Clothing Item"}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
