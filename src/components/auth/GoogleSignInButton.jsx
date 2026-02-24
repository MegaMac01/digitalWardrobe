import React from "react";
import GoogleIcon from "@mui/icons-material/Google";
import { Button } from "@mui/material";

export default function GoogleSignInButton({
  onClick,
  label = "Continue with Google",
  disabled = false,
}) {
  return (
    <Button
      type="button"
      variant="outlined"
      startIcon={<GoogleIcon />}
      onClick={onClick}
      disabled={disabled}
      sx={{ borderStyle: "dashed" }}
    >
      {label}
    </Button>
  );
}
