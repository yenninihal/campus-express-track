export interface Student {
  name: string;
  rollNumber: string;
  residence: string;
  route: string;
}

export interface Route {
  id: string;
  name: string;
  startingPoint: string;
  stops: { name: string; lat: number; lng: number }[];
  collegeStop: { name: string; lat: number; lng: number };
}

export interface Bus {
  id: string;
  routeId: string;
  driverName: string;
  currentLat: number;
  currentLng: number;
  speed: number;
  status: 'online' | 'offline' | 'en-route' | 'arrived';
  lastUpdated: string;
}

export const COLLEGE_LOCATION = { lat: 18.7357, lng: 84.0167, name: "AITAM College, Tekkali" };

export const students: Student[] = [
  { name: "AFREEN BANU", rollNumber: "25A51A0563", residence: "Amadalavalasa (Railway Station)", route: "AMADALAVALASA" },
  { name: "AMBATI SHARMILA", rollNumber: "25A51A0564", residence: "Amadalavalasa", route: "AMADALAVALASA" },
  { name: "ARASAVILLI AKSHAYA", rollNumber: "25A51A0565", residence: "Bendigate", route: "BENDIGATE" },
  { name: "KIRAN KUMAR", rollNumber: "25A51A0566", residence: "Srikakulam", route: "SRIKAKULAM" },
  { name: "RAVI TEJA", rollNumber: "25A51A0567", residence: "Narasannapeta", route: "NARASANNAPETA" },
  { name: "PRIYA SHARMA", rollNumber: "25A51A0568", residence: "Palasa", route: "PALASA" },
  { name: "SURESH BABU", rollNumber: "25A51A0569", residence: "Rajam", route: "RAJAM" },
  { name: "LAKSHMI DEVI", rollNumber: "25A51A0570", residence: "Tekkali", route: "TEKKALI" },
];

export const routes: Route[] = [
  {
    id: "AMADALAVALASA",
    name: "Amadalavalasa",
    startingPoint: "Railway Station",
    stops: [
      { name: "Amadalavalasa Railway Station", lat: 18.4103, lng: 83.8996 },
      { name: "Amadalavalasa Bus Stand", lat: 18.4120, lng: 83.9020 },
      { name: "Ponduru", lat: 18.3510, lng: 83.7670 },
    ],
    collegeStop: COLLEGE_LOCATION,
  },
  {
    id: "BENDIGATE",
    name: "Bendigate",
    startingPoint: "Bendigate",
    stops: [
      { name: "Bendigate", lat: 18.5000, lng: 83.9500 },
      { name: "Narasannapeta Cross", lat: 18.4200, lng: 84.0400 },
    ],
    collegeStop: COLLEGE_LOCATION,
  },
  {
    id: "SRIKAKULAM",
    name: "Srikakulam",
    startingPoint: "Arasavalli",
    stops: [
      { name: "Arasavalli Temple", lat: 18.2949, lng: 83.9189 },
      { name: "Srikakulam Bus Stand", lat: 18.2960, lng: 83.8970 },
      { name: "Amudalavalasa Junction", lat: 18.4103, lng: 83.8996 },
    ],
    collegeStop: COLLEGE_LOCATION,
  },
  {
    id: "NARASANNAPETA",
    name: "Narasannapeta",
    startingPoint: "Peddapeta Junction",
    stops: [
      { name: "Peddapeta Junction", lat: 18.4140, lng: 84.0440 },
      { name: "Narasannapeta Town", lat: 18.4150, lng: 84.0450 },
    ],
    collegeStop: COLLEGE_LOCATION,
  },
  {
    id: "PALASA",
    name: "Palasa",
    startingPoint: "College Road Junction",
    stops: [
      { name: "Palasa College Road", lat: 18.7700, lng: 84.4100 },
      { name: "Palasa Bus Stand", lat: 18.7730, lng: 84.4050 },
    ],
    collegeStop: COLLEGE_LOCATION,
  },
  {
    id: "RAJAM",
    name: "Rajam",
    startingPoint: "Durga Temple",
    stops: [
      { name: "Rajam Durga Temple", lat: 18.4500, lng: 83.6400 },
      { name: "Rajam Town", lat: 18.4550, lng: 83.6450 },
    ],
    collegeStop: COLLEGE_LOCATION,
  },
  {
    id: "TEKKALI",
    name: "Tekkali",
    startingPoint: "OBS",
    stops: [
      { name: "Tekkali OBS", lat: 18.6050, lng: 84.2350 },
      { name: "Tekkali Center", lat: 18.6000, lng: 84.2300 },
    ],
    collegeStop: COLLEGE_LOCATION,
  },
];

export const buses: Bus[] = routes.map((route, i) => ({
  id: `BUS-${String(i + 1).padStart(3, '0')}`,
  routeId: route.id,
  driverName: `Driver ${i + 1}`,
  currentLat: route.stops[0].lat + (Math.random() * 0.1 - 0.05),
  currentLng: route.stops[0].lng + (Math.random() * 0.1 - 0.05),
  speed: 30 + Math.floor(Math.random() * 20),
  status: 'en-route' as const,
  lastUpdated: new Date().toISOString(),
}));

export function getStudentByRollNumber(rollNumber: string): Student | undefined {
  return students.find(s => s.rollNumber.toLowerCase() === rollNumber.toLowerCase());
}

export function getRouteById(routeId: string): Route | undefined {
  return routes.find(r => r.id === routeId);
}

export function getBusByRoute(routeId: string): Bus | undefined {
  return buses.find(b => b.routeId === routeId);
}

export function calculateETA(bus: Bus, stopLat: number, stopLng: number): number {
  const R = 6371;
  const dLat = ((stopLat - bus.currentLat) * Math.PI) / 180;
  const dLng = ((stopLng - bus.currentLng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(bus.currentLat * Math.PI / 180) * Math.cos(stopLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const speedKmPerMin = bus.speed / 60;
  return Math.max(1, Math.round(distance / speedKmPerMin));
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
