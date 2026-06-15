import React from "react";
import LogoutIcon from "@mui/icons-material/Logout";
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useClothes } from "../hooks/useClothes";
import { useOutfits } from "../hooks/useOutfits";

function StatCard({ label, value }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6">{label}</Typography>
        <Typography variant="h4">{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { clothes } = useClothes();
  const { outfits } = useOutfits();

  const favorites = clothes.filter((item) => item.favorite).length;
  const scheduled = outfits.filter((o) => (o.scheduledDates || []).length > 0).length;

  return (
    <>
      <Typography variant="h3" sx={{ mb: 2.2 }}>
        Profile
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">Signed in as</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email ?? "Unknown user"}
              </Typography>
            </Box>
            <Button variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
              Sign out
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={1.8}>
        <Grid item xs={6} md={3}>
          <StatCard label="Pieces" value={clothes.length} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Favorites" value={favorites} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Saved outfits" value={outfits.length} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Scheduled" value={scheduled} />
        </Grid>
      </Grid>
    </>
  );
}
