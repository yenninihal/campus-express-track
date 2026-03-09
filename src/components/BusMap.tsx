import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bus, Route, COLLEGE_LOCATION } from "@/data/mockData";

interface BusMapProps {
  route?: Route;
  bus?: Bus;
  className?: string;
  showAllRoutes?: boolean;
  allBuses?: Bus[];
  allRoutes?: Route[];
}

const busIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><rect x="3" y="3" width="18" height="14" rx="3" fill="%23f5c518"/><rect x="5" y="5" width="5" height="5" rx="1" fill="%23fff"/><rect x="14" y="5" width="5" height="5" rx="1" fill="%23fff"/><rect x="5" y="17" width="4" height="4" rx="2" fill="%23333"/><rect x="15" y="17" width="4" height="4" rx="2" fill="%23333"/><rect x="10" y="12" width="4" height="2" rx="1" fill="%23e6a800"/></svg>`;

const collegeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb" width="28" height="28"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>`;

const stopIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e67e22" width="20" height="20"><circle cx="12" cy="12" r="8" fill="%23e67e22" stroke="%23fff" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="%23fff"/></svg>`;

const createIcon = (svg: string, size: [number, number]) =>
  L.divIcon({
    html: svg,
    className: "",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });

const BusMap = ({ route, bus, className = "", showAllRoutes, allBuses, allRoutes }: BusMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([COLLEGE_LOCATION.lat, COLLEGE_LOCATION.lng], 10);
    mapInstanceRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Google Satellite Hybrid layer (satellite + roads/labels)
    L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: '&copy; Google Maps',
      maxZoom: 20,
    }).addTo(map);

    // College marker
    L.marker([COLLEGE_LOCATION.lat, COLLEGE_LOCATION.lng], {
      icon: createIcon(collegeIconSvg, [28, 28]),
    })
      .addTo(map)
      .bindPopup(`<strong>${COLLEGE_LOCATION.name}</strong>`);

    if (showAllRoutes && allBuses && allRoutes) {
      allBuses.forEach((b) => {
        L.marker([b.currentLat, b.currentLng], {
          icon: createIcon(busIconSvg, [32, 32]),
        })
          .addTo(map)
          .bindPopup(`<strong>${b.id}</strong><br/>Route: ${b.routeId}<br/>Speed: ${b.speed} km/h`);
      });
    } else if (route) {
      // Draw route line
      const points: L.LatLngExpression[] = [
        ...route.stops.map((s) => [s.lat, s.lng] as L.LatLngExpression),
        [route.collegeStop.lat, route.collegeStop.lng],
      ];

      L.polyline(points, {
        color: "#4285F4",
        weight: 5,
        opacity: 0.85,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);

      // Add a subtle outline for the route
      L.polyline(points, {
        color: "#1a53b5",
        weight: 8,
        opacity: 0.3,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);

      // Stop markers
      route.stops.forEach((stop) => {
        L.marker([stop.lat, stop.lng], {
          icon: createIcon(stopIconSvg, [20, 20]),
        })
          .addTo(map)
          .bindPopup(`<strong>${stop.name}</strong>`);
      });

      // Bus marker
      if (bus) {
        const busMarker = L.marker([bus.currentLat, bus.currentLng], {
          icon: createIcon(busIconSvg, [36, 36]),
        })
          .addTo(map)
          .bindPopup(`<strong>${bus.id}</strong><br/>Speed: ${bus.speed} km/h<br/>Driver: ${bus.driverName}`);
        busMarker.openPopup();
      }

      // Fit bounds
      const bounds = L.latLngBounds(points);
      if (bus) bounds.extend([bus.currentLat, bus.currentLng]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [route, bus, showAllRoutes, allBuses, allRoutes]);

  return <div ref={mapRef} className={`w-full rounded-xl overflow-hidden ${className}`} style={{ minHeight: 350 }} />;
};

export default BusMap;
