import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import GoogleSignInButton from "./GoogleSignInButton";
import { useAuth } from "../../hooks/useAuth";
import { isValidEmail } from "../../utils/validation";
import { logClientError } from "../../utils/telemetry";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (authError) {
      logClientError(authError, { scope: "auth", action: "login" });
      setError("Unable to sign in. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate("/", { replace: true });
    } catch (authError) {
      logClientError(authError, { scope: "auth", action: "google-login" });
      setError("Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card sx={{ maxWidth: 460, mx: "auto", mt: { xs: 3, md: 6 } }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h4" gutterBottom>
          Welcome Back
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Step into your vintage wardrobe and dress for the day.
        </Typography>

        <Box component="form" onSubmit={handleLogin}>
          <Stack spacing={2}>
            <TextField
              type="email"
              label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
            <TextField
              type="password"
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              Sign In
            </Button>
            <GoogleSignInButton
              onClick={handleGoogle}
              disabled={submitting}
              label="Sign in with Google"
            />
          </Stack>
        </Box>

        <Typography sx={{ mt: 2.5 }}>
          Need an account?{" "}
          <RouterLink to="/register" style={{ color: "inherit", fontWeight: 700 }}>
            Create one
          </RouterLink>
        </Typography>
        {error && (
          <Typography color="error" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
