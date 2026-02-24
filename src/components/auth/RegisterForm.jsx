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

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleRegister(event) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await register(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Unable to create account with that email/password.");
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
    } catch {
      setError("Google sign-up failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card sx={{ maxWidth: 460, mx: "auto", mt: { xs: 3, md: 6 } }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h4" gutterBottom>
          Create Your Closet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Save each piece once, then style outfits in seconds.
        </Typography>

        <Box component="form" onSubmit={handleRegister}>
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
              autoComplete="new-password"
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              Create Account
            </Button>
            <GoogleSignInButton
              onClick={handleGoogle}
              disabled={submitting}
              label="Sign up with Google"
            />
          </Stack>
        </Box>

        <Typography sx={{ mt: 2.5 }}>
          Already have an account?{" "}
          <RouterLink to="/login" style={{ color: "inherit", fontWeight: 700 }}>
            Sign in
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
