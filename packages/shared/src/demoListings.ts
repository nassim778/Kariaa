import { Listing } from "./types";

/**
 * Bundled demo dataset — mirrors supabase/schema.sql seed rows.
 * Used automatically when Supabase env vars are not configured, so the app
 * runs end-to-end with zero backend setup.
 */
export const DEMO_LISTINGS: Listing[] = [
  { id: "d1", title: "Appartement lumineux à La Marsa", description: "Bel appartement proche de la plage, récemment rénové.", type: "apartment", price: 1200, bedrooms: 2, bathrooms: 1, area_sqm: 95, governorate: "Tunis", delegation: "La Marsa", address: "Avenue Habib Bourguiba, La Marsa", image_urls: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"], phone: "+216 20 111 001", lat: 36.8783, lng: 10.3247 },
  { id: "d2", title: "Studio moderne au Lac 2", description: "Studio meublé idéal pour jeune actif, résidence sécurisée.", type: "studio", price: 850, bedrooms: 1, bathrooms: 1, area_sqm: 45, governorate: "Tunis", delegation: "Les Berges du Lac", address: "Rue du Lac Turkana, Lac 2", image_urls: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"], phone: "+216 22 222 002", lat: 36.8425, lng: 10.2680 },
  { id: "d3", title: "Villa avec jardin à Sidi Bou Said", description: "Villa spacieuse avec jardin et vue mer partielle.", type: "villa", price: 3500, bedrooms: 4, bathrooms: 3, area_sqm: 260, governorate: "Tunis", delegation: "Sidi Bou Said", address: "Rue Sidi Dhrif, Sidi Bou Said", image_urls: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"], lat: 36.8700, lng: 10.3470 },
  { id: "d4", title: "Appartement familial à Ariana", description: "Grand appartement 3 chambres proche écoles et commerces.", type: "apartment", price: 1400, bedrooms: 3, bathrooms: 2, area_sqm: 130, governorate: "Ariana", delegation: "Ariana Ville", address: "Avenue de l Independance, Ariana", image_urls: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"], lat: 36.8625, lng: 10.1956 },
  { id: "d5", title: "Maison à Menzah 6", description: "Maison de charme dans quartier calme et résidentiel.", type: "house", price: 2200, bedrooms: 3, bathrooms: 2, area_sqm: 180, governorate: "Ariana", delegation: "El Menzah", address: "Rue de Rome, Menzah 6", image_urls: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"], lat: 36.8380, lng: 10.1720 },
  { id: "d6", title: "Studio étudiant au centre-ville", description: "Studio compact près de la station de métro, idéal étudiant.", type: "studio", price: 600, bedrooms: 1, bathrooms: 1, area_sqm: 35, governorate: "Tunis", delegation: "Tunis Centre", address: "Avenue de Paris, Tunis", image_urls: ["https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800"], lat: 36.8008, lng: 10.1817 },
  { id: "d7", title: "Appartement neuf à Ennasr", description: "Appartement neuf dans résidence avec parking et ascenseur.", type: "apartment", price: 1100, bedrooms: 2, bathrooms: 1, area_sqm: 105, governorate: "Ariana", delegation: "Ennasr", address: "Rue Ibn Khaldoun, Ennasr 2", image_urls: ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"], lat: 36.8540, lng: 10.1650 },
  { id: "d8", title: "Villa de standing aux Berges du Lac", description: "Villa haut de gamme avec piscine, quartier prisé.", type: "villa", price: 5000, bedrooms: 5, bathrooms: 4, area_sqm: 400, governorate: "Tunis", delegation: "Les Berges du Lac", address: "Rue du Lac Victoria, Lac 1", image_urls: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"], lat: 36.8330, lng: 10.2450 },
  { id: "d9", title: "Chambre meublée à El Manar", description: "Chambre en colocation, proche université El Manar.", type: "room", price: 400, bedrooms: 1, bathrooms: 1, area_sqm: 20, governorate: "Tunis", delegation: "El Manar", address: "Campus El Manar, Tunis", image_urls: ["https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800"], lat: 36.8380, lng: 10.1450 },
  { id: "d10", title: "Bureau open-space au Lac 1", description: "Plateau de bureaux modulable, fibre optique.", type: "office", price: 2800, bedrooms: 1, bathrooms: 2, area_sqm: 150, governorate: "Tunis", delegation: "Les Berges du Lac", address: "Rue du Lac Malaren, Lac 1", image_urls: ["https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800"], lat: 36.8290, lng: 10.2380 },
  { id: "d11", title: "Appartement vue mer à Gammarth", description: "Terrasse avec vue sur la mer, résidence balnéaire.", type: "apartment", price: 1800, bedrooms: 2, bathrooms: 2, area_sqm: 120, governorate: "Tunis", delegation: "Gammarth", address: "Route de Gammarth, La Marsa", image_urls: ["https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800"], lat: 36.9180, lng: 10.2870 },
  { id: "d12", title: "Maison traditionnelle à la Médina", description: "Dar authentique restaurée au cœur de la Médina de Tunis.", type: "house", price: 1600, bedrooms: 3, bathrooms: 2, area_sqm: 160, governorate: "Tunis", delegation: "Médina", address: "Rue Sidi Ben Arous, Médina", image_urls: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"], lat: 36.7980, lng: 10.1710 },
  { id: "d13", title: "Studio à Bardo", description: "Studio propre et bien situé proche du musée du Bardo.", type: "studio", price: 550, bedrooms: 1, bathrooms: 1, area_sqm: 40, governorate: "Tunis", delegation: "Le Bardo", address: "Avenue Habib Bourguiba, Le Bardo", image_urls: ["https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"], lat: 36.8090, lng: 10.1400 },
  { id: "d14", title: "Appartement à Mutuelleville", description: "Appartement bourgeois, hauts plafonds, quartier central.", type: "apartment", price: 1500, bedrooms: 3, bathrooms: 2, area_sqm: 140, governorate: "Tunis", delegation: "Mutuelleville", address: "Rue de Palestine, Mutuelleville", image_urls: ["https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800"], lat: 36.8190, lng: 10.1720 },
  { id: "d15", title: "Villa avec piscine à Soukra", description: "Villa récente avec grand jardin et piscine.", type: "villa", price: 3200, bedrooms: 4, bathrooms: 3, area_sqm: 300, governorate: "Ariana", delegation: "La Soukra", address: "Route de la Soukra, Ariana", image_urls: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"], lat: 36.8720, lng: 10.2360 },
];

const R = 6371000; // earth radius, metres

/** Great-circle distance in metres between two lat/lng points. */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
