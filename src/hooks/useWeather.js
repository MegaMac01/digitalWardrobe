import { useCallback, useEffect, useState } from "react";
import { logClientError } from "../utils/telemetry";

const WEATHER_LABELS = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Foggy",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  56: "Freezing Drizzle",
  57: "Freezing Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Freezing Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Violent Showers",
  85: "Snow Showers",
  86: "Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

function normalizeWeather(current = {}) {
  const temperature = Number(current.temperature_2m ?? 68);
  const apparentTemperature = Number(current.apparent_temperature ?? temperature);
  const precipitation = Number(current.precipitation ?? 0);
  const windSpeed = Number(current.wind_speed_10m ?? 0);
  const weatherCode = Number(current.weather_code ?? 0);

  return {
    temperature,
    apparentTemperature,
    precipitation,
    windSpeed,
    weatherCode,
    label: WEATHER_LABELS[weatherCode] ?? "Unknown",
    isCold: apparentTemperature <= 50,
    isHot: apparentTemperature >= 79,
    isRaining: precipitation > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode),
    isSnowing: [71, 73, 75, 77, 85, 86].includes(weatherCode),
    isWindy: windSpeed >= 16,
  };
}

async function fetchWeatherByCoords({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Weather API failed");
  }
  const data = await response.json();
  return normalizeWeather(data.current);
}

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);

  const refresh = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const next = await fetchWeatherByCoords(coords);
      setWeather(next);
      setError("");
    } catch (weatherError) {
      logClientError(weatherError, { scope: "weather", action: "refresh" });
      setError("Weather service unavailable. You can still build outfits manually.");
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(nextCoords);
      },
      () => {
        logClientError("Geolocation permission denied", {
          scope: "weather",
          action: "geolocation-denied",
        });
        setError("Location denied. Outfit tips will be vibe-based only.");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 9000 }
    );
  }, []);

  useEffect(() => {
    if (!coords) return;
    refresh();
  }, [coords, refresh]);

  return {
    weather,
    loading,
    error,
    refresh,
  };
}
