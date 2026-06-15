import React, { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Button, Collapse, Stack, Typography } from "@mui/material";
import ClothingUploader from "../components/clothing/ClothingUploader";
import ClothingGallery from "../components/clothing/ClothingGallery";

export default function GalleryPage() {
  const [showUploader, setShowUploader] = useState(true);

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.2 }}>
        <Typography variant="h3" sx={{ flexGrow: 1 }}>
          Your Closet
        </Typography>
        <Button
          variant={showUploader ? "outlined" : "contained"}
          startIcon={showUploader ? <CloseIcon /> : <AddIcon />}
          onClick={() => setShowUploader((prev) => !prev)}
          sx={{ flexShrink: 0 }}
        >
          {showUploader ? "Close" : "Add item"}
        </Button>
      </Stack>

      <Collapse in={showUploader} unmountOnExit>
        <ClothingUploader />
      </Collapse>

      <ClothingGallery
        onAddItem={() => {
          setShowUploader(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}
