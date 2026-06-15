import React, { useMemo } from "react";
import TodayIcon from "@mui/icons-material/Today";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import BrushIcon from "@mui/icons-material/Brush";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function NavLink({ to, label, currentPath }) {
  const active = currentPath === to;

  return (
    <Button
      component={RouterLink}
      to={to}
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
  const navigate = useNavigate();

  const authedLinks = useMemo(
    () => [
      { to: "/", label: "Today", icon: <TodayIcon /> },
      { to: "/closet", label: "Closet", icon: <CheckroomIcon /> },
      { to: "/builder", label: "Builder", icon: <BrushIcon /> },
      { to: "/planner", label: "Planner", icon: <CalendarMonthIcon /> },
      { to: "/profile", label: "Profile", icon: <PersonIcon /> },
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

  // The bottom-nav value must match one of the actions, or MUI warns. Fall back
  // to the Today tab for unknown routes.
  const currentTab = authedLinks.some((link) => link.to === location.pathname)
    ? location.pathname
    : "/";

  return (
    <>
      <AppBar
        position="sticky"
        color="primary"
        sx={{
          background:
            "linear-gradient(135deg, rgba(73,47,31,0.96) 0%, rgba(111,75,50,0.96) 60%, rgba(141,98,67,0.95) 100%)",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
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

          {/* Desktop: inline links + logout. Mobile uses the bottom nav. */}
          <Stack direction="row" spacing={0.5} sx={{ display: { xs: "none", md: "flex" } }}>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} label={link.label} currentPath={location.pathname} />
            ))}
            {user && (
              <Button color="inherit" onClick={logout}>
                Log Out
              </Button>
            )}
          </Stack>

          {/* Guest links also need to be reachable on mobile (no bottom nav for guests). */}
          {!user && (
            <Stack direction="row" spacing={0.5} sx={{ display: { xs: "flex", md: "none" } }}>
              {guestLinks.map((link) => (
                <NavLink key={link.to} to={link.to} label={link.label} currentPath={location.pathname} />
              ))}
            </Stack>
          )}

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
      </AppBar>

      {/* Mobile bottom navigation for signed-in users */}
      {user && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            display: { xs: "block", md: "none" },
          }}
        >
          <BottomNavigation
            showLabels
            value={currentTab}
            onChange={(event, value) => navigate(value)}
          >
            {authedLinks.map((link) => (
              <BottomNavigationAction
                key={link.to}
                label={link.label}
                value={link.to}
                icon={link.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </>
  );
}
