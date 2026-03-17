export interface TransitArrival {
  minutes: number;
}

export interface TransitRoute {
  routeName: string;
  direction: string;
  stopName: string;
  arrivals: TransitArrival[];
  error?: string;
}

export interface HourlyWeather {
  time: number;
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  precipProbability: number;
  precipAmount: number;
}

export interface DailyWeather {
  tempHigh: number;
  tempLow: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  hourly: HourlyWeather[];
  tomorrow: DailyWeather | null;
  error?: string;
}

export interface TransitStop {
  stopId: string;
  routeName: string;
  direction: string;
  stopName: string;
}
