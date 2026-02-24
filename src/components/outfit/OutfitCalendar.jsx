import React, { useMemo, useState } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from "@mui/material";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMonthTitle(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildScheduleMap(outfits) {
  const map = {};
  outfits.forEach((outfit) => {
    const dates = outfit.scheduledDates || [];
    dates.forEach((dateISO) => {
      if (!map[dateISO]) {
        map[dateISO] = [];
      }
      map[dateISO].push(outfit);
    });
  });
  return map;
}

export default function OutfitCalendar({ outfits }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
              sx={{
                minHeight: 88,
                borderRadius: 1.4,
                border: "1px solid rgba(111,75,50,0.18)",
                bgcolor: cell.day ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
                p: 0.7,
                overflow: "hidden",
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
                        variant="outlined"
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
