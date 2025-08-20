export interface FlightData {
  callsign: string;
  plane: Plane | null; // or a proper Plane[] type if you define it
  route: Routes[] | null;
  flyover_count?: number; // Optional, only if you want to include it
  last_flyover_ended_at?: number; // Optional, for tracking when the data was last fetched
  message?: string;
}

export interface Routes {
  alt_feet: number;
  alt_meters: number;
  countryiso2: string;
  iata: string;
  icao: string;
  lat: number;
  location: string;
  lon: number;
  name: string;
}

export type Plane = {
  type: string;
  icao_type: string;
  manufacturer: string;
  mode_s: string;
  registration: string;
  registered_owner_country_iso_name: string;
  registered_owner_country_name: string;
  registered_owner_operator_flag_code: string;
  registered_owner: string;
  url_photo: string;
  url_photo_thumbnail: string;
};
