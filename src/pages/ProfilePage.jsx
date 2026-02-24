import React from "react";
import { Alert, Card, CardContent, Grid, Typography } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useClothes } from "../hooks/useClothes";
import { useOutfits } from "../hooks/useOutfits";

export default function ProfilePage() {
  const { user } = useAuth();
  const { clothes } = useClothes();
  const { outfits } = useOutfits();

  const favorites = clothes.filter((item) => item.favorite).length;

  return (
    <>
      <Typography variant="h3" sx={{ mb: 1 }}>
        Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.2 }}>
        Closet stats to keep your style library organized.
      </Typography>
      <Grid container spacing={1.8}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Signed In As</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email ?? "Unknown user"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Wardrobe Pieces</Typography>
              <Typography variant="h4">{clothes.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Saved Outfits</Typography>
              <Typography variant="h4">{outfits.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Alert severity="info" sx={{ mt: 2 }}>
        Favorites tagged: {favorites}. Add tags and warmth data to improve outfit quality.
      </Alert>
    </>
  );
}
