import React from "react";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WbCloudyIcon from "@mui/icons-material/WbCloudy";
import CloudIcon from "@mui/icons-material/Cloud";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import AirIcon from "@mui/icons-material/Air";
import GrainIcon from "@mui/icons-material/Grain";

// Picks a weather glyph from the current conditions.
export default function WeatherIcon({ weather, sx }) {
  if (!weather) return <WbCloudyIcon sx={sx} />;
  if (weather.isSnowing) return <AcUnitIcon sx={sx} />;
  if (weather.isRaining) return <GrainIcon sx={sx} />;
  if (weather.isWindy) return <AirIcon sx={sx} />;
  const code = weather.weatherCode ?? 0;
  if (code === 0 || code === 1) return <WbSunnyIcon sx={sx} />;
  if (code === 2) return <WbCloudyIcon sx={sx} />;
  return <CloudIcon sx={sx} />;
}
