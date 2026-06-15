import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import CheckroomIcon from "@mui/icons-material/Checkroom";

export default function EmptyState({
  icon = <CheckroomIcon sx={{ fontSize: 48 }} />,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 6,
        px: 2,
        border: "1px dashed rgba(111,75,50,0.3)",
        borderRadius: 2,
        bgcolor: "rgba(255,255,255,0.35)",
      }}
    >
      <Stack spacing={1.4} alignItems="center">
        <Box sx={{ color: "text.secondary" }}>{icon}</Box>
        <Typography variant="h6">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {description}
          </Typography>
        )}
        {actionLabel && onAction && (
          <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
