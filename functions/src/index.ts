import { setGlobalOptions } from 'firebase-functions';
import express, { Request, Response } from 'express';
import axios from 'axios';
import { recordFlyover, getFlyoverCount, getLastFlyoverEndedAt } from './db.js';
import * as functions from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';

const coordLat = defineSecret('COORD_LAT');
const coordLon = defineSecret('COORD_LON');

setGlobalOptions({ maxInstances: 10 });

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('OpenSky API backend is running');
});

app.get('/api/flights', async (req: Request, res: Response) => {
  let adsbLolDown = false;
  let response;
  const latitude = coordLat.value();
  const longitude = coordLon.value();

  try {
    response = await axios.get(
      `https://api.adsb.lol/v2/lat/${latitude}/lon/${longitude}/dist/3`
    );
  } catch (err: any) {
    console.error(
      'Error from api.adsb.lol',
      err?.response?.data || err.message
    );
    adsbLolDown = true;
    try {
      console.error('api.adsb.lol API is down, trying opendata.adsb.fi...');
      response = await axios.get(
        `https://opendata.adsb.fi/api/v2/lat/${latitude}/lon/${longitude}/dist/3`
      );
    } catch (err: any) {
      console.error(
        'Error from opendata.adsb.fi',
        err?.response?.data || err.message
      );
      res.status(500).json({
        error: 'Failed to fetch data, one of the APIs is probably down.',
      });
    }
  }
  if ((adsbLolDown ? response?.data.resultCount : response?.data.total) === 0) {
    res.status(200).json({
      planes: [],
      aircraft: null,
      route: null,
      message: 'No planes currently in the area',
    });
    return;
  }

  let callsign = '';
  let hex = '';
  let message = '';
  let plane = null;

  if (!adsbLolDown) {
    callsign = response?.data.ac[0].flight.trim();
    hex = response?.data.ac[0].hex;
  } else {
    callsign = response?.data.aircraft[0].flight.trim();
    hex = response?.data.aircraft[0].hex;
    console.warn('Using fallback callsign:', callsign);
  }

  console.log('callsign', callsign);
  console.log('hex', hex);

  try {
    const aircraftResponse = await axios.get(
      `https://api.adsbdb.com/v0/aircraft/${hex}`
    );
    plane = aircraftResponse.data?.response?.aircraft ?? null;

    if (!plane) {
      console.warn(`No aircraft data found for hex: ${hex}`);
    }
  } catch (error: any) {
    message = `There's a plane but couldn't fetch data for it 
      (call sign: ${callsign})`;
    console.error(
      `Failed to fetch aircraft data for hex: ${hex}`,
      error.message
    );
  }

  let route = null; // Initialize route as null
  try {
    // Fetch route data from ADSBdb
    const routeFromAdsb = await axios.post(
      'https://api.adsb.lol/api/0/routeset',
      {
        planes: [
          {
            callsign: callsign,
            lat: 0,
            lng: 0,
          },
        ],
      }
    );
    route = routeFromAdsb.data[0]._airports;

    if (!route || route.length === 0) {
      message = `No route data found for plane with call sign: ${callsign}`;
    }
  } catch (error: any) {
    message = `Failed to fetch route data for plane with 
      call sign: ${callsign}`;
    console.error(
      `Failed to fetch route data for plane with call sign: ${callsign}`,
      error.message
    );
  }
  await recordFlyover({ hex: hex, aircraft: plane });
  res.json({
    callsign,
    plane,
    route,
    flyover_count: await getFlyoverCount(hex),
    last_flyover_ended_at: await getLastFlyoverEndedAt(hex),
    message: message,
  });
});

// Export the Express app as a Firebase HTTPS function
export const api = functions.https.onRequest(
  { secrets: [coordLat, coordLon] },
  app
);
