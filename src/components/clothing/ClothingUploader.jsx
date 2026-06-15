import React, { useEffect, useState } from "react";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import { FORMALITY_OPTIONS, SEASON_OPTIONS, TYPE_ORDER, VIBE_OPTIONS } from "../../utils/outfitEngine";
import { analyzeGarment } from "../../utils/aiStylist";
import { logClientError } from "../../utils/telemetry";
import { sanitizeText, validateImageFile } from "../../utils/validation";

// Downscale to a small JPEG and return base64 for the vision auto-tagger.
async function toAnalyzePayload(file) {
  const small = await resizeToFile(file, {
    name: "analyze.jpg",
    maxDimension: 512,
    mimeType: "image/jpeg",
    quality: 0.8,
  });
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(small);
  });
  return { base64: String(dataUrl).split(",")[1], mediaType: "image/jpeg" };
}

// Resize an image blob via canvas. Keeps transparency when mimeType is image/png.
function resizeToFile(blob, { name, maxDimension = 800, mimeType = "image/jpeg", quality = 0.82 }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxDimension / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (out) => resolve(new File([out], name, { type: mimeType })),
        mimeType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

// Produce the upload-ready file. With removeBg, the clothing is cut out of its
// background (transparent PNG) using an in-browser model loaded on demand.
async function processImage(file, { removeBg }) {
  if (removeBg) {
    const { removeBackground } = await import("@imgly/background-removal");
    const cutout = await removeBackground(file);
    return resizeToFile(cutout, {
      name: file.name.replace(/\.[^.]+$/, ".png"),
      mimeType: "image/png",
    });
  }
  return resizeToFile(file, {
    name: file.name.replace(/\.[^.]+$/, ".jpg"),
    mimeType: "image/jpeg",
  });
}

function makeEmptyForm() {
  return {
    type: "Shirt",
    color: "",
    notes: "",
    vibes: ["Classic"],
    seasonTags: ["Any"],
    warmth: 3,
    formality: 3,
    isRainFriendly: false,
    favorite: false,
  };
}

export default function ClothingUploader({ onAdded }) {
  const [form, setForm] = useState(makeEmptyForm);
  const [rawFile, setRawFile] = useState(null);
  const [processedFile, setProcessedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeBg, setRemoveBg] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiTagged, setAiTagged] = useState(false);
  const { addClothing } = useClothes();

  // Prepare the image (cut out background + resize) whenever the file or the
  // remove-background toggle changes, so the preview shows the final result.
  useEffect(() => {
    if (!rawFile) {
      setProcessedFile(null);
      setPreviewUrl("");
      return () => {};
    }

    let cancelled = false;
    let objectUrl;
    setProcessing(true);
    setNotice("");

    (async () => {
      let outFile;
      try {
        outFile = await processImage(rawFile, { removeBg });
      } catch (err) {
        logClientError(err, { scope: "clothes", action: "process-image" });
        // Fall back to the original (resized) image so upload still works.
        try {
          outFile = await processImage(rawFile, { removeBg: false });
        } catch {
          outFile = rawFile;
        }
        if (!cancelled && removeBg) {
          setNotice("Couldn't remove the background. Using the original image.");
        }
      }
      if (cancelled) return;
      objectUrl = URL.createObjectURL(outFile);
      setProcessedFile(outFile);
      setPreviewUrl(objectUrl);
      setProcessing(false);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rawFile, removeBg]);

  // Auto-tag the item from its photo. Pre-fills type/color/seasons/vibes/warmth
  // so the user rarely has to touch the details. Silently no-ops if the AI
  // function isn't deployed (analyzeGarment returns null).
  useEffect(() => {
    if (!rawFile) {
      setAiTagged(false);
      return () => {};
    }

    let cancelled = false;
    setAnalyzing(true);
    setAiTagged(false);

    (async () => {
      try {
        const { base64, mediaType } = await toAnalyzePayload(rawFile);
        const tags = await analyzeGarment(base64, mediaType);
        if (cancelled || !tags) return;
        setForm((prev) => ({
          ...prev,
          type: tags.type || prev.type,
          color: tags.color ?? prev.color,
          seasonTags:
            Array.isArray(tags.seasonTags) && tags.seasonTags.length
              ? tags.seasonTags
              : prev.seasonTags,
          vibes: Array.isArray(tags.vibes) && tags.vibes.length ? tags.vibes : prev.vibes,
          warmth: tags.warmth || prev.warmth,
          formality: tags.formality || prev.formality,
          isRainFriendly:
            typeof tags.isRainFriendly === "boolean" ? tags.isRainFriendly : prev.isRainFriendly,
        }));
        setAiTagged(true);
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawFile]);

  async function handleSubmit(event) {
    event.preventDefault();
    const fileError = validateImageFile(rawFile);
    if (fileError) {
      setError(fileError);
      return;
    }
    if (processing || !processedFile) {
      setError("Still preparing the image. Try again in a moment.");
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
        file: processedFile,
        ...form,
        color: sanitizeText(form.color, 40),
        notes: sanitizeText(form.notes, 280),
      });
      setRawFile(null);
      setProcessedFile(null);
      setForm(makeEmptyForm());
      onAdded?.();
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
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1.3fr" }, gap: 2 }}
        >
          <Stack spacing={1.3}>
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                component="label"
                variant="contained"
                startIcon={<PhotoCameraIcon />}
              >
                Take Photo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => setRawFile(event.target.files?.[0] ?? null)}
                />
              </Button>
              <Button
                fullWidth
                component="label"
                variant="outlined"
                startIcon={<UploadFileIcon />}
              >
                {rawFile ? "Change" : "Upload"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(event) => setRawFile(event.target.files?.[0] ?? null)}
                />
              </Button>
            </Stack>
            <FormControlLabel
              control={
                <Switch checked={removeBg} onChange={(event) => setRemoveBg(event.target.checked)} />
              }
              label="Cut out background"
            />
            {rawFile && (
              <Typography variant="caption" color="text.secondary">
                {rawFile.name}
              </Typography>
            )}
            {(previewUrl || processing) && (
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  minHeight: 200,
                  borderRadius: 2,
                  overflow: "hidden",
                  // Checkerboard so a transparent cutout is obvious.
                  backgroundColor: "#efe7d6",
                  backgroundImage:
                    "linear-gradient(45deg, rgba(111,75,50,0.12) 25%, transparent 25%), linear-gradient(-45deg, rgba(111,75,50,0.12) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(111,75,50,0.12) 75%), linear-gradient(-45deg, transparent 75%, rgba(111,75,50,0.12) 75%)",
                  backgroundSize: "18px 18px",
                  backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {previewUrl && (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Preview"
                    decoding="async"
                    sx={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block" }}
                  />
                )}
                {processing && (
                  <Stack
                    spacing={1}
                    alignItems="center"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      bgcolor: "rgba(255,248,234,0.7)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <CircularProgress size={26} />
                    <Typography variant="caption" color="text.secondary">
                      {removeBg ? "Removing background…" : "Preparing image…"}
                    </Typography>
                  </Stack>
                )}
              </Box>
            )}
            {notice && <Alert severity="info">{notice}</Alert>}
          </Stack>

          <Stack spacing={1.2}>
            {analyzing && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Tagging this item with AI…
                </Typography>
              </Stack>
            )}
            {!analyzing && aiTagged && (
              <Chip
                size="small"
                color="secondary"
                icon={<AutoAwesomeIcon />}
                label="Tagged by AI — open details to adjust"
                sx={{ alignSelf: "flex-start" }}
              />
            )}
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

            <Accordion
              disableGutters
              elevation={0}
              sx={{ bgcolor: "transparent", "&:before": { display: "none" } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                <Typography variant="body2">Add details (optional)</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0 }}>
                <Stack spacing={1.2}>
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
                  <TextField
                    select
                    label="Warmth"
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
                    select
                    label="Dressiness"
                    value={String(form.formality)}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, formality: Number(event.target.value) }))
                    }
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
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Button type="submit" variant="contained" disabled={submitting || processing || analyzing}>
              {submitting ? <CircularProgress size={22} /> : "Save item"}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
