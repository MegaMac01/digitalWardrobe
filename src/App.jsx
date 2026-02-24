import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Container } from "@mui/material";
import Navbar from "./components/layout/Navbar";
import Loader from "./components/layout/Loader";
import { useAuth } from "./hooks/useAuth";

const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const OutfitsPage = lazy(() => import("./pages/OutfitsPage"));
const OutfitBuilderPage = lazy(() => import("./pages/OutfitBuilderPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader label="Restoring your wardrobe..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader label="Loading..." />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 5 }, pb: 8 }}>
        <Suspense fallback={<Loader minHeight={360} />}>
          <Routes>
            <Route path="/" element={<RequireAuth><GalleryPage /></RequireAuth>} />
            <Route path="/outfits" element={<RequireAuth><OutfitsPage /></RequireAuth>} />
            <Route path="/builder" element={<RequireAuth><OutfitBuilderPage /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Container>
    </>
  );
}
