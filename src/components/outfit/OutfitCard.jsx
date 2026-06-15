import React, { useMemo, useState } from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
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
  TextField,
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
          loading="lazy"
          decoding="async"
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
  onEdit,
  onSaveSuggestion,
  onSchedule,
  onUnschedule,
  showSaveAction = false,
  showScheduleActions = false,
}) {
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const items = outfit.itemIdsByType || outfit.items || {};
  const scheduledDates = useMemo(
    () => [...(outfit.scheduledDates || [])].sort((a, b) => a.localeCompare(b)),
    [outfit.scheduledDates]
  );

  const orderedTypes = outfit.previewOrder?.length ? outfit.previewOrder : TYPE_ORDER;
  const pieceTypes = orderedTypes.filter((type) => items[type]);
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
        {Array.isArray(outfit.whyItWorks) && outfit.whyItWorks.length > 0 && (
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            {outfit.whyItWorks.slice(0, 3).map((reason) => (
              <li key={reason}>
                <Typography variant="caption" color="text.secondary">
                  {reason}
                </Typography>
              </li>
            ))}
          </Box>
        )}
        {scheduledDates.length > 0 && (
          <Stack direction="row" spacing={0.7} sx={{ mt: 1, flexWrap: "wrap", rowGap: 0.8 }}>
            {scheduledDates.map((dateISO) => (
              <Chip
                key={dateISO}
                size="small"
                label={dateISO}
                color="warning"
                variant="outlined"
                onDelete={
                  showScheduleActions && onUnschedule
                    ? () => onUnschedule(outfit.id, dateISO)
                    : undefined
                }
              />
            ))}
          </Stack>
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
        {showScheduleActions && onSchedule && (
          <>
            <TextField
              size="small"
              type="date"
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
              sx={{ maxWidth: 155 }}
              InputLabelProps={{ shrink: true }}
            />
            <Button size="small" variant="outlined" onClick={() => onSchedule(outfit.id, scheduleDate)}>
              Schedule
            </Button>
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {onEdit && (
          <Tooltip title="Edit outfit">
            <IconButton size="small" onClick={() => onEdit(outfit)}>
              <EditOutlinedIcon />
            </IconButton>
          </Tooltip>
        )}
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
