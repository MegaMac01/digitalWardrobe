import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Typography,
} from "@mui/material";
import { useClothes } from "../hooks/useClothes";
import { useOutfits } from "../hooks/useOutfits";
import { useDeferredDelete } from "../hooks/useDeferredDelete";
import Loader from "../components/layout/Loader";
import EmptyState from "../components/layout/EmptyState";
import Toast from "../components/layout/Toast";
import OutfitCard from "../components/outfit/OutfitCard";
import OutfitCalendar from "../components/outfit/OutfitCalendar";
import OutfitAgenda from "../components/outfit/OutfitAgenda";
import OutfitEditDialog from "../components/outfit/OutfitEditDialog";
import { isISODate } from "../utils/validation";
import { logClientError } from "../utils/telemetry";
import { buildScheduleMap } from "../utils/helpers";

export default function PlannerPage() {
  const navigate = useNavigate();
  const { clothes, loading: loadingClothes } = useClothes();
  const {
    outfits,
    loading: loadingOutfits,
    error: outfitsError,
    updateOutfit,
    deleteOutfit,
    scheduleOutfit,
    unscheduleOutfit,
  } = useOutfits();

  const [toast, setToast] = useState({ open: false, message: "", severity: "success", undoId: null });
  const [confirmSchedule, setConfirmSchedule] = useState(null);
  const [editingOutfit, setEditingOutfit] = useState(null);
  const { pendingIds, scheduleDelete, undoDelete } = useDeferredDelete(deleteOutfit);

  const visibleOutfits = useMemo(
    () => outfits.filter((outfit) => !pendingIds.has(outfit.id)),
    [outfits, pendingIds]
  );
  const scheduleMap = useMemo(() => buildScheduleMap(visibleOutfits), [visibleOutfits]);

  const clothesById = useMemo(() => {
    const map = {};
    clothes.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [clothes]);

  async function doSchedule(outfitId, dateISO) {
    try {
      const conflicts = (scheduleMap[dateISO] || []).filter((o) => o.id !== outfitId).length;
      await scheduleOutfit(outfitId, dateISO);
      setToast({
        open: true,
        message:
          conflicts > 0
            ? `Scheduled for ${dateISO} alongside ${conflicts} other outfit${conflicts > 1 ? "s" : ""}.`
            : `Scheduled for ${dateISO}.`,
        severity: conflicts > 0 ? "warning" : "success",
      });
    } catch (error) {
      logClientError(error, { scope: "outfits", action: "schedule", metadata: { outfitId, dateISO } });
      setToast({ open: true, message: "Could not schedule outfit.", severity: "error" });
    }
  }

  function handleSchedule(outfitId, dateISO) {
    if (!isISODate(dateISO)) {
      setToast({ open: true, message: "Pick a valid date.", severity: "warning" });
      return;
    }
    const existing = (scheduleMap[dateISO] || []).filter((o) => o.id !== outfitId);
    if (existing.length > 0) {
      setConfirmSchedule({ outfitId, dateISO, existing });
      return;
    }
    doSchedule(outfitId, dateISO);
  }

  async function handleUnschedule(outfitId, dateISO) {
    try {
      await unscheduleOutfit(outfitId, dateISO);
      setToast({ open: true, message: `Removed ${dateISO}.`, severity: "success" });
    } catch (error) {
      logClientError(error, { scope: "outfits", action: "unschedule", metadata: { outfitId, dateISO } });
      setToast({ open: true, message: "Could not remove schedule.", severity: "error" });
    }
  }

  async function handleReschedule(outfitId, fromDate, toDate) {
    if (!isISODate(fromDate) || !isISODate(toDate) || fromDate === toDate) return;
    try {
      await scheduleOutfit(outfitId, toDate);
      await unscheduleOutfit(outfitId, fromDate);
      const conflicts = (scheduleMap[toDate] || []).filter((o) => o.id !== outfitId).length;
      setToast({
        open: true,
        message:
          conflicts > 0
            ? `Moved to ${toDate}. ${conflicts} other outfit${conflicts > 1 ? "s" : ""} that day.`
            : `Moved from ${fromDate} to ${toDate}.`,
        severity: conflicts > 0 ? "warning" : "success",
      });
    } catch (error) {
      logClientError(error, {
        scope: "outfits",
        action: "reschedule",
        metadata: { outfitId, fromDate, toDate },
      });
      setToast({ open: true, message: "Could not move scheduled outfit.", severity: "error" });
    }
  }

  async function handleSaveEdit(outfitId, payload) {
    try {
      await updateOutfit(outfitId, payload);
      setToast({ open: true, message: "Outfit updated.", severity: "success" });
      setEditingOutfit(null);
    } catch (error) {
      logClientError(error, { scope: "outfits", action: "update", metadata: { outfitId } });
      setToast({ open: true, message: "Could not update outfit.", severity: "error" });
    }
  }

  if (loadingClothes || loadingOutfits) {
    return <Loader label="Loading your planner..." />;
  }

  if (outfits.length === 0) {
    return (
      <EmptyState
        title="No outfits to plan yet"
        description="Generate a look on the Today screen and save it, then schedule it here across your week."
        actionLabel="Find an outfit"
        onAction={() => navigate("/")}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2.2 }}>
        Planner
      </Typography>

      <OutfitAgenda outfits={visibleOutfits} onUnschedule={handleUnschedule} />
      <OutfitCalendar outfits={visibleOutfits} onReschedule={handleReschedule} />

      <Typography variant="h5" sx={{ mb: 1.2 }}>
        Saved Outfits
      </Typography>
      {outfitsError && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {outfitsError}
        </Alert>
      )}
      {visibleOutfits.length === 0 ? (
        <Alert severity="info">No saved outfits yet. Generate one on Today and save it.</Alert>
      ) : (
        <Grid container spacing={1.8}>
          {visibleOutfits.map((outfit) => (
            <Grid item key={outfit.id} xs={12} sm={6} lg={4}>
              <OutfitCard
                outfit={outfit}
                clothesById={clothesById}
                showScheduleActions
                onSchedule={handleSchedule}
                onUnschedule={handleUnschedule}
                onEdit={(o) => setEditingOutfit(o)}
                onDelete={(id) => {
                  scheduleDelete(id, id);
                  setToast({ open: true, message: "Outfit deleted.", severity: "info", undoId: id });
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <OutfitEditDialog
        open={Boolean(editingOutfit)}
        outfit={editingOutfit}
        clothes={clothes}
        onClose={() => setEditingOutfit(null)}
        onSave={handleSaveEdit}
      />

      <Dialog open={Boolean(confirmSchedule)} onClose={() => setConfirmSchedule(null)}>
        <DialogTitle>Day already booked</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmSchedule &&
              `You already have ${confirmSchedule.existing.length} outfit${
                confirmSchedule.existing.length > 1 ? "s" : ""
              } scheduled on ${confirmSchedule.dateISO}${
                confirmSchedule.existing[0]?.name
                  ? ` (${confirmSchedule.existing.map((o) => o.name).join(", ")})`
                  : ""
              }. Schedule this one too?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSchedule(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (confirmSchedule) doSchedule(confirmSchedule.outfitId, confirmSchedule.dateISO);
              setConfirmSchedule(null);
            }}
          >
            Schedule anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        action={
          toast.undoId ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                undoDelete(toast.undoId);
                setToast((prev) => ({ ...prev, open: false, undoId: null }));
              }}
            >
              UNDO
            </Button>
          ) : undefined
        }
        onClose={() => setToast((prev) => ({ ...prev, open: false, undoId: null }))}
      />
    </Box>
  );
}
