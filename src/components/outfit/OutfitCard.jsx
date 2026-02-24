import React from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { TYPE_ORDER } from "../../utils/outfitEngine";

function OutfitPiece({ type, item }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {type}
      </Typography>
      {item ? (
        <CardMedia
          component="img"
          image={item.imageUrl}
          alt={type}
          sx={{ mt: 0.5, borderRadius: 1.2, aspectRatio: "1 / 1", objectFit: "cover" }}
        />
      ) : (
        <Box
          sx={{
            mt: 0.5,
            borderRadius: 1.2,
            border: "1px dashed rgba(86,60,41,0.24)",
            display: "grid",
            placeItems: "center",
            aspectRatio: "1 / 1",
            color: "text.secondary",
            fontSize: 12,
          }}
        >
          None
        </Box>
      )}
    </Box>
  );
}

export default function OutfitCard({
  outfit,
  clothesById = {},
  onDelete,
  onSaveSuggestion,
  showSaveAction = false,
}) {
  const items = outfit.itemIdsByType || outfit.items || {};

  const pieceTypes = TYPE_ORDER.filter((type) => items[type]);
  const displayTypes = pieceTypes.length > 0 ? pieceTypes : TYPE_ORDER;

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6">{outfit.name}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.7, flexWrap: "wrap", rowGap: 0.7 }}>
          {outfit.vibe && outfit.vibe !== "Any" && (
            <Chip label={outfit.vibe} size="small" color="secondary" />
          )}
          {outfit.weatherSnapshot?.label && (
            <Chip
              label={`${Math.round(outfit.weatherSnapshot.temperature)}F ${outfit.weatherSnapshot.label}`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
        {outfit.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {outfit.notes}
          </Typography>
        )}
      </CardContent>
      <CardContent sx={{ pt: 0, flexGrow: 1 }}>
        <Grid container spacing={1}>
          {displayTypes.map((type) => (
            <Grid item xs={4} key={type}>
              <OutfitPiece type={type} item={clothesById[items[type]]} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
      <CardActions sx={{ pt: 0 }}>
        {showSaveAction && (
          <Button size="small" variant="contained" onClick={onSaveSuggestion}>
            Save This Fit
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {onDelete && (
          <Tooltip title="Delete outfit">
            <IconButton color="error" size="small" onClick={() => onDelete(outfit.id)}>
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
}
