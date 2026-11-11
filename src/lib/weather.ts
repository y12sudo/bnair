import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { IconName } from '../components/ui';

export interface Weather {
  temp: number;
  high: number;
  low: number;
  code: number;
  label: string;
  icon: IconName;
  place?: string;
}

/** WMO weather codes → short label + icon. */
function describe(code: number): { label: string; icon: IconName } {
  if (code === 0) return { label: 'Clear', icon: 'sunny' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'partly-sunny' };
  if (code === 3) return { label: 'Overcast', icon: 'cloudy' };
  if (code <= 48) return { label: 'Foggy', icon: 'cloud' };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Rain', icon: 'rainy' };
  if (code <= 77 || code === 85 || code === 86) return { label: 'Snow', icon: 'snow' };
  if (code >= 95) return { label: 'Storms', icon: 'thunderstorm' };
  return { label: 'Cloudy', icon: 'cloudy' };
}

export function isRainy(w: Weather) {
  return (w.code >= 51 && w.code <= 67) || (w.code >= 80 && w.code <= 82) || w.code >= 95;
}

/** A one-line styling nudge based on the forecast. */
export function styleTip(w: Weather): string {
  if (w.high <= 8) return 'Cold one. Your warmest layer is in the mix.';
  if (isRainy(w)) return 'Rain on the way. Pick shoes you don’t mind getting wet.';
  if (w.high <= 16) return 'Cool day. Shuffle adds a layer.';
  if (w.high >= 27) return 'Hot out. Keep it light, skip the jacket.';
  return 'Mild weather. Anything goes.';
}

type State = { status: 'loading' } | { status: 'ready'; weather: Weather } | { status: 'unavailable' };

/**
 * Today's weather from Open-Meteo (free, no key). Uses the phone's coarse
 * location; if permission is denied or offline the card simply hides.
 */
export function useWeather(): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) throw new Error('denied');
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
        const { latitude, longitude } = pos.coords;
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}` +
          '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        let place: string | undefined;
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
          place = geo?.city ?? geo?.subregion ?? undefined;
        } catch {
          // Place name is optional.
        }
        const code = Number(j.current.weather_code);
        if (alive)
          setState({
            status: 'ready',
            weather: {
              temp: Math.round(j.current.temperature_2m),
              high: Math.round(j.daily.temperature_2m_max[0]),
              low: Math.round(j.daily.temperature_2m_min[0]),
              code,
              place,
              ...describe(code),
            },
          });
      } catch {
        if (alive) setState({ status: 'unavailable' });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
