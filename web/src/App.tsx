import { useEffect, useState, useCallback, useRef } from 'react';
import * as FlightTypes from './types/flightTypes';
import axios from 'axios';
import imagePLaceholder from './assets/placeholder-plane.png';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useMediaQuery } from 'react-responsive';

function App() {
  const [data, setData] = useState<FlightTypes.FlightData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const src = data?.plane?.url_photo ?? imagePLaceholder;
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setLastUpdated(new Date());
    try {
      setError(null);
      const res = await axios.get<FlightTypes.FlightData>('/api/flights');
      console.log('Response from server:', res.data);
      const newData = res.data;

      setData((prevData) => {
        if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
          return newData;
        } else {
          return prevData;
        }
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.log('Error fetching flights:', err.message);
        setError(err.message);
        setData(null);
      } else {
        console.error('Unknown error', err);
        setError('Unknown error');
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, 30000);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  useEffect(() => setImageLoaded(false), [src]);

  const setContainerWidth = () => {
    if (window.innerWidth <= 767) {
      // Skip on mobile / tablet
      return;
    }
    if (imgRef.current) {
      const container = imgRef.current.parentElement;
      if (container) {
        container.style.width = `${imgRef.current.offsetWidth}px`;
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: '100%',
        overflowWrap: 'break-word',
        padding: isMobile ? '1rem' : '2rem',
      }}
    >
      <h1>What's flying over me?</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data?.plane ? (
        <div
          className="plane-container"
          style={{ border: '1px solid #f0f0f0', padding: '1rem' }}
        >
          <div className="responsive-img-container">
            <img
              className={`plane-img ${imageLoaded ? 'visible' : ''}`}
              src={src}
              alt="Aircraft"
              key={src}
              ref={imgRef}
              loading="lazy"
              decoding="async"
              onLoad={() => {
                setImageLoaded(true);
                setContainerWidth();
              }}
              onError={() => {
                setImageLoaded(true);
                setContainerWidth();
              }}
            />

            {!imageLoaded && (
              <div className="skeleton-overlay">
                <Skeleton
                  containerClassName="skeleton-fill"
                  baseColor="#292727ff"
                  highlightColor="#f4f4f4"
                  height={isMobile ? 200 : 350}
                  width="100%"
                />
              </div>
            )}
          </div>
          <div className="plane-info">
            <div className="plane-owner">{`${data.plane.registered_owner} ${data.callsign}`}</div>
            <div>
              <label>Route: </label>
              {data.route && data.route?.length > 0 ? (
                <>
                  {data.route[0].location} ({data.route[0].countryiso2}) to{' '}
                  {data.route[1].location} ({data.route[1].countryiso2})
                </>
              ) : (
                <i>No route information available</i>
              )}
            </div>
            <div>
              <label>Aircraft: </label>
              {data.plane?.manufacturer} {data.plane.type}
            </div>
            <div>
              <br />
              {data?.flyover_count === 1 || data?.flyover_count === 0 ? (
                <>This is the first time seeing this plane.</>
              ) : (
                <>
                  We have seen this plane {data?.flyover_count ?? 0} times,
                  {(data?.flyover_count ?? 0) > 1 &&
                    (data?.last_flyover_ended_at
                      ? ' last seen: ' +
                        new Date(data.last_flyover_ended_at).toLocaleDateString(
                          'fi-FI',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: undefined,
                            hour12: false,
                          }
                        ) +
                        '.'
                      : '')}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p>{data?.message}</p>
      )}
      <div>
        {loading ? (
          <div>Fetching data...</div>
        ) : (
          <div>Last checked: {lastUpdated?.toLocaleTimeString('fi-FI')}</div>
        )}
      </div>
    </div>
  );
}

export default App;
