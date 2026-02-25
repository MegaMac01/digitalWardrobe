import React, { useMemo } from "react";
import { Alert, Box, Card, CardContent, Chip, Grid, Stack, Typography } from "@mui/material";

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildNextDays(count = 7) {
  const today = new Date();
  const days = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    days.push({
      isoDate: toISODate(date),
      label: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    });
  }
  return days;
}

function buildScheduleMap(outfits) {
  const map = {};
  outfits.forEach((outfit) => {
    (outfit.scheduledDates || []).forEach((dateISO) => {
      if (!map[dateISO]) map[dateISO] = [];
      map[dateISO].push(outfit);
    });
  });
  return map;
}

export default function OutfitAgenda({ outfits, onUnschedule }) {
  const nextDays = useMemo(() => buildNextDays(7), []);
  const scheduleMap = useMemo(() => buildScheduleMap(outfits), [outfits]);
  const conflictCount = nextDays.reduce((count, day) => {
    const outfitsForDay = scheduleMap[day.isoDate] || [];
    return outfitsForDay.length > 1 ? count + 1 : count;
  }, 0);

  return (
    <Card sx={{ mb: 2.6 }}>
      <CardContent>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.2 }}>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            7-Day Agenda
          </Typography>
          {conflictCount > 0 && (
            <Chip color="warning" label={`${conflictCount} conflict${conflictCount > 1 ? "s" : ""}`} />
          )}
        </Stack>

        <Grid container spacing={1.2}>
          {nextDays.map((day) => {
            const outfitsForDay = scheduleMap[day.isoDate] || [];
            const hasConflict = outfitsForDay.length > 1;
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={day.isoDate}>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: hasConflict ? "warning.main" : "rgba(111,75,50,0.2)",
                    borderRadius: 1.5,
                    p: 1,
                    bgcolor: hasConflict ? "rgba(255,212,122,0.15)" : "rgba(255,255,255,0.3)",
                    minHeight: 118,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                    {day.label}
                  </Typography>
                  {outfitsForDay.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No outfit scheduled.
                    </Typography>
                  ) : (
                    <Stack spacing={0.6}>
                      {outfitsForDay.map((outfit) => (
                        <Chip
                          key={`${day.isoDate}-${outfit.id}`}
                          label={outfit.name}
                          size="small"
                          color={hasConflict ? "warning" : "secondary"}
                          variant={hasConflict ? "filled" : "outlined"}
                          onDelete={onUnschedule ? () => onUnschedule(outfit.id, day.isoDate) : undefined}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {conflictCount > 0 && (
          <Alert severity="warning" sx={{ mt: 1.2 }}>
            Some days have multiple outfits scheduled. Drag outfits on the calendar or remove one to resolve.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
