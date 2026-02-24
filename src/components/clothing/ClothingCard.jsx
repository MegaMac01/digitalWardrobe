import React from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

function TinyMeta({ label, value }) {
  if (!value) return null;
  return (
    <Typography variant="caption" color="text.secondary">
      {label}: {value}
    </Typography>
  );
}

export default function ClothingCard({ item, onToggleFavorite, onDelete }) {
  return (
    <Card sx={{ overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
        component="img"
        image={item.imageUrl}
        alt={`${item.type} in ${item.color || "unknown color"}`}
        sx={{ aspectRatio: "1 / 1", objectFit: "cover" }}
      />
      <CardContent sx={{ py: 1.3, pb: 1, flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {item.type}
          </Typography>
          <Chip size="small" variant="outlined" label={`Warmth ${item.warmth ?? 3}`} />
        </Stack>
        <Box sx={{ mt: 0.7 }}>
          <TinyMeta label="Color" value={item.color} />
        </Box>
        <Box>
          <TinyMeta
            label="Season"
            value={item.seasonTags?.length ? item.seasonTags.join(", ") : "Any"}
          />
        </Box>
        {item.vibes?.length > 0 && (
          <Stack direction="row" spacing={0.6} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.6 }}>
            {item.vibes.slice(0, 3).map((vibe) => (
              <Chip key={vibe} label={vibe} size="small" color="secondary" variant="outlined" />
            ))}
          </Stack>
        )}
        {item.notes && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.9 }}>
            {item.notes}
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ pt: 0, pb: 1.2, px: 1 }}>
        <Tooltip title={item.favorite ? "Unfavorite" : "Mark favorite"}>
          <IconButton size="small" onClick={() => onToggleFavorite(item)}>
            {item.favorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
          </IconButton>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Delete item">
          <IconButton size="small" color="error" onClick={() => onDelete(item)}>
            <DeleteOutlineIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}
