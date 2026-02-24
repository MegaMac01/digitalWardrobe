import React from "react";
import { Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Typography variant="h4" color="error" align="center" sx={{ mt: 8 }}>
      404 - Page Not Found
    </Typography>
  );
}
