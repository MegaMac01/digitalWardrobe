import React from "react";
import { Alert, Snackbar } from "@mui/material";

export default function Toast({
  open,
  message,
  severity = "info",
  onClose,
  action,
  autoHideDuration,
}) {
  // Give the user longer to react when there's an action (e.g. Undo).
  const duration = autoHideDuration ?? (action ? 6000 : 2800);

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: 72, md: 24 } }}
    >
      <Alert
        onClose={action ? undefined : onClose}
        action={action}
        severity={severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
