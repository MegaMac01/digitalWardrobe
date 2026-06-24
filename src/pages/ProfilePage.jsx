import React, { useState } from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useClothes } from "../hooks/useClothes";
import { useOutfits } from "../hooks/useOutfits";
import { useTryOnPhoto } from "../hooks/useTryOnPhoto";
import { prepareTryOnPhoto } from "../utils/resizeImage";
import { getTryOnServerUrl, setTryOnServerUrl } from "../utils/tryOnServer";
import { logClientError } from "../utils/telemetry";

function StatCard({ label, value }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6">{label}</Typography>
        <Typography variant="h4">{value}</Typography>
      </CardContent>
    </Card>
  );
}

function TryOnPhotoCard() {
  const { photoUrl, loading, uploadPhoto, deletePhoto } = useTryOnPhoto();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [serverUrl, setServerUrl] = useState(getTryOnServerUrl());
  const [savedUrl, setSavedUrl] = useState(false);

  function saveServerUrl() {
    setTryOnServerUrl(serverUrl);
    setServerUrl(getTryOnServerUrl());
    setSavedUrl(true);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      await uploadPhoto(await prepareTryOnPhoto(file));
    } catch (err) {
      logClientError(err, { scope: "tryon", action: "upload-photo" });
      setError("Could not save that photo. Try another.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">Your try-on photo</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, mb: 1.5 }}>
          Add one full-body photo to see outfits on you. It's stored privately in your wardrobe and
          only sent to your own try-on server — never to us or any third party.
        </Typography>

        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
            {photoUrl && (
              <Box
                component="img"
                src={photoUrl}
                alt="Your try-on photo"
                sx={{ width: 120, height: 160, objectFit: "cover", borderRadius: 1.5, flexShrink: 0 }}
              />
            )}
            <Stack spacing={1} sx={{ flexGrow: 1 }}>
              <Button
                component="label"
                variant={photoUrl ? "outlined" : "contained"}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon />}
                disabled={busy}
                sx={{ alignSelf: "flex-start" }}
              >
                {busy ? "Preparing…" : photoUrl ? "Replace photo" : "Add full-body photo"}
                <input type="file" hidden accept="image/*" onChange={handleFile} />
              </Button>
              {busy && (
                <Typography variant="caption" color="text.secondary">
                  Removing the background — this can take a few seconds.
                </Typography>
              )}
              {photoUrl && (
                <Button
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={busy}
                  onClick={() => deletePhoto()}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Remove
                </Button>
              )}
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </Stack>
        )}

        <Stack spacing={0.8} sx={{ mt: 2.5 }}>
          <Typography variant="subtitle2">Try-on server</Typography>
          <Typography variant="caption" color="text.secondary">
            Where your CatVTON server is reachable. Running locally: leave as
            http://localhost:7860. On the live site: paste your public tunnel URL (see
            tryon-server/README.md). Saved in this browser only.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 0.5 }}>
            <TextField
              size="small"
              fullWidth
              label="Server URL"
              placeholder="https://your-name.ngrok-free.app"
              value={serverUrl}
              onChange={(event) => {
                setServerUrl(event.target.value);
                setSavedUrl(false);
              }}
            />
            <Button variant="outlined" onClick={saveServerUrl} sx={{ flexShrink: 0 }}>
              {savedUrl ? "Saved ✓" : "Save"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { clothes } = useClothes();
  const { outfits } = useOutfits();

  const favorites = clothes.filter((item) => item.favorite).length;
  const scheduled = outfits.filter((o) => (o.scheduledDates || []).length > 0).length;

  return (
    <>
      <Typography variant="h3" sx={{ mb: 2.2 }}>
        Profile
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">Signed in as</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email ?? "Unknown user"}
              </Typography>
            </Box>
            <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
              Sign out
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <TryOnPhotoCard />

      <Grid container spacing={1.8}>
        <Grid item xs={6} md={3}>
          <StatCard label="Pieces" value={clothes.length} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Favorites" value={favorites} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Saved outfits" value={outfits.length} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Scheduled" value={scheduled} />
        </Grid>
      </Grid>
    </>
  );
}
