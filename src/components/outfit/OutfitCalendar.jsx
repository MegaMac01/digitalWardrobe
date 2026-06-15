import React, { useMemo, useState } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Alert, Box, Card, CardContent, Chip, IconButton, Stack, Typography } from "@mui/material";
import { toISODate, buildScheduleMap } from "../../utils/helpers";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMonthTitle(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function OutfitCalendar({ outfits, onReschedule }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dragPayload, setDragPayload] = useState(null);
  const [tapMovePayload, setTapMovePayload] = useState(null);

  const scheduleMap = useMemo(() => buildScheduleMap(outfits), [outfits]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = useMemo(() => {
    const totalCells = 42;
    return Array.from({ length: totalCells }, (_, index) => {
      const day = index - firstDayIndex + 1;
      if (day < 1 || day > daysInMonth) {
        return { key: `empty-${index}`, day: null, isoDate: null, outfits: [] };
      }
      const isoDate = toISODate(new Date(year, month, day));
      return {
        key: isoDate,
        day,
        isoDate,
        outfits: scheduleMap[isoDate] || [],
      };
    });
  }, [daysInMonth, firstDayIndex, month, scheduleMap, year]);

  const conflictCount = cells.reduce((count, cell) => {
    if (!cell.day) return count;
    return cell.outfits.length > 1 ? count + 1 : count;
  }, 0);

  async function moveOutfit(payload, nextDateISO) {
    if (!payload || !nextDateISO || payload.fromDate === nextDateISO || !onReschedule) return;
    await onReschedule(payload.outfitId, payload.fromDate, nextDateISO);
  }

  return (
    <Card sx={{ mb: 2.6 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 1.2 }}>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            Outfit Calendar
          </Typography>
          <IconButton
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ minWidth: 165, textAlign: "center" }}>
            {formatMonthTitle(cursor)}
          </Typography>
          <IconButton onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
            <ChevronRightIcon />
          </IconButton>
        </Stack>
        {tapMovePayload && (
          <Alert severity="info" sx={{ mb: 1.2 }}>
            Move mode: tap a day to move this outfit from {tapMovePayload.fromDate}.
          </Alert>
        )}
        {conflictCount > 0 && (
          <Alert severity="warning" sx={{ mb: 1.2 }}>
            {conflictCount} day{conflictCount > 1 ? "s" : ""} with scheduling conflicts.
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 0.8,
          }}
        >
          {WEEKDAYS.map((weekday) => (
            <Typography
              key={weekday}
              variant="caption"
              sx={{ fontWeight: 700, textTransform: "uppercase", color: "text.secondary", px: 0.5 }}
            >
              {weekday}
            </Typography>
          ))}
          {cells.map((cell) => (
            <Box
              key={cell.key}
              onDragOver={(event) => {
                if (cell.isoDate) event.preventDefault();
              }}
              onDrop={async (event) => {
                event.preventDefault();
                const raw = event.dataTransfer.getData("application/json");
                let payload = dragPayload;
                if (raw) {
                  try {
                    payload = JSON.parse(raw);
                  } catch {
                    payload = dragPayload;
                  }
                }
                await moveOutfit(payload, cell.isoDate);
                setDragPayload(null);
                setTapMovePayload(null);
              }}
              onClick={async () => {
                if (!tapMovePayload || !cell.isoDate) return;
                await moveOutfit(tapMovePayload, cell.isoDate);
                setTapMovePayload(null);
              }}
              sx={{
                minHeight: 88,
                borderRadius: 1.4,
                border: "1px solid",
                borderColor:
                  cell.outfits.length > 1 ? "warning.main" : "rgba(111,75,50,0.18)",
                bgcolor: cell.day ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
                p: 0.7,
                overflow: "hidden",
                cursor: tapMovePayload && cell.isoDate ? "pointer" : "default",
              }}
            >
              {cell.day && (
                <>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {cell.day}
                  </Typography>
                  <Stack spacing={0.4} sx={{ mt: 0.4 }}>
                    {cell.outfits.slice(0, 2).map((outfit) => (
                      <Chip
                        key={`${cell.key}-${outfit.id}`}
                        size="small"
                        label={outfit.name}
                        variant={cell.outfits.length > 1 ? "filled" : "outlined"}
                        color={cell.outfits.length > 1 ? "warning" : "default"}
                        draggable
                        onDragStart={(event) => {
                          const payload = { outfitId: outfit.id, fromDate: cell.isoDate };
                          event.dataTransfer.setData("application/json", JSON.stringify(payload));
                          setDragPayload(payload);
                        }}
                        onDragEnd={() => setDragPayload(null)}
                        onClick={(event) => {
                          event.stopPropagation();
                          setTapMovePayload((current) => {
                            if (current?.outfitId === outfit.id && current.fromDate === cell.isoDate) {
                              return null;
                            }
                            return { outfitId: outfit.id, fromDate: cell.isoDate };
                          });
                        }}
                        sx={{ height: 20, justifyContent: "flex-start" }}
                      />
                    ))}
                    {cell.outfits.length > 2 && (
                      <Typography variant="caption" color="text.secondary">
                        +{cell.outfits.length - 2} more
                      </Typography>
                    )}
                  </Stack>
                </>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
