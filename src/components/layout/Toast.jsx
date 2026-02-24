import React from "react";
import { Alert, Snackbar } from "@mui/material";

export default function Toast({
  open,
  message,
  severity = "info",
  onClose,
  autoHideDuration = 2800,
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
