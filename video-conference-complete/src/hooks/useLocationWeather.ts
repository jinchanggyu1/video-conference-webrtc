// ====================================
// Hook: IP-based Location + Open-Meteo Weather
// ====================================

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

export interface WeatherInfo {
  city: string;
  country: string;
  temperature: number;
  weatherCode: number;
  icon: string;
  description: string;
}

// Open-Meteo WMO weather codes → emoji + Korean label
const codeToInfo = (code: number): { icon: string; description: string } => {
  if (code === 0) return { icon: "☀️", description: "맑음" };
  if (code <= 2) return { icon: "🌤️", description: "대체로 맑음" };
  if (code === 3) return { icon: "☁️", description: "흐림" };
  if (code <= 48) return { icon: "🌫️", description: "안개" };
  if (code <= 57) return { icon: "🌦️", description: "이슬비" };
  if (code <= 67) return { icon: "🌧️", description: "비" };
  if (code <= 77) return { icon: "🌨️", description: "눈" };
  if (code <= 82) return { icon: "🌧️", description: "소나기" };
  if (code <= 86) return { icon: "🌨️", description: "눈 소나기" };
  if (code <= 99) return { icon: "⛈️", description: "뇌우" };
  return { icon: "🌡️", description: "알 수 없음" };
};

export function useLocationWeather() {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const locRes = await fetch("https://ipapi.co/json/");
        if (!locRes.ok) throw new Error(`Location lookup failed: ${locRes.status}`);
        const loc = await locRes.json();
        if (cancelled) return;

        const { latitude, longitude, city, country_name: country } = loc;
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          throw new Error("Invalid location response");
        }

        const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=celsius`;
        const wxRes = await fetch(wxUrl);
        if (!wxRes.ok) throw new Error(`Weather lookup failed: ${wxRes.status}`);
        const wx = await wxRes.json();
        if (cancelled) return;

        const current = wx.current_weather;
        if (!current) throw new Error("No current weather in response");

        const { icon, description } = codeToInfo(current.weathercode);
        const info: WeatherInfo = {
          city: city || "Unknown",
          country: country || "",
          temperature: Math.round(current.temperature),
          weatherCode: current.weathercode,
          icon,
          description,
        };

        setWeather(info);
        logger.info("Weather acquired", info, "useLocationWeather");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Weather fetch failed";
        setError(msg);
        logger.warn("Weather fetch failed", err, "useLocationWeather");
      }
    };

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  return { weather, error };
}
