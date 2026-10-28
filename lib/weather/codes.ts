/** WMO weather interpretation codes (as used by Open-Meteo) → translation keys. */
export type WeatherCodeKey =
  | "wx.clear"
  | "wx.mainlyClear"
  | "wx.partlyCloudy"
  | "wx.overcast"
  | "wx.fog"
  | "wx.drizzle"
  | "wx.lightRain"
  | "wx.rain"
  | "wx.heavyRain"
  | "wx.showers"
  | "wx.snow"
  | "wx.thunder"
  | "wx.thunderHail"
  | "wx.unknown";

export function weatherCodeKey(code: number | null): WeatherCodeKey {
  switch (code) {
    case 0: return "wx.clear";
    case 1: return "wx.mainlyClear";
    case 2: return "wx.partlyCloudy";
    case 3: return "wx.overcast";
    case 45: case 48: return "wx.fog";
    case 51: case 53: case 55: case 56: case 57: return "wx.drizzle";
    case 61: return "wx.lightRain";
    case 63: case 66: case 67: return "wx.rain";
    case 65: case 82: return "wx.heavyRain";
    case 80: case 81: return "wx.showers";
    case 71: case 73: case 75: case 77: case 85: case 86: return "wx.snow";
    case 95: return "wx.thunder";
    case 96: case 99: return "wx.thunderHail";
    default: return "wx.unknown";
  }
}
