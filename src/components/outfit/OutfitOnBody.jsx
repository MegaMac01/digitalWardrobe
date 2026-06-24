import React, { useEffect, useState } from "react";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import OutfitFigure from "./OutfitFigure";
import { useAuth } from "../../hooks/useAuth";
import { useTryOnPhoto } from "../../hooks/useTryOnPhoto";
import { generateTryOn, getCachedTryOn } from "../../utils/tryOn";
import { prepareTryOnPhoto } from "../../utils/resizeImage";
import { logClientError } from "../../utils/telemetry";

// The default inline view of an outfit "on a person", used by Today, Builder,
// and the Planner card. Shows a cached photoreal try-on when one exists,
// otherwise the stylized figure — both are "on a body". Generation is on demand
// (it costs ~30-90s on the local GPU server), so we never auto-generate.
export default function OutfitOnBody({ items = [], compact = false }) {
  const { user } = useAuth();
  const { photoUrl, loading: photoLoading, uploadPhoto } = useTryOnPhoto();

  const [resultUrl, setResultUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const itemKey = items.map((item) => item.id).join(",");
  const hasItems = items.length > 0;

  // Auto-load a cached photoreal result for this person + outfit (free, instant).
  useEffect(() => {
    setResultUrl(null);
    setError("");
    if (!photoUrl || !user || !hasItems) return undefined;
    let cancelled = false;
    getCachedTryOn(user.uid, photoUrl, items).then((url) => {
      if (!cancelled && url) setResultUrl(url);
    });
    return () => {
      cancelled = true;
    };
    // items is rebuilt each render; itemKey captures its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, user, itemKey]);

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      await uploadPhoto(await prepareTryOnPhoto(file));
    } catch (err) {
      logClientError(err, { scope: "tryon", action: "upload-photo-inline" });
      setError("Could not save that photo. Try another.");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate({ force } = {}) {
    if (!photoUrl || !user) return;
    setError("");
    setGenerating(true);
    setProgress("Starting…");
    try {
      if (!force) {
        const cached = await getCachedTryOn(user.uid, photoUrl, items);
        if (cached) {
          setResultUrl(cached);
          return;
        }
      }
      const url = await generateTryOn(photoUrl, items, {
        uid: user.uid,
        onProgress: (text) => setProgress(text),
      });
      setResultUrl(url);
    } catch (err) {
      logClientError(err, { scope: "tryon", action: "generate" });
      setError(err.message || "Try-on failed. Check your server and retry.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Stack spacing={1} alignItems="center" sx={{ width: "100%" }}>
      <OutfitFigure items={items} tryOnImageUrl={resultUrl} height={compact ? 320 : 460} />

      {hasItems && (
        <Stack spacing={0.8} alignItems="center" sx={{ width: "100%" }}>
          {generating ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                {progress || "Generating…"} (runs on your GPU, ~a minute)
              </Typography>
            </Stack>
          ) : photoLoading ? null : !photoUrl ? (
            <>
              <Button
                component="label"
                size="small"
                variant={compact ? "text" : "outlined"}
                startIcon={
                  uploading ? <CircularProgress size={14} color="inherit" /> : <PhotoCameraIcon />
                }
                disabled={uploading}
              >
                {uploading ? "Preparing…" : "Upload your photo to see it on you"}
                <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
              </Button>
              {!compact && (
                <Typography variant="caption" color="text.secondary">
                  Stored privately; sent only to your own try-on server.
                </Typography>
              )}
            </>
          ) : (
            <Button
              size="small"
              variant={resultUrl ? "text" : "outlined"}
              startIcon={<AutoFixHighIcon />}
              onClick={() => handleGenerate({ force: Boolean(resultUrl) })}
            >
              {resultUrl ? "Regenerate" : "Generate photoreal"}
            </Button>
          )}
          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}
        </Stack>
      )}
    </Stack>
  );
}
