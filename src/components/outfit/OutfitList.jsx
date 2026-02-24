import React, { useMemo, useState } from "react";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
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
import OutfitCard from "./OutfitCard";

function buildSuggestionCardData(suggestion, weather) {
  return {
    ...suggestion,
    id: "suggestion",
    name: buildOutfitName(suggestion.vibe, weather),
    itemIdsByType: suggestion.itemIdsByType,
    weatherSnapshot: weather ?? null,
    notes: "Generated from current vibe and weather.",
  };
}

export default function OutfitList() {
  const { clothes, loading: loadingClothes } = useClothes();
  const { outfits, loading: loadingOutfits, addOutfit, deleteOutfit } = useOutfits();
  const { weather, loading: loadingWeather, error: weatherError, refresh } = useWeather();

  const [vibe, setVibe] = useState("Any");
  const [suggestion, setSuggestion] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const clothesById = useMemo(() => {
    const map = {};
    clothes.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [clothes]);

  function generateSuggestion() {
    const next = buildSuggestedOutfit(clothes, { vibe, weather });
    setSuggestion(next);
    if (next.missingRequired.length > 0) {
      setToast({
        open: true,
        message: `Add ${next.missingRequired.join(", ")} to get full outfit suggestions.`,
        severity: "warning",
      });
    }
  }

  async function saveSuggestion() {
    if (!suggestion) return;
    if (suggestion.missingRequired.length > 0) {
      setToast({
        open: true,
        message: "Need shirt, pants, and shoes before saving.",
        severity: "warning",
      });
      return;
    }

    try {
      await addOutfit({
        name: buildOutfitName(vibe, weather),
        notes: "Auto-generated outfit.",
        vibe,
        itemIdsByType: suggestion.itemIdsByType,
        weatherSnapshot: weather ?? null,
        source: "auto",
      });
      setToast({ open: true, message: "Suggested outfit saved.", severity: "success" });
    } catch {
      setToast({ open: true, message: "Could not save suggestion.", severity: "error" });
    }
  }

  if (loadingClothes || loadingOutfits) {
    return <Loader label="Loading outfits..." />;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Outfits On The Go
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.2 }}>
        Generate a ready-to-wear look based on your vibe and current weather.
      </Typography>

      <Card sx={{ mb: 2.6 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              select
              label="Vibe"
              size="small"
              value={vibe}
              onChange={(event) => setVibe(event.target.value)}
              sx={{ minWidth: 180 }}
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
              startIcon={<AutoFixHighIcon />}
              onClick={generateSuggestion}
              disabled={clothes.length === 0}
            >
              Generate Outfit
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refresh}
              disabled={loadingWeather}
            >
              Refresh Weather
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {weather
                ? `${Math.round(weather.temperature)}F | ${weather.label} | Wind ${Math.round(
                    weather.windSpeed
                  )} mph`
                : "Weather unavailable"}
            </Typography>
          </Stack>
          {weatherError && (
            <Alert severity="warning" sx={{ mt: 1.2 }}>
              {weatherError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {suggestion && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 1.2 }}>
            Fresh Suggestion
          </Typography>
          <Grid container spacing={1.8}>
            <Grid item xs={12} md={8}>
              <OutfitCard
                outfit={buildSuggestionCardData(suggestion, weather)}
                clothesById={clothesById}
                showSaveAction
                onSaveSuggestion={saveSuggestion}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: 2, height: "100%" }}>
                <Typography variant="h6">Why this works</Typography>
                <Box component="ul" sx={{ mb: 0, pl: 2.5 }}>
                  <li>
                    <Typography variant="body2">Vibe set to {vibe}.</Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      Weather-aware picks for {weather ? `${Math.round(weather.temperature)}F` : "any"}
                      .
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2">
                      Required pieces covered: {TYPE_ORDER.slice(0, 3).join(", ")}.
                    </Typography>
                  </li>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      <Typography variant="h5" sx={{ mb: 1.2 }}>
        Saved Outfits
      </Typography>
      {outfits.length === 0 ? (
        <Alert severity="info">No saved outfits yet. Generate one and save it.</Alert>
      ) : (
        <Grid container spacing={1.8}>
          {outfits.map((outfit) => (
            <Grid item key={outfit.id} xs={12} sm={6} lg={4}>
              <OutfitCard
                outfit={outfit}
                clothesById={clothesById}
                onDelete={async (id) => {
                  await deleteOutfit(id);
                  setToast({ open: true, message: "Outfit deleted.", severity: "success" });
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
