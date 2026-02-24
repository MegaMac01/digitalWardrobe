import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function Loader({ label = "Loading your style...", minHeight = 220 }) {
  return (
    <Box
      sx={{
        minHeight,
        display: "grid",
        placeItems: "center",
        gap: 1.2,
        py: 2,
      }}
    >
      <CircularProgress color="primary" />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
