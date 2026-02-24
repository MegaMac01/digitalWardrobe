import React from "react";
import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { SEASON_OPTIONS, TYPE_ORDER, VIBE_OPTIONS } from "../../utils/outfitEngine";

const EMPTY_FILTERS = {
  search: "",
  type: "",
  season: "",
  vibe: "",
  favoritesOnly: false,
};

export default function ClothingFilterBar({ filters, onChange, onClear }) {
  const activeFilters = filters ?? EMPTY_FILTERS;

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      sx={{ mb: 3, alignItems: { xs: "stretch", md: "center" } }}
    >
      <TextField
        label="Search notes or color"
        size="small"
        value={activeFilters.search}
        onChange={(event) => onChange({ ...activeFilters, search: event.target.value })}
        sx={{ minWidth: 220, flex: 1 }}
      />
      <TextField
        select
        label="Type"
        size="small"
        value={activeFilters.type}
        onChange={(event) => onChange({ ...activeFilters, type: event.target.value })}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">All</MenuItem>
        {TYPE_ORDER.map((type) => (
          <MenuItem key={type} value={type}>
            {type}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Season"
        size="small"
        value={activeFilters.season}
        onChange={(event) => onChange({ ...activeFilters, season: event.target.value })}
        sx={{ minWidth: 130 }}
      >
        <MenuItem value="">All</MenuItem>
        {SEASON_OPTIONS.map((season) => (
          <MenuItem key={season} value={season}>
            {season}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Vibe"
        size="small"
        value={activeFilters.vibe}
        onChange={(event) => onChange({ ...activeFilters, vibe: event.target.value })}
        sx={{ minWidth: 130 }}
      >
        <MenuItem value="">All</MenuItem>
        {VIBE_OPTIONS.map((vibe) => (
          <MenuItem key={vibe} value={vibe}>
            {vibe}
          </MenuItem>
        ))}
      </TextField>
      <FormControlLabel
        control={
          <Switch
            checked={activeFilters.favoritesOnly}
            onChange={(event) =>
              onChange({ ...activeFilters, favoritesOnly: event.target.checked })
            }
          />
        }
        label="Favorites"
      />
      <Box>
        <Button onClick={onClear} size="small" color="inherit">
          Clear
        </Button>
      </Box>
    </Stack>
  );
}
