import React, { useMemo, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function NavLink({ to, label, currentPath, onClick }) {
  const active = currentPath === to;

  return (
    <Button
      component={RouterLink}
      to={to}
      onClick={onClick}
      sx={{
        color: "inherit",
        borderBottom: active ? "2px solid rgba(255,245,227,0.9)" : "2px solid transparent",
        borderRadius: 0,
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </Button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const authedLinks = useMemo(
    () => [
      { to: "/", label: "Wardrobe" },
      { to: "/builder", label: "Builder" },
      { to: "/outfits", label: "On The Go" },
      { to: "/profile", label: "Profile" },
    ],
    []
  );

  const guestLinks = useMemo(
    () => [
      { to: "/login", label: "Sign In" },
      { to: "/register", label: "Register" },
    ],
    []
  );

  const links = user ? authedLinks : guestLinks;
  const initial = user?.email?.slice(0, 1)?.toUpperCase() ?? "G";

  const mobileMenu = (
    <Box sx={{ width: 260, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Digital Wardrobe
      </Typography>
      <Stack spacing={1}>
        {links.map((link) => (
          <Button
            key={link.to}
            component={RouterLink}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            variant={location.pathname === link.to ? "contained" : "outlined"}
            color="inherit"
            sx={{ justifyContent: "flex-start" }}
          >
            {link.label}
          </Button>
        ))}
        {user && (
          <Button
            color="inherit"
            variant="outlined"
            onClick={async () => {
              await logout();
              setMobileOpen(false);
            }}
          >
            Log Out
          </Button>
        )}
      </Stack>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      color="primary"
      sx={{
        background:
          "linear-gradient(135deg, rgba(73,47,31,0.96) 0%, rgba(111,75,50,0.96) 60%, rgba(141,98,67,0.95) 100%)",
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          color="inherit"
          onClick={() => setMobileOpen(true)}
          sx={{ display: { xs: "inline-flex", md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h5"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          The Vintage Wardrobe
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ display: { xs: "none", md: "flex" } }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              label={link.label}
              currentPath={location.pathname}
            />
          ))}
          {user && (
            <Button color="inherit" onClick={logout}>
              Log Out
            </Button>
          )}
        </Stack>

        <Avatar
          sx={{
            bgcolor: "rgba(255,245,227,0.2)",
            color: "rgba(255,248,234,0.95)",
            border: "1px solid rgba(255,245,227,0.45)",
            width: 34,
            height: 34,
            fontSize: 16,
          }}
        >
          {initial}
        </Avatar>
      </Toolbar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { backgroundColor: "#f4e8d1" } }}
      >
        {mobileMenu}
      </Drawer>
    </AppBar>
  );
}
