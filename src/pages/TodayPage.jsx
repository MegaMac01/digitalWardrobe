import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import TodayIcon from "@mui/icons-material/Today";
import TuneIcon from "@mui/icons-material/Tune";
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
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useClothes } from "../hooks/useClothes";
import { useOutfits } from "../hooks/useOutfits";
import { useWeather } from "../hooks/useWeather";
import { suggestOutfit } from "../utils/aiStylist";
import { OCCASION_PRESETS, VIBE_OPTIONS, buildOutfitName } from "../utils/outfitEngine";
import { getGreeting, getTimeOfDay, formatTemp, toISODate } from "../utils/helpers";
import { sanitizeText } from "../utils/validation";
import Loader from "../components/layout/Loader";
import Toast from "../components/layout/Toast";
import WeatherIcon from "../components/layout/WeatherIcon";
import OutfitPreview from "../components/outfit/OutfitPreview";

export default function TodayPage() {
  const navigate = useNavigate();
  const { clothes, loading: loadingClothes } = useClothes();
  const { addOutfit } = useOutfits();
  const { weather, loading: loadingWeather, error: weatherError } = useWeather();

  const [occasion, setOccasion] = useState("");
  const [vibe, setVibe] = useState("Any");
  const [notes, setNotes] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionSource, setSuggestionSource] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const resultRef = useRef(null);

  const clothesById = React.useMemo(() => {
    const map = {};
    clothes.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [clothes]);

  // Bring the generated look into view (helpful on mobile where it's below the fold).
  useEffect(() => {
    if (suggestion && !generating) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [suggestion, generating]);

  async function generate(nextOccasion) {
    const occ = nextOccasion ?? occasion;
    setOccasion(occ);
    setGenerating(true);
    try {
      const { suggestion: next, source } = await suggestOutfit(clothes, {
        vibe,
        weather,
        occasion: sanitizeText(occ, 80),
        timeOfDay: getTimeOfDay(),
        notes: sanitizeText(notes, 240),
      });
      setSuggestion(next);
      setSuggestionSource(source);

      if (next.missingRequired.length > 0) {
        setToast({
          open: true,
          message: `Add ${next.missingRequired.join(", ")} to fill out the look.`,
          severity: "warning",
        });
      } else if (source === "rules") {
        setToast({
          open: true,
          message: "AI stylist unavailable. Used the built-in engine.",
          severity: "info",
        });
      }
    } finally {
      setGenerating(false);
    }
  }

  async function saveOutfit({ wearToday } = {}) {
    if (!suggestion) return;
    if (suggestion.missingRequired.length > 0) {
      setToast({ open: true, message: "Need a top, bottom, and shoes first.", severity: "warning" });
      return;
    }
    try {
      await addOutfit({
        name: suggestion.name || buildOutfitName(vibe, weather),
        notes: occasion ? `For: ${occasion}` : "Today's pick.",
        vibe,
        itemIdsByType: suggestion.itemIdsByType,
        previewOrder: suggestion.previewOrder,
        weatherSnapshot: weather ?? null,
        source: suggestionSource === "ai" ? "ai" : "auto",
        ...(wearToday ? { scheduledDates: [toISODate(new Date())] } : {}),
      });
      setToast({
        open: true,
        message: wearToday ? "Saved and added to today's plan." : "Outfit saved.",
        severity: "success",
      });
    } catch {
      setToast({ open: true, message: "Could not save the outfit.", severity: "error" });
    }
  }

  if (loadingClothes) {
    return <Loader label="Opening your closet..." />;
  }

  if (clothes.length === 0) {
    const steps = [
      "Add a few clothes: a top, bottom, and shoes for a full look.",
      "Tell me where you're headed (Beach, Work, Gym…).",
      "Get an outfit picked for today's weather. Save it or wear it.",
    ];
    return (
      <Card sx={{ maxWidth: 560, mx: "auto", mt: { xs: 1, md: 3 } }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h4" sx={{ mb: 2.5 }}>
            Welcome
          </Typography>
          <Stack spacing={1.8} sx={{ mb: 3 }}>
            {steps.map((step, index) => (
              <Stack key={step} direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: "secondary.main",
                    color: "secondary.contrastText",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography variant="body1" sx={{ pt: 0.3 }}>
                  {step}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<AutoFixHighIcon />}
            onClick={() => navigate("/closet")}
          >
            Add my first clothes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Weather hero */}
      <Card sx={{ mb: 2.4 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <WeatherIcon weather={weather} sx={{ fontSize: 46, color: "secondary.main" }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5">{getGreeting()}</Typography>
              {loadingWeather && !weather ? (
                <Skeleton width={180} />
              ) : weather ? (
                <Typography variant="body1" color="text.secondary">
                  {formatTemp(weather.temperature)} · {weather.label}
                  {weather.isWindy ? " · breezy" : ""}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Weather unavailable. Suggestions will go by occasion and vibe.
                </Typography>
              )}
            </Box>
          </Stack>
          {weatherError && (
            <Alert severity="info" sx={{ mt: 1.4 }}>
              {weatherError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* One-tap occasion picker */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        Where are you headed today?
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 1.6 }}>
        {OCCASION_PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={preset}
            color={occasion === preset ? "secondary" : "default"}
            variant={occasion === preset ? "filled" : "outlined"}
            onClick={() => generate(preset)}
            disabled={generating}
            sx={{ fontSize: 15, py: 2, px: 0.5 }}
          />
        ))}
      </Stack>

      {/* Fine-tune (optional) */}
      <Accordion
        disableGutters
        elevation={0}
        sx={{ mb: 2.4, bgcolor: "transparent", "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TuneIcon fontSize="small" />
            <Typography variant="body2">Fine-tune (optional)</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0 }}>
          <Grid container spacing={1.2}>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Vibe"
                value={vibe}
                onChange={(event) => setVibe(event.target.value)}
              >
                <MenuItem value="Any">Any</MenuItem>
                {VIBE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                size="small"
                label="Anything specific?"
                placeholder="Somewhere fancy, lots of walking, it's cold inside..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Grid>
          </Grid>
          <Button
            sx={{ mt: 1.4 }}
            variant="outlined"
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
            onClick={() => generate(occasion || "everyday")}
            disabled={generating}
          >
            {generating ? "Styling..." : "Style me"}
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Result */}
      {generating && !suggestion && (
        <Stack alignItems="center" sx={{ py: 5 }} spacing={1.5}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Putting a look together...
          </Typography>
        </Stack>
      )}

      {suggestion && (
        <Box
          ref={resultRef}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            alignItems: "flex-start",
            scrollMarginTop: 16,
          }}
        >
          <Card sx={{ flex: 1, minWidth: 0, width: "100%", p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {suggestion.name || buildOutfitName(vibe, weather)}
            </Typography>
            <OutfitPreview itemIdsByType={suggestion.itemIdsByType} clothesById={clothesById} />
          </Card>

          <Card sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0, p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Why this works
              </Typography>
              <Chip
                size="small"
                label={suggestionSource === "ai" ? "AI stylist" : "Built-in"}
                color={suggestionSource === "ai" ? "secondary" : "default"}
                variant={suggestionSource === "ai" ? "filled" : "outlined"}
              />
            </Stack>
            <Box component="ul" sx={{ mb: 1.5, pl: 2.5 }}>
              {occasion && (
                <li>
                  <Typography variant="body2">Styled for: {occasion}.</Typography>
                </li>
              )}
              {(suggestion.whyItWorks || []).map((reason) => (
                <li key={reason}>
                  <Typography variant="body2">{reason}</Typography>
                </li>
              ))}
            </Box>
            <Stack spacing={1}>
              <Button
                variant="contained"
                startIcon={<TodayIcon />}
                onClick={() => saveOutfit({ wearToday: true })}
              >
                Wear today
              </Button>
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ShuffleIcon />}
                  onClick={() => generate(occasion)}
                  disabled={generating}
                >
                  Shuffle
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<BookmarkBorderIcon />}
                  onClick={() => saveOutfit()}
                >
                  Save
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Box>
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
