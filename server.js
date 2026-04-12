const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Astronomy = require('astronomy-engine');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const INDEX_FILE = path.join(ROOT, 'index.html');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

/* ═══════════════════════════════════════════════
   Vedic Astrology Constants
   ═══════════════════════════════════════════════ */

// 12 Rashis (Vedic sidereal signs) with their lords
const RASHIS = [
  { name: 'Mesha (Aries)',       lord: 'Mars',    element: 'Fire',  quality: 'Movable',  symbol: '♈' },
  { name: 'Vrishabha (Taurus)',  lord: 'Venus',   element: 'Earth', quality: 'Fixed',     symbol: '♉' },
  { name: 'Mithuna (Gemini)',    lord: 'Mercury', element: 'Air',   quality: 'Dual',      symbol: '♊' },
  { name: 'Karka (Cancer)',      lord: 'Moon',    element: 'Water', quality: 'Movable',   symbol: '♋' },
  { name: 'Simha (Leo)',         lord: 'Sun',     element: 'Fire',  quality: 'Fixed',     symbol: '♌' },
  { name: 'Kanya (Virgo)',       lord: 'Mercury', element: 'Earth', quality: 'Dual',      symbol: '♍' },
  { name: 'Tula (Libra)',        lord: 'Venus',   element: 'Air',   quality: 'Movable',   symbol: '♎' },
  { name: 'Vrishchika (Scorpio)',lord: 'Mars',    element: 'Water', quality: 'Fixed',     symbol: '♏' },
  { name: 'Dhanu (Sagittarius)', lord: 'Jupiter', element: 'Fire',  quality: 'Dual',      symbol: '♐' },
  { name: 'Makara (Capricorn)',  lord: 'Saturn',  element: 'Earth', quality: 'Movable',   symbol: '♑' },
  { name: 'Kumbha (Aquarius)',   lord: 'Saturn',  element: 'Air',   quality: 'Fixed',     symbol: '♒' },
  { name: 'Meena (Pisces)',      lord: 'Jupiter', element: 'Water', quality: 'Dual',      symbol: '♓' }
];

// 27 Nakshatras with ruling planets & deity
const NAKSHATRAS = [
  { name: 'Ashwini',       lord: 'Ketu',    deity: 'Ashwini Kumaras' },
  { name: 'Bharani',       lord: 'Venus',   deity: 'Yama' },
  { name: 'Krittika',      lord: 'Sun',     deity: 'Agni' },
  { name: 'Rohini',        lord: 'Moon',    deity: 'Brahma' },
  { name: 'Mrigashira',    lord: 'Mars',    deity: 'Soma' },
  { name: 'Ardra',         lord: 'Rahu',    deity: 'Rudra' },
  { name: 'Punarvasu',     lord: 'Jupiter', deity: 'Aditi' },
  { name: 'Pushya',        lord: 'Saturn',  deity: 'Brihaspati' },
  { name: 'Ashlesha',      lord: 'Mercury', deity: 'Sarpa' },
  { name: 'Magha',         lord: 'Ketu',    deity: 'Pitris' },
  { name: 'Purva Phalguni',lord: 'Venus',   deity: 'Bhaga' },
  { name: 'Uttara Phalguni',lord:'Sun',     deity: 'Aryaman' },
  { name: 'Hasta',         lord: 'Moon',    deity: 'Savitar' },
  { name: 'Chitra',        lord: 'Mars',    deity: 'Tvashtar' },
  { name: 'Swati',         lord: 'Rahu',    deity: 'Vayu' },
  { name: 'Vishakha',      lord: 'Jupiter', deity: 'Indra-Agni' },
  { name: 'Anuradha',      lord: 'Saturn',  deity: 'Mitra' },
  { name: 'Jyeshtha',      lord: 'Mercury', deity: 'Indra' },
  { name: 'Mula',          lord: 'Ketu',    deity: 'Nirriti' },
  { name: 'Purva Ashadha', lord: 'Venus',   deity: 'Apas' },
  { name: 'Uttara Ashadha',lord: 'Sun',     deity: 'Vishvedevas' },
  { name: 'Shravana',      lord: 'Moon',    deity: 'Vishnu' },
  { name: 'Dhanishta',     lord: 'Mars',    deity: 'Vasus' },
  { name: 'Shatabhisha',   lord: 'Rahu',    deity: 'Varuna' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter', deity: 'Ajaikapada' },
  { name: 'Uttara Bhadrapada',lord:'Saturn', deity: 'Ahirbudhnya' },
  { name: 'Revati',        lord: 'Mercury', deity: 'Pushan' }
];

// Vimshottari Dasha order and periods (in years)
const DASHA_SEQUENCE = [
  { planet: 'Ketu',    years: 7 },
  { planet: 'Venus',   years: 20 },
  { planet: 'Sun',     years: 6 },
  { planet: 'Moon',    years: 10 },
  { planet: 'Mars',    years: 7 },
  { planet: 'Rahu',    years: 18 },
  { planet: 'Jupiter', years: 16 },
  { planet: 'Saturn',  years: 19 },
  { planet: 'Mercury', years: 17 }
];

// 27 Yogas
const YOGAS = [
  'Vishkumbha','Preeti','Ayushman','Saubhagya','Shobhana','Atiganda',
  'Sukarma','Dhriti','Shoola','Ganda','Vriddhi','Dhruva',
  'Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyan',
  'Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla',
  'Brahma','Indra','Vaidhriti'
];

// 11 Karanas (repeating pattern)
const KARANAS = [
  'Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti',
  'Shakuni','Chatushpada','Nagava','Kimstughna'
];

// 15 Tithis
const TITHIS = [
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashthi','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima/Amavasya'
];

// Major Indian cities with coordinates (fallback for geocoding)
const INDIAN_CITIES = {
  'delhi':     { lat: 28.6139, lon: 77.2090 },
  'new delhi': { lat: 28.6139, lon: 77.2090 },
  'mumbai':    { lat: 19.0760, lon: 72.8777 },
  'bombay':    { lat: 19.0760, lon: 72.8777 },
  'kolkata':   { lat: 22.5726, lon: 88.3639 },
  'calcutta':  { lat: 22.5726, lon: 88.3639 },
  'chennai':   { lat: 13.0827, lon: 80.2707 },
  'madras':    { lat: 13.0827, lon: 80.2707 },
  'bangalore': { lat: 12.9716, lon: 77.5946 },
  'bengaluru': { lat: 12.9716, lon: 77.5946 },
  'hyderabad': { lat: 17.3850, lon: 78.4867 },
  'ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'pune':      { lat: 18.5204, lon: 73.8567 },
  'jaipur':    { lat: 26.9124, lon: 75.7873 },
  'lucknow':   { lat: 26.8467, lon: 80.9462 },
  'kanpur':    { lat: 26.4499, lon: 80.3319 },
  'nagpur':    { lat: 21.1458, lon: 79.0882 },
  'indore':    { lat: 22.7196, lon: 75.8577 },
  'bhopal':    { lat: 23.2599, lon: 77.4126 },
  'patna':     { lat: 25.6093, lon: 85.1376 },
  'vadodara':  { lat: 22.3072, lon: 73.1812 },
  'surat':     { lat: 21.1702, lon: 72.8311 },
  'varanasi':  { lat: 25.3176, lon: 82.9739 },
  'agra':      { lat: 27.1767, lon: 78.0081 },
  'chandigarh':{ lat: 30.7333, lon: 76.7794 },
  'amritsar':  { lat: 31.6340, lon: 74.8723 },
  'coimbatore': { lat: 11.0168, lon: 76.9558 },
  'visakhapatnam': { lat: 17.6868, lon: 83.2185 },
  'bhubaneswar': { lat: 20.2961, lon: 85.8245 },
  'dehradun':  { lat: 30.3165, lon: 78.0322 },
  'ranchi':    { lat: 23.3441, lon: 85.3096 },
  'guwahati':  { lat: 26.1445, lon: 91.7362 },
  'thiruvananthapuram': { lat: 8.5241, lon: 76.9366 },
  'kochi':     { lat: 9.9312, lon: 76.2673 },
  'noida':     { lat: 28.5355, lon: 77.3910 },
  'gurgaon':   { lat: 28.4595, lon: 77.0266 },
  'gurugram':  { lat: 28.4595, lon: 77.0266 },
  'faridabad': { lat: 28.4089, lon: 77.3178 },
  'ghaziabad': { lat: 28.6692, lon: 77.4538 },
  'meerut':    { lat: 28.9845, lon: 77.7064 },
  'jodhpur':   { lat: 26.2389, lon: 73.0243 },
  'udaipur':   { lat: 24.5854, lon: 73.7125 },
  'shimla':    { lat: 31.1048, lon: 77.1734 },
  'srinagar':  { lat: 34.0837, lon: 74.7973 },
  'jammu':     { lat: 32.7266, lon: 74.8570 },
  'mysore':    { lat: 12.2958, lon: 76.6394 },
  'mysuru':    { lat: 12.2958, lon: 76.6394 },
  'mangalore': { lat: 12.9141, lon: 74.8560 },
  'raipur':    { lat: 21.2514, lon: 81.6296 },
  'goa':       { lat: 15.2993, lon: 74.1240 },
  'pondicherry': { lat: 11.9416, lon: 79.8083 },
  'london':    { lat: 51.5074, lon: -0.1278 },
  'new york':  { lat: 40.7128, lon: -74.0060 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'toronto':   { lat: 43.6532, lon: -79.3832 },
  'dubai':     { lat: 25.2048, lon: 55.2708 },
  'singapore': { lat: 1.3521, lon: 103.8198 },
  'sydney':    { lat: -33.8688, lon: 151.2093 },
};

/* ═══════════════════════════════════════════════
   Geocoding — Nominatim with local fallback
   ═══════════════════════════════════════════════ */
function geocodeCity(cityName) {
  return new Promise((resolve) => {
    // Check local cache first
    const key = cityName.toLowerCase().trim();
    if (INDIAN_CITIES[key]) {
      return resolve(INDIAN_CITIES[key]);
    }

    // Try Nominatim (OpenStreetMap) — 1 req/sec, requires User-Agent
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
    const req = https.get(url, {
      headers: { 'User-Agent': 'AstroBrahmvid/1.0 (vedic-kundli)' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) });
          } else {
            // Default to Delhi if not found
            resolve({ lat: 28.6139, lon: 77.2090 });
          }
        } catch {
          resolve({ lat: 28.6139, lon: 77.2090 });
        }
      });
    });
    req.on('error', () => resolve({ lat: 28.6139, lon: 77.2090 }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ lat: 28.6139, lon: 77.2090 }); });
  });
}

/* ═══════════════════════════════════════════════
   Astronomical Computations (astronomy-engine)
   ═══════════════════════════════════════════════ */

// Lahiri Ayanamsa for a given Julian Day  (Chitrapaksha)
function lahiriAyanamsa(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.856111 + 1.3971667 * T + 0.0003086 * T * T;
}

// Normalize angle to 0-360
function normDeg(d) { return ((d % 360) + 360) % 360; }

// Rashi index from sidereal longitude (0-11)
function rashiIndex(sidLon) { return Math.floor(normDeg(sidLon) / 30); }

// Nakshatra index from sidereal longitude (0-26)
function nakshatraIndex(sidLon) { return Math.floor(normDeg(sidLon) / (360 / 27)); }

// Pada (1-4) within a nakshatra
function padaNumber(sidLon) {
  const nakshatraSpan = 360 / 27;
  const posInNakshatra = normDeg(sidLon) % nakshatraSpan;
  return Math.floor(posInNakshatra / (nakshatraSpan / 4)) + 1;
}

// Degree position within rashi
function degreeInRashi(sidLon) { return (normDeg(sidLon) % 30).toFixed(2); }

/**
 * Compute Lagna (Ascendant) from LST, latitude, and obliquity.
 * This is the standard formula: tan(Asc) = cos(LST) / -(sin(ε)tan(φ) + cos(ε)sin(LST))
 */
function computeAscendant(gmstHours, geoLon, geoLat, obliquityDeg) {
  const lstHours = (gmstHours + geoLon / 15.0) % 24;
  const lstRad = (lstHours * 15.0) * Math.PI / 180;
  const latRad = geoLat * Math.PI / 180;
  const oblRad = obliquityDeg * Math.PI / 180;

  let ascRad = Math.atan2(
    Math.cos(lstRad),
    -(Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(lstRad))
  );
  let ascDeg = ascRad * 180 / Math.PI;
  return normDeg(ascDeg);
}

/**
 * Compute Rahu & Ketu mean node positions.
 * astronomy-engine doesn't provide lunar nodes directly,
 * so we use the standard mean node formula.
 */
function computeLunarNodes(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  // Mean ascending node (Rahu)
  let rahu = 125.0446 - 1934.1362891 * T + 0.0020754 * T * T;
  rahu = normDeg(rahu);
  const ketu = normDeg(rahu + 180);
  return { rahu, ketu };
}

/**
 * Get high-precision tropical ecliptic longitudes for all planets
 * using astronomy-engine (USNO-grade accuracy, ~1 arcminute).
 */
function getPlanetPositions(astroTime) {
  const sunPos = Astronomy.SunPosition(astroTime);
  const moonPos = Astronomy.EclipticGeoMoon(astroTime);

  // Planets available in astronomy-engine
  const planetNames = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const planets = {};

  planets.Sun = sunPos.elon;
  planets.Moon = moonPos.lon;

  for (const pName of planetNames) {
    planets[pName] = Astronomy.EclipticLongitude(pName, astroTime);
  }

  return planets;
}

/* ═══════════════════════════════════════════════
   Vimshottari Dasha from Moon Nakshatra
   ═══════════════════════════════════════════════ */
function computeDashaSequence(moonSiderealLon, dobDate) {
  const nakIdx = nakshatraIndex(moonSiderealLon);
  const nakshatra = NAKSHATRAS[nakIdx];
  const nakshatraLord = nakshatra.lord;

  let startIdx = DASHA_SEQUENCE.findIndex(d => d.planet === nakshatraLord);
  if (startIdx < 0) startIdx = 0;

  const nakshatraSpan = 360 / 27;
  const posInNak = normDeg(moonSiderealLon) % nakshatraSpan;
  const fractionElapsed = posInNak / nakshatraSpan;
  const firstDashaTotal = DASHA_SEQUENCE[startIdx].years;
  const firstDashaRemaining = firstDashaTotal * (1 - fractionElapsed);

  const dashas = [];
  let currentDate = new Date(dobDate);

  // First (partial) dasha
  const endFirst = new Date(currentDate);
  endFirst.setFullYear(endFirst.getFullYear() + Math.floor(firstDashaRemaining));
  endFirst.setMonth(endFirst.getMonth() + Math.round((firstDashaRemaining % 1) * 12));
  dashas.push({
    planet: DASHA_SEQUENCE[startIdx].planet,
    years: +firstDashaRemaining.toFixed(1),
    start: new Date(currentDate),
    end: new Date(endFirst)
  });
  currentDate = new Date(endFirst);

  for (let i = 1; i < 9; i++) {
    const idx = (startIdx + i) % 9;
    const d = DASHA_SEQUENCE[idx];
    const endDate = new Date(currentDate);
    endDate.setFullYear(endDate.getFullYear() + d.years);
    dashas.push({
      planet: d.planet,
      years: d.years,
      start: new Date(currentDate),
      end: new Date(endDate)
    });
    currentDate = new Date(endDate);
  }

  return dashas;
}

function currentDasha(dashas) {
  const now = new Date();
  for (const d of dashas) {
    if (now >= d.start && now <= d.end) return d;
  }
  return dashas[0];
}

/* ═══════════════════════════════════════════════
   Panchang Elements
   ═══════════════════════════════════════════════ */
function computePanchangElements(sunSidLon, moonSidLon) {
  const diff = normDeg(moonSidLon - sunSidLon);
  const tithiIdx = Math.floor(diff / 12) % 15;
  const karanaIdx = Math.floor(diff / 6) % 11;
  const yogaIdx = Math.floor((normDeg(sunSidLon) + normDeg(moonSidLon)) / (360 / 27)) % 27;

  return {
    tithi: TITHIS[tithiIdx],
    karana: KARANAS[karanaIdx],
    yoga: YOGAS[yogaIdx]
  };
}

/* ═══════════════════════════════════════════════
   Mangal Dosha (simplified house-based check)
   ═══════════════════════════════════════════════ */
function checkMangalDosha(marsHouseFromLagna) {
  // Mars in houses 1, 2, 4, 7, 8, or 12 from Lagna → Mangal Dosha
  return [1, 2, 4, 7, 8, 12].includes(marsHouseFromLagna);
}

/* ═══════════════════════════════════════════════
   Vedic Remedies by Rashi Lord
   ═══════════════════════════════════════════════ */
const VEDIC_REMEDIES = {
  Sun: [
    'Offer water (Arghya) to the Sun at sunrise while chanting Gayatri Mantra.',
    'Donate wheat, jaggery, or red cloth on Sundays.',
    'Chant "Om Hraam Hreem Hraum Sah Suryaya Namah" 108 times daily.'
  ],
  Moon: [
    'Wear a Pearl (Moti) or Moonstone on Monday after proper Prana Pratishtha.',
    'Chant "Om Shram Shreem Shraum Sah Chandraya Namah" 108 times.',
    'Fast on Mondays and offer milk to Shivling.'
  ],
  Mars: [
    'Chant Hanuman Chalisa daily, especially on Tuesdays.',
    'Donate red lentils (masoor dal), jaggery, or red cloth on Tuesdays.',
    'Wear a Red Coral (Moonga) on ring finger after astrological consultation.'
  ],
  Mercury: [
    'Chant "Om Bram Breem Braum Sah Budhaya Namah" 108 times on Wednesdays.',
    'Donate green moong dal, emerald-colored cloth, or green vegetables.',
    'Feed green grass to cows on Wednesday.'
  ],
  Jupiter: [
    'Chant "Om Gram Greem Graum Sah Gurave Namah" 108 times on Thursdays.',
    'Wear a Yellow Sapphire (Pukhraj) on index finger after proper rituals.',
    'Donate turmeric, yellow cloth, or bananas on Thursday.'
  ],
  Venus: [
    'Chant "Om Dram Dreem Draum Sah Shukraya Namah" 108 times on Fridays.',
    'Donate white rice, white cloth, or camphor on Friday.',
    'Worship Goddess Lakshmi and maintain cleanliness in your surroundings.'
  ],
  Saturn: [
    'Chant "Om Pram Preem Praum Sah Shanaischaraya Namah" 108 times on Saturdays.',
    'Donate black sesame seeds, mustard oil, or iron items on Saturday.',
    'Feed crows, help the elderly, and maintain discipline in daily routines.'
  ],
  Rahu: [
    'Chant "Om Bhram Bhreem Bhraum Sah Rahave Namah" 108 times.',
    'Donate coconut, blue or black cloth, or blankets on Saturdays.',
    'Keep a silver square piece in your wallet and avoid intoxicants.'
  ],
  Ketu: [
    'Chant "Om Stram Streem Straum Sah Ketave Namah" 108 times.',
    'Donate a brown or grey blanket or sesame seeds on Tuesdays/Saturdays.',
    'Worship Lord Ganesha and practice meditation regularly.'
  ]
};

// Seeded determinism
function seededInt(seed, min, max) {
  const digest = crypto.createHash('sha256').update(seed).digest();
  const n = digest.readUInt32BE(0);
  return min + (n % (max - min + 1));
}

/* ═══════════════════════════════════════════════
   Life Prediction Engine — Detailed Vedic Readings
   Based on Lagna, Moon Rashi, Nakshatra & Dasha
   ═══════════════════════════════════════════════ */
const LAGNA_CHARACTER = {
  'Mesha (Aries)': 'You are a natural leader with a pioneering spirit and fierce determination. Your courage and enthusiasm inspire others. You have a warrior-like energy — fearless in the face of challenges. However, impulsiveness and impatience can sometimes undermine your best intentions. Channel your Mars-ruled fire wisely, and you will achieve extraordinary things.',
  'Vrishabha (Taurus)': 'You are a person of substance — practical, dependable, and deeply grounded. You value stability, beauty, and comfort in all aspects of life. Your Venus-ruled nature gives you refined taste and aesthetic sensibility. While your determination is admirable, stubbornness can occasionally hold you back. Learn to embrace change as a path to growth.',
  'Mithuna (Gemini)': 'You possess a brilliant, restless mind and exceptional communication skills. Your Mercury-ruled intellect makes you adaptable and quick to grasp new concepts. You are curious about everything and thrive on intellectual stimulation. However, your dual nature may cause inconsistency — focus your scattered energies for maximum impact.',
  'Karka (Cancer)': 'You are deeply intuitive, empathetic, and nurturing by nature. Your Moon-ruled soul connects profoundly with emotions — both your own and others. You have a strong protective instinct toward family and loved ones. While your sensitivity is a gift, guard against mood swings and excessive attachment to the past.',
  'Simha (Leo)': 'You radiate natural confidence, dignity, and a regal presence that commands respect. Your Sun-ruled personality shines brightly in any gathering. You are generous, warm-hearted, and fiercely loyal. Creative self-expression is vital to your wellbeing. Be mindful of ego and pride — true leadership comes through service.',
  'Kanya (Virgo)': 'You are a very practical person and equally capable. You are very tidy by nature, you love order and are methodical. Your Mercury-ruled mind excels at analysis and detail-oriented work. You are sensitive and generous — were you to hear of someone in dire distress, it is unthinkable that you would not help. However, excessive self-criticism and perfectionism can cause unnecessary anxiety.',
  'Tula (Libra)': 'You are a person of balance, harmony, and refined judgement. Your Venus-ruled nature craves beauty, justice, and meaningful partnerships. You excel at diplomacy and have a natural ability to see all sides of a situation. While your desire for peace is admirable, indecisiveness can be your greatest challenge — trust your inner wisdom.',
  'Vrishchika (Scorpio)': 'You possess exceptional depth, intensity, and transformative power. Your Mars-ruled nature gives you unwavering determination and magnetic charisma. You have the ability to see through anything or anyone, so it is very difficult to hide anything from you. This clarity of insight assists in overcoming opposition. Guard against jealousy and the desire for control.',
  'Dhanu (Sagittarius)': 'You are an optimistic, philosophical soul with an insatiable thirst for knowledge and adventure. Your Jupiter-ruled nature gives you expansive vision and strong moral principles. You inspire others with your enthusiasm and wisdom. However, restlessness and over-commitment can scatter your considerable talents — focus brings fortune.',
  'Makara (Capricorn)': 'You are calculative and realistic. You always want to achieve something. There is a deep desire burning in your heart to achieve greatness. Your Saturn-ruled discipline and ambition are formidable. You steadily climb toward your goals with remarkable patience and persistence. While this makes you proud of your achievements, remember to balance work with emotional nourishment.',
  'Kumbha (Aquarius)': 'You are a forward-thinking humanitarian with a unique and independent perspective on life. Your Saturn-ruled intellect combines with Rahu\'s unconventional energy to make you a visionary. You value freedom and social reform above personal gain. While your progressive ideas are valuable, emotional detachment can distance you from those who care about you.',
  'Meena (Pisces)': 'You are deeply compassionate, imaginative, and spiritually attuned. Your Jupiter-ruled soul connects with the divine in ways others cannot fathom. You possess extraordinary intuition and creative gifts. You are selfless and willing to sacrifice for others. However, be cautious of escapism and ensure you maintain healthy boundaries.'
};

const MOON_HAPPINESS = {
  'Mesha (Aries)': 'You find happiness in action, competition, and overcoming challenges. Sitting idle makes you restless — your joy comes from conquering new frontiers. Physical activity and sports can be a great source of fulfillment. Your happiest moments come when you are championing a cause or leading others toward a goal.',
  'Vrishabha (Taurus)': 'You find deep fulfillment in sensory pleasures — good food, beautiful surroundings, and the company of loved ones. Financial security brings you peace of mind. Music, art, and nature replenish your soul. Your happiest moments come in serene, stable environments where you can appreciate life\'s simple luxuries.',
  'Mithuna (Gemini)': 'Your happiness is rooted in learning, communication, and social connections. Stimulating conversations and new ideas light up your mind. Travel, reading, and creative writing bring immense satisfaction. You are happiest when your mind is engaged and you have an audience for your thoughts.',
  'Karka (Cancer)': 'Your deepest happiness comes from emotional connections — family, home, and nurturing others. Creating a warm, secure home environment is essential to your wellbeing. You find joy in cooking, caregiving, and preserving traditions. Emotional acknowledgment from loved ones fills your heart completely.',
  'Simha (Leo)': 'You find happiness in creative expression, recognition, and being admired. Performing, leading, and inspiring others brings you deep satisfaction. You thrive when you are in the spotlight and your talents are appreciated. Generosity and grand gestures of love are among your greatest sources of joy.',
  'Kanya (Virgo)': 'You find fulfillment in being useful, organized, and of service to others. Solving problems and improving systems gives you deep satisfaction. Your happiness comes from knowing that everything is in its proper place. Health consciousness and helping others achieve wellbeing are central to your contentment.',
  'Tula (Libra)': 'Your happiness is found in harmony, partnerships, and beautiful surroundings. A loving relationship is perhaps the most important factor in your emotional wellbeing. Art, music, and aesthetic experiences elevate your spirit. You are happiest when life feels balanced, fair, and graceful.',
  'Vrishchika (Scorpio)': 'You find fulfillment in depth, transformation, and emotional intensity. Superficial experiences leave you cold — you crave meaningful connections and profound understanding. Research, investigation, and uncovering hidden truths bring you immense satisfaction. Your happiest moments come during periods of personal transformation.',
  'Dhanu (Sagittarius)': 'Your happiness springs from exploration, learning, and sharing wisdom. Travel to distant lands, philosophical discussions, and spiritual seeking elevate your soul. Teaching and mentoring others brings deep fulfillment. You are happiest when you feel free to explore life\'s grand possibilities.',
  'Makara (Capricorn)': 'You find happiness in achievement, respect, and building lasting structures. Career success and public recognition bring deep satisfaction. You take pride in your accomplishments and the legacy you are creating. Your happiest moments come when your hard work is acknowledged and rewarded.',
  'Kumbha (Aquarius)': 'Your happiness is found in serving humanity, innovation, and breaking conventions. Unique friendships and group activities that serve a higher purpose elevate your spirit. You find deep fulfillment in technology, science, and social reform. Your happiest moments come when you are making a difference.',
  'Meena (Pisces)': 'Your deepest happiness comes from spiritual connection, creativity, and compassion. Meditation, music, art, and acts of charity fill your soul with joy. You find fulfillment in transcending the material world. Your happiest moments come in states of flow — when you lose yourself in creative or spiritual practice.'
};

const LAGNA_LIFESTYLE = {
  'Mesha (Aries)': 'You love to be active and on the move. A sedentary lifestyle is not for you — you need regular physical challenges. You are much better motivated to do a good job when others are watching. You tend to start many projects simultaneously and prefer a fast-paced, dynamic environment.',
  'Vrishabha (Taurus)': 'You prefer a comfortable, well-established lifestyle. Quality matters more than quantity — you invest in things that last. Your home is your sanctuary, and you spend considerable effort making it beautiful. You enjoy a slower, more deliberate pace of life.',
  'Mithuna (Gemini)': 'You love to communicate, and you are much better motivated to do a good job when others are watching. If you are on stage, you would do a much better job with a large audience than with a small one. Variety is the spice of your life — routine bores you.',
  'Karka (Cancer)': 'Your life revolves around home and family. You are deeply domestic and find great comfort in home-cooked meals and family gatherings. You tend to be protective of your personal space and private life. Emotional security determines your lifestyle choices more than material ambition.',
  'Simha (Leo)': 'You live life grandly and with flair. Your lifestyle reflects your need for self-expression and recognition. You are drawn to luxury, entertainment, and creative pursuits. Leadership positions suit you naturally, and you prefer to set the tone rather than follow.',
  'Kanya (Virgo)': 'You live a disciplined, health-conscious, and organized life. Your daily routine is methodical and well-planned. You pay close attention to diet, fitness, and mental health. Cleanliness and order in your surroundings are essential for your peace of mind.',
  'Tula (Libra)': 'You seek a balanced, harmonious lifestyle filled with beauty and social connections. Art, culture, and intellectual pursuits define your leisure time. You avoid extremes and prefer moderation in all things. Partnership and collaboration are central to your lifestyle.',
  'Vrishchika (Scorpio)': 'You live with intensity and purpose. Nothing in your life is half-hearted — you commit fully or not at all. You are drawn to research, investigation, and understanding life\'s deepest mysteries. Privacy is important to you, and you guard your inner world carefully.',
  'Dhanu (Sagittarius)': 'You live a life of adventure, learning, and spiritual seeking. Travel — both physical and intellectual — defines your lifestyle. You are drawn to foreign cultures, higher education, and philosophical pursuits. Freedom is non-negotiable for you.',
  'Makara (Capricorn)': 'You are a person who lives by discipline, ambition, and long-term planning. Your lifestyle reflects your steady climb toward success. You are willing to sacrifice short-term pleasures for long-term gains. Traditional values and established institutions resonate with you.',
  'Kumbha (Aquarius)': 'You live an unconventional, forward-thinking lifestyle. Technology, innovation, and humanitarian causes define your daily life. You march to the beat of your own drum and resist conformity. Community involvement and social networking are integral to your routine.',
  'Meena (Pisces)': 'You live a fluid, imaginative lifestyle that blends the material and spiritual. Creative pursuits — music, art, poetry — are woven into your daily existence. You are highly adaptable but can lack structure. Spiritual practices and time near water bring you balance.'
};

const LAGNA_CAREER = {
  'Mesha (Aries)': 'You excel in careers that demand leadership, initiative, and courage — military, sports, entrepreneurship, surgery, engineering, and law enforcement. You are best suited for roles where quick decisions are needed. Self-employment particularly suits your independent nature.',
  'Vrishabha (Taurus)': 'You thrive in careers related to finance, real estate, agriculture, luxury goods, music, fashion, and hospitality. Your patience and reliability make you an excellent banker, investor, or wealth manager. Artistic fields also offer great fulfillment.',
  'Mithuna (Gemini)': 'You are suited for careers in media, journalism, writing, teaching, marketing, IT, and telecommunications. Your versatile mind makes you an excellent communicator and multi-tasker. Roles that involve travel, networking, and intellectual challenges suit you best.',
  'Karka (Cancer)': 'You excel in caring professions — nursing, psychology, hospitality, food industry, real estate, and education. Your nurturing nature makes you a natural counselor and caregiver. Water-related industries and domestic services also suit you well.',
  'Simha (Leo)': 'You are destined for careers in entertainment, politics, leadership, government, and creative arts. Management positions, acting, and public speaking suit your commanding presence. You need a role that allows you to shine and be recognized.',
  'Kanya (Virgo)': 'You are suited for careers in healthcare, accounting, editing, quality control, research, and IT. Your analytical mind makes you excellent in data-driven roles. Service-oriented careers and those requiring precision and attention to detail are ideal.',
  'Tula (Libra)': 'You thrive in careers related to law, diplomacy, design, public relations, and partnership businesses. Your sense of justice makes you an excellent judge, mediator, or counselor. Careers in beauty, fashion, and interior design also suit you.',
  'Vrishchika (Scorpio)': 'You excel in research, investigation, psychology, medicine, occult sciences, and detective work. Your penetrating mind is ideal for roles that require depth and secrecy. Surgery, forensic science, and financial investigation are excellent choices.',
  'Dhanu (Sagittarius)': 'You are suited for careers in education, law, philosophy, religion, publishing, and international relations. Travel-related careers, teaching, and spiritual leadership complement your expansive vision.',
  'Makara (Capricorn)': 'You excel in government, administration, corporate management, mining, real estate, and architecture. Your disciplined nature makes you ideal for senior management and CEO-level positions. Careers that offer steady upward progression suit you best.',
  'Kumbha (Aquarius)': 'You thrive in technology, science, social work, astrology, aviation, and humanitarian organizations. Your innovative mind is suited for research, invention, and social reform. Careers in IT, electronics, and futuristic fields align with your vision.',
  'Meena (Pisces)': 'You excel in creative arts, spirituality, healing, cinema, music, and charitable work. Your intuitive gifts make you an excellent therapist, astrologer, or healer. Careers near water — marine, shipping, fisheries — are also favored.'
};

const MOON_RELATIONSHIPS = {
  'Mesha (Aries)': 'In relationships, you are passionate, direct, and protective. You fall in love quickly and with great intensity. Your partner must match your energy and respect your independence. You express love through action rather than words. While devoted, you need personal space to maintain your spark.',
  'Vrishabha (Taurus)': 'In love, you are devoted, sensual, and deeply loyal. Once committed, your affection is unwavering. You express love through physical touch, gifts, and creating comfortable environments. You seek stability in relationships and are drawn to partners who are dependable and financially secure.',
  'Mithuna (Gemini)': 'In relationships, you are communicative, playful, and intellectually engaging. Mental stimulation is as important as physical attraction for you. You need a partner who can keep up with your wit and variety of interests. Stagnation in a relationship is your greatest fear.',
  'Karka (Cancer)': 'In love, you are deeply caring, protective, and emotionally invested. Family and home life are your highest priorities. You express love through nurturing and emotional support. You seek a partner who values emotional security and wants to build a warm, loving family.',
  'Simha (Leo)': 'In relationships, you are romantic, generous, and fiercely loyal. You shower your partner with affection, gifts, and grand gestures. You need a partner who admires you and makes you feel special. Mutual respect and admiration are the foundations of your ideal relationship.',
  'Kanya (Virgo)': 'In love, you are thoughtful, devoted, and show affection through acts of service. You pay attention to every detail of your partner\'s needs. You seek a relationship built on intellectual compatibility and mutual improvement. You may overanalyze emotional situations — trust your heart more.',
  'Tula (Libra)': 'In relationships, you are charming, romantic, and deeply committed to partnership. Love and marriage are central to your happiness. You seek harmony, beauty, and intellectual companionship in a partner. You go to great lengths to maintain balance and peace in relationships.',
  'Vrishchika (Scorpio)': 'In love, you are intensely passionate, possessive, and deeply transformative. Superficial connections hold no interest — you seek a soul-level bond. Trust is paramount, and betrayal is unforgivable. When you love, it is with every fiber of your being.',
  'Dhanu (Sagittarius)': 'In relationships, you are adventurous, optimistic, and freedom-loving. You seek a partner who shares your love for travel, learning, and spiritual growth. Your ideal relationship is one that feels like a grand adventure. You need space and autonomy within partnership.',
  'Makara (Capricorn)': 'In love, you are cautious, responsible, and deeply committed once you open your heart. You take relationships seriously and seek long-term stability. You express love through providing and protecting. Your ideal partner understands your ambition and supports your career goals.',
  'Kumbha (Aquarius)': 'In relationships, you value friendship, intellectual connection, and shared ideals above all. Conventional romance may not appeal to you — you prefer unique, unconventional bonds. You need a partner who respects your independence and shares your vision for a better world.',
  'Meena (Pisces)': 'In love, you are selfless, romantic, and deeply compassionate. You idealize your partner and can sacrifice greatly for love. You seek a spiritual, soulful connection that transcends the material. Creative expression and shared spiritual pursuits strengthen your bonds.'
};

const MOON_FINANCE = {
  'Mesha (Aries)': 'Financially, you tend to earn through bold initiatives and entrepreneurship. You can make money quickly but may also spend impulsively. Investments in technology, sports, and defense sectors favor you. Avoid speculative risks during Rahu-Ketu transits.',
  'Vrishabha (Taurus)': 'You have excellent financial instincts and a natural ability to accumulate wealth. Real estate, agriculture, and luxury goods investments suit you well. You are prudent with money and prefer safe, steady returns over risky ventures.',
  'Mithuna (Gemini)': 'Your income often comes from multiple sources — writing, teaching, commission-based work, or side businesses. You are clever with money but can be inconsistent in savings. Media, IT, and communication-related investments are favorable.',
  'Karka (Cancer)': 'Financial security is deeply important to you, and you tend to be cautious with money. Real estate, food industry, and domestic services are favorable sectors. You accumulate wealth steadily and are good at saving for the future.',
  'Simha (Leo)': 'You have the capacity to earn well through leadership roles, entertainment, and government positions. You tend to spend generously — sometimes beyond your means. Investments in gold, entertainment, and leadership ventures favor you.',
  'Kanya (Virgo)': 'You are meticulous with finances — budgeting, saving, and planning come naturally. You earn through service, healthcare, and analytical professions. You prefer low-risk investments and are skilled at finding bargains and maximizing value.',
  'Tula (Libra)': 'Your finances are often linked to partnerships and collaborations. You earn well through art, law, design, and relationship-oriented businesses. Balance in spending and saving is achievable for you. Luxury goods and beauty industry investments suit you.',
  'Vrishchika (Scorpio)': 'You have the ability to multiply wealth through deep research and strategic investment. Insurance, inheritance, and joint finances play important roles. You are skilled at managing other people\'s money and can excel in financial markets.',
  'Dhanu (Sagittarius)': 'Your financial growth comes through education, travel, publishing, and spiritual pursuits. You tend to be generous and philosophical about money. International business and higher education investments are favorable.',
  'Makara (Capricorn)': 'You are disciplined and strategic with finances, building wealth methodically over time. Government contracts, real estate, and traditional industries suit your investment style. You are likely to achieve significant wealth through patience and persistence.',
  'Kumbha (Aquarius)': 'Your income often comes from technology, innovation, and humanitarian ventures. You may have unconventional sources of income. Investments in technology stocks, startups, and social enterprises are favorable.',
  'Meena (Pisces)': 'Your finances can be unpredictable — you may experience both abundance and scarcity. Income from creative, spiritual, and healing professions is indicated. Charitable giving is important to you. Water-related and overseas investments are favorable.'
};

const NAKSHATRA_HEALTH = {
  'Ashwini': 'Your vitality is generally strong with good recuperative powers. Watch for headaches, fevers, and injuries to the head. Active lifestyle keeps you healthy. Ayurvedic herbs like Ashwagandha benefit you.',
  'Bharani': 'You have good stamina but tendency toward reproductive and urinary system issues. Moderation in diet is essential. Yoga and pranayama are excellent for maintaining health.',
  'Krittika': 'Strong constitution but prone to digestive issues, acidity, and fevers. Cooling foods and avoiding spicy diet helps. Sun-gazing during early morning benefits your vitality.',
  'Rohini': 'Generally good health with smooth complexion. Watch for throat, thyroid, and respiratory issues. Singing and vocal exercises strengthen your health. Milk-based diet suits you.',
  'Mrigashira': 'Active mind leads to nervous exhaustion. Watch for sinus, allergies, and shoulder-area problems. Regular walks in nature are therapeutic. Cooling pranayama helps tremendously.',
  'Ardra': 'You possess mental intensity that can cause stress-related ailments. Watch for cough, cold, and asthmatic conditions. Deep breathing exercises and meditation are essential. Tulsi tea is your natural remedy.',
  'Punarvasu': 'Generally robust health with good recovery powers. Watch for joint pains and rheumatic conditions. Moderate exercise and stretching keep you agile. Turmeric and warm water benefit you.',
  'Pushya': 'Strong constitution with tendency to gain weight. Watch for chest, stomach, and lung issues. Swimming and water-based exercises suit you. Sattvic diet brings optimal health.',
  'Ashlesha': 'Sensitive nervous system requires careful management. Watch for anxiety, insomnia, and digestive issues. Meditation and calming herbs like Brahmi are essential. Avoid stressful environments.',
  'Magha': 'Royal constitution with heart-related sensitivities. Watch for cardiac issues, spine problems, and blood pressure. Heart-healthy exercises and meditation are paramount. Ruby-energized water benefits you.',
  'Purva Phalguni': 'Good vitality but tendency toward overindulgence affects health. Watch for liver, reproductive, and skin issues. Balanced diet and adequate rest are essential. Creative activities reduce stress.',
  'Uttara Phalguni': 'Strong digestive system but prone to stomach and intestinal issues. Watch for gastric problems and skin conditions. Fiber-rich diet and regular eating habits benefit you. Sun exposure in moderation helps.',
  'Hasta': 'Sensitive hands and nervous system. Watch for carpal tunnel, skin allergies, and nervous tension. Hand exercises and creative hobbies maintain health. Green leafy vegetables are essential.',
  'Chitra': 'Good overall health with athletic build potential. Watch for kidney, bladder, and lower abdominal issues. Athletic activities and balanced hydration are key. Artistic expression reduces stress.',
  'Swati': 'Fluctuating health patterns linked to weather changes. Watch for respiratory issues, allergies, and intestinal gas. Breathing exercises and pranayama are vital. Light, easily digestible food suits you.',
  'Vishakha': 'Strong determination aids health recovery. Watch for liver, hormonal, and reproductive system issues. Moderate alcohol and rich foods. Meditation and yoga balance your intense energy.',
  'Anuradha': 'Generally good health but prone to stomach and hip issues. Watch for bladder and pelvic region problems. Swimming and hip-opening yoga poses benefit you. Friendship and social support boost healing.',
  'Jyeshtha': 'Mental strength but physical vulnerability in stomach and reproductive areas. Watch for muscular pain and prostate issues. Regular check-ups are important. Neem and turmeric remedies benefit you.',
  'Mula': 'Root-level health that needs attention to hips, thighs, and sciatic nerve. Watch for nerve pain and leg injuries. Grounding exercises and root chakra meditation help. Root vegetables in diet are beneficial.',
  'Purva Ashadha': 'Good vitality with sensitivity in thighs and hips. Watch for kidney, bladder, and lower-back issues. Swimming and water therapy are excellent. Adequate water intake is essential.',
  'Uttara Ashadha': 'Strong constitution with knees as a sensitive point. Watch for bone density, joint issues, and skin dryness. Weight-bearing exercises strengthen your frame. Calcium-rich diet is important.',
  'Shravana': 'Ears and knees are sensitive areas. Watch for hearing issues, knee problems, and skin conditions. Listening to healing sounds (mantras, nature) benefits you. Regular knee exercises are essential.',
  'Dhanishtha': 'Athletic potential but watch for blood-related issues. Watch for anemia, circulatory problems, and ankle injuries. Regular iron-rich diet and moderate exercise are key. Drumming and music therapy help.',
  'Shatabhisha': 'Unique health patterns requiring alternative approaches. Watch for calf muscles, ankles, and circulatory issues. Alternative medicine and Ayurveda suit you well. Neem-based remedies are highly beneficial.',
  'Purva Bhadrapada': 'Strong constitution with tendency toward ankle and feet issues. Watch for swelling, liver problems, and anxiety. Grounding activities and meditation help. Turmeric and ashwagandha benefit you.',
  'Uttara Bhadrapada': 'Generally good health with feet and sole sensitivity. Watch for cold-related ailments and foot injuries. Warm soaks, foot massage, and adequate sleep are essential. Saturn-related remedies benefit health.',
  'Revati': 'Sensitive to environmental changes and toxins. Watch for feet issues, allergies, and immune vulnerability. Clean diet, detox routines, and fish oil supplements help. Spending time near water heals you.'
};

function generateLifePrediction({ lagnaRashi, moonRashi, nakshatra, dashaLord, gender, mangalDosha, fullName }) {
  const lagnaName = lagnaRashi.name;
  const moonName = moonRashi.name;
  const nakName = nakshatra.name;

  const focusAreas = {
    Sun: 'authority, recognition, and self-confidence',
    Moon: 'emotional balance, mental peace, and family',
    Mars: 'courage, energy, and property matters',
    Mercury: 'intellect, communication, and business',
    Jupiter: 'wisdom, spiritual growth, and expansion',
    Venus: 'relationships, creativity, and comfort',
    Saturn: 'discipline, career growth, and karmic duties',
    Rahu: 'ambition, foreign connections, and innovation',
    Ketu: 'spiritual liberation, intuition, and detachment'
  };

  const phaseAdvice = {
    Sun: 'Take visible leadership and maintain discipline in reputation-related matters.',
    Moon: 'Protect your emotional bandwidth and prioritize routines that calm the mind.',
    Mars: 'Channel high energy into structured goals; avoid impulsive reactions in conflict.',
    Mercury: 'Upskill, network, and communicate clearly to unlock opportunities.',
    Jupiter: 'Invest in learning, mentorship, and long-term value creation.',
    Venus: 'Strengthen relationships, aesthetics, and quality-of-life choices with moderation.',
    Saturn: 'Focus on consistency, delayed gratification, and duty-driven execution.',
    Rahu: 'Use ambition strategically, verify facts, and avoid shortcuts.',
    Ketu: 'Simplify commitments, deepen spiritual practice, and avoid emotional withdrawal.'
  };

  const addContext = (...parts) => parts.filter(Boolean).join(' ');
  const baseCharacter = LAGNA_CHARACTER[lagnaName] || LAGNA_CHARACTER['Kanya (Virgo)'];
  const baseHappiness = MOON_HAPPINESS[moonName] || MOON_HAPPINESS['Kanya (Virgo)'];
  const baseLifestyle = LAGNA_LIFESTYLE[lagnaName] || LAGNA_LIFESTYLE['Kanya (Virgo)'];
  const baseCareer = LAGNA_CAREER[lagnaName] || LAGNA_CAREER['Kanya (Virgo)'];
  const baseRelationships = MOON_RELATIONSHIPS[moonName] || MOON_RELATIONSHIPS['Kanya (Virgo)'];
  const baseFinance = MOON_FINANCE[moonName] || MOON_FINANCE['Kanya (Virgo)'];
  const baseHealth = NAKSHATRA_HEALTH[nakName] || 'Your health is generally stable. Regular exercise, balanced diet, and adequate sleep are recommended. Consult your Nakshatra lord for specific remedies.';

  const pronoun = gender === 'Female' ? 'She' : (gender === 'Male' ? 'He' : 'They');
  const relationTone = mangalDosha
    ? 'Because Mangal Dosha is present, emotional reactivity and expectation mismatch can arise in close bonds unless communication and patience are consciously practiced.'
    : 'Since strong Manglik imbalance is not indicated, relationships tend to stabilize better with maturity, shared values, and practical planning.';

  return {
    character: addContext(
      baseCharacter,
      `${fullName || 'This native'} carries Lagna-led traits through first impressions, decision style, and personal confidence, so self-image management directly affects outcomes.`,
      `During ${dashaLord} Mahadasha, personality expression becomes more visible in areas linked to ${focusAreas[dashaLord] || 'balanced self-development'}, and people tend to respond quickly to your tone and consistency.`
    ),
    happiness: addContext(
      baseHappiness,
      `With Moon in ${moonName}, emotional security improves when daily rhythms are predictable, sleep quality is protected, and overstimulation is minimized.`,
      `${phaseAdvice[dashaLord] || 'Stay consistent with emotional and practical routines.'} This helps convert temporary mood swings into stable inner clarity.`
    ),
    lifestyle: addContext(
      baseLifestyle,
      'A Lagna-centered lifestyle works best when your environment reflects your temperament: timing, food habits, social pace, and work-rest cycles should be intentionally designed.',
      'In this phase, simplify one major habit every month and build repeatable routines instead of chasing dramatic short-term changes.'
    ),
    career: addContext(
      baseCareer,
      'Career momentum improves when you align role selection with Lagna strengths and Moon psychology, rather than only titles or external pressure.',
      `Over the next cycle, prioritize skill depth, decision quality, and reputation capital; ${pronoun} will benefit more from compounding effort than sudden jumps.`
    ),
    relationships: addContext(
      baseRelationships,
      relationTone,
      'Long-term compatibility improves when emotional needs are named early, boundaries are clear, and family expectations are handled with realism rather than assumptions.'
    ),
    finance: addContext(
      baseFinance,
      'Financial stability will improve faster through a two-bucket approach: disciplined core savings plus controlled high-growth exposure based on risk capacity.',
      'Track cash flow monthly, avoid emotionally timed decisions, and use dasha-friendly periods for expansion while keeping downside protection active.'
    ),
    health: addContext(
      baseHealth,
      `Because ${nakName} influences your recovery pattern, preventive care and season-wise routine adjustments are more effective than reactive treatment.`,
      'A practical protocol of sleep discipline, digestive balance, movement, and stress regulation can deliver strong long-term vitality.'
    ),
    dashaInfluence: addContext(
      `You are currently running the ${dashaLord} Mahadasha, which brings focus on ${focusAreas[dashaLord] || 'balanced self-development'}.`,
      `This period shapes major life themes: career direction, relationship maturity, financial architecture, and spiritual alignment all move through ${dashaLord}'s lens.`,
      `${phaseAdvice[dashaLord] || 'Maintain disciplined, steady action in this phase.'} If actions are aligned with this cycle, results become more stable and meaningful over time.`
    )
  };
}
/* ═══════════════════════════════════════════════
   Build Vedic Kundli — Main Function
   Uses astronomy-engine for real positions
   ═══════════════════════════════════════════════ */
async function buildVedicKundli({ fullName, gender, dob, tob, birthPlace, birthLat, birthLon }) {
  const [yearStr, monthStr, dayStr] = dob.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const [hourStr, minStr] = tob.split(':');
  const birthHour = Number(hourStr);
  const birthMinute = Number(minStr);

  // Use pre-selected coordinates if provided, otherwise geocode
  const geo = (birthLat && birthLon)
    ? { lat: Number(birthLat), lon: Number(birthLon) }
    : await geocodeCity(birthPlace);

  // Convert IST to UTC (IST = UTC + 5:30)
  const utcHour = birthHour - 5;
  const utcMinute = birthMinute - 30;
  const utcDate = new Date(Date.UTC(year, month - 1, day, utcHour, utcMinute, 0));

  // astronomy-engine time object
  const astroTime = Astronomy.MakeTime(utcDate);

  // Julian Day for ayanamsa
  const jd = 2451545.0 + astroTime.ut;
  const ayanamsa = lahiriAyanamsa(jd);

  // ─── HIGH PRECISION TROPICAL POSITIONS (astronomy-engine) ───
  const tropPositions = getPlanetPositions(astroTime);

  // ─── SIDEREAL POSITIONS (tropical − ayanamsa) ───
  const sidSun     = normDeg(tropPositions.Sun - ayanamsa);
  const sidMoon    = normDeg(tropPositions.Moon - ayanamsa);
  const sidMercury = normDeg(tropPositions.Mercury - ayanamsa);
  const sidVenus   = normDeg(tropPositions.Venus - ayanamsa);
  const sidMars    = normDeg(tropPositions.Mars - ayanamsa);
  const sidJupiter = normDeg(tropPositions.Jupiter - ayanamsa);
  const sidSaturn  = normDeg(tropPositions.Saturn - ayanamsa);

  // Rahu/Ketu (mean node)
  const nodes = computeLunarNodes(jd);
  const sidRahu = normDeg(nodes.rahu - ayanamsa);
  const sidKetu = normDeg(nodes.ketu - ayanamsa);

  // ─── LAGNA (from GMST, birth place, obliquity) ───
  const gmst = Astronomy.SiderealTime(astroTime); // hours
  const obliquity = Astronomy.e_tilt(astroTime).tobl; // true obliquity in degrees
  const tropLagna = computeAscendant(gmst, geo.lon, geo.lat, obliquity);
  const sidLagna = normDeg(tropLagna - ayanamsa);

  // ─── RASHI INDICES ───
  const sunRashiIdx    = rashiIndex(sidSun);
  const moonRashiIdx   = rashiIndex(sidMoon);
  const lagnaRashiIdx  = rashiIndex(sidLagna);
  const marsRashiIdx   = rashiIndex(sidMars);

  const sunRashi   = RASHIS[sunRashiIdx];
  const moonRashi  = RASHIS[moonRashiIdx];
  const lagnaRashi = RASHIS[lagnaRashiIdx];

  // ─── NAKSHATRA OF MOON ───
  const moonNakIdx    = nakshatraIndex(sidMoon);
  const moonNakshatra = NAKSHATRAS[moonNakIdx];
  const moonPada      = padaNumber(sidMoon);

  // ─── PANCHANG ───
  const panchang = computePanchangElements(sidSun, sidMoon);

  // ─── VIMSHOTTARI DASHA ───
  const dobDate = new Date(year, month - 1, day);
  const dashas = computeDashaSequence(sidMoon, dobDate);
  const runningDasha = currentDasha(dashas);

  // ─── MANGAL DOSHA ───
  const marsHouseFromLagna = ((marsRashiIdx - lagnaRashiIdx + 12) % 12) + 1;
  const mangalDosha = checkMangalDosha(marsHouseFromLagna);

  // ─── REMEDIES ───
  const seed = `${fullName}|${gender}|${dob}|${tob}|${birthPlace}`.toLowerCase();
  const rashiLord = moonRashi.lord;
  const lordRemedies = VEDIC_REMEDIES[rashiLord] || VEDIC_REMEDIES.Sun;
  const remedyIdx = seededInt(seed + '|remedy', 0, lordRemedies.length - 1);

  const dashaLord = runningDasha ? runningDasha.planet : 'Unknown';
  const dashaRemedies = VEDIC_REMEDIES[dashaLord] || [];
  const dashaRemedyIdx = seededInt(seed + '|dasha-remedy', 0, Math.max(dashaRemedies.length - 1, 0));

  // ─── DETAILED VEDIC READING TEXT ───
  const focusAreas = {
    Sun: 'authority, public recognition, and self-confidence',
    Moon: 'emotional balance, mental peace, and family harmony',
    Mars: 'courage, physical vitality, and property matters',
    Mercury: 'intellect, communication, and business acumen',
    Jupiter: 'wisdom, spiritual growth, and financial expansion',
    Venus: 'relationships, creativity, and material comforts',
    Saturn: 'discipline, career structure, and karmic lessons',
    Rahu: 'worldly ambitions, foreign connections, and unconventional paths',
    Ketu: 'spiritual liberation, intuition, and past-life karma'
  };

  const dashaFocus = focusAreas[dashaLord] || 'balanced self-development';

  const prediction = `${fullName}, according to your Vedic birth chart (Janma Kundli) computed using high-precision astronomical ephemeris (Lahiri Ayanamsa: ${ayanamsa.toFixed(4)}°), ` +
    `your Lagna (Ascendant) is ${lagnaRashi.name} at ${degreeInRashi(sidLagna)}° ruled by ${lagnaRashi.lord}. ` +
    `Your Chandra Rashi (Moon Sign) is ${moonRashi.name} at ${degreeInRashi(sidMoon)}° in ${moonNakshatra.name} Nakshatra (Pada ${moonPada}), ` +
    `and your Surya Rashi (Sun Sign) is ${sunRashi.name} at ${degreeInRashi(sidSun)}°. ` +
    `You are currently in the Mahadasha of ${dashaLord}, which brings focus on ${dashaFocus}. ` +
    `Birth Tithi: ${panchang.tithi}, Yoga: ${panchang.yoga}, Karana: ${panchang.karana}. ` +
    `Birth coordinates: ${geo.lat.toFixed(4)}°N, ${geo.lon.toFixed(4)}°E (${birthPlace}).` +
    (mangalDosha ? ` Mangal Dosha is indicated (Mars in ${marsHouseFromLagna}th house from Lagna) — specific remedies are recommended.` : ` No Mangal Dosha is present in your chart.`);

  // ─── DASHA TIMELINE ───
  const dashaTimeline = dashas.slice(0, 9).map(d => ({
    planet: d.planet,
    years: d.years,
    start: d.start.getFullYear(),
    end: d.end.getFullYear()
  }));

  // ─── GRAHA POSITIONS TABLE ───
  const grahaData = [
    { name: 'Sun (Surya)',      abbr: 'Su', sidereal: sidSun,     tropical: tropPositions.Sun },
    { name: 'Moon (Chandra)',   abbr: 'Mo', sidereal: sidMoon,    tropical: tropPositions.Moon },
    { name: 'Mars (Mangal)',    abbr: 'Ma', sidereal: sidMars,    tropical: tropPositions.Mars },
    { name: 'Mercury (Budh)',   abbr: 'Me', sidereal: sidMercury, tropical: tropPositions.Mercury },
    { name: 'Jupiter (Guru)',   abbr: 'Ju', sidereal: sidJupiter, tropical: tropPositions.Jupiter },
    { name: 'Venus (Shukra)',   abbr: 'Ve', sidereal: sidVenus,   tropical: tropPositions.Venus },
    { name: 'Saturn (Shani)',   abbr: 'Sa', sidereal: sidSaturn,  tropical: tropPositions.Saturn },
    { name: 'Rahu',             abbr: 'Ra', sidereal: sidRahu,    tropical: nodes.rahu },
    { name: 'Ketu',             abbr: 'Ke', sidereal: sidKetu,    tropical: nodes.ketu }
  ];

  const grahaPositions = grahaData.map(g => ({
    ...g,
    rashi: RASHIS[rashiIndex(g.sidereal)].name,
    rashiSymbol: RASHIS[rashiIndex(g.sidereal)].symbol,
    degree: degreeInRashi(g.sidereal),
    rashiIndex: rashiIndex(g.sidereal),
    nakshatra: NAKSHATRAS[nakshatraIndex(g.sidereal)].name,
    tropicalLon: g.tropical.toFixed(4),
    siderealLon: g.sidereal.toFixed(4)
  }));

  // ─── 12-HOUSE KUNDLI CHART ───
  const houses = [];
  for (let i = 0; i < 12; i++) {
    const rIdx = (lagnaRashiIdx + i) % 12;
    const rashi = RASHIS[rIdx];
    const planetsInHouse = grahaPositions
      .filter(g => g.rashiIndex === rIdx)
      .map(g => g.abbr);
    houses.push({
      house: i + 1,
      rashi: rashi.name,
      rashiSymbol: rashi.symbol,
      lord: rashi.lord,
      planets: planetsInHouse
    });
  }

  // ─── LIFE PREDICTION (structured sections) ───
  const lifePrediction = generateLifePrediction({
    lagnaRashi, moonRashi, nakshatra: moonNakshatra,
    dashaLord, gender, mangalDosha, fullName
  });

  return {
    lagnaRashi: lagnaRashi.name, lagnaLord: lagnaRashi.lord,
    lagnaSymbol: lagnaRashi.symbol, lagnaDegree: degreeInRashi(sidLagna),

    moonRashi: moonRashi.name, moonLord: moonRashi.lord,
    moonSymbol: moonRashi.symbol, moonDegree: degreeInRashi(sidMoon),

    sunRashi: sunRashi.name, sunLord: sunRashi.lord,
    sunSymbol: sunRashi.symbol, sunDegree: degreeInRashi(sidSun),

    nakshatra: moonNakshatra.name, nakshatraLord: moonNakshatra.lord,
    nakshatraDeity: moonNakshatra.deity, pada: moonPada,

    tithi: panchang.tithi, yoga: panchang.yoga, karana: panchang.karana,

    currentDasha: dashaLord, dashaTimeline, mangalDosha,

    prediction,
    lifePrediction,
    remedy: lordRemedies[remedyIdx],
    dashaRemedy: dashaRemedies[dashaRemedyIdx] || '',

    ayanamsa: ayanamsa.toFixed(4),
    birthCoords: { lat: geo.lat.toFixed(4), lon: geo.lon.toFixed(4), place: birthPlace },
    houses, grahaPositions,

    // Computation metadata
    engine: 'astronomy-engine (USNO-grade, ~1 arcminute precision)',
    ayanamsaSystem: 'Lahiri (Chitrapaksha)',
    houseSystem: 'Whole Sign (Rashi-based)'
  };
}

/* ═══════════════════════════════════════════════
   HTTP Server
   ═══════════════════════════════════════════════ */

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 500, { error: 'Failed to load page.' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function safeLocalPath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const resolved = path.resolve(ROOT, normalized);
  if (!resolved.startsWith(path.resolve(ROOT))) return null;
  return resolved;
}

function parseJsonBody(req, maxBytes = 1024 * 64) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let raw = '';
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (!raw) { resolve({}); return; }
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function validateInput(payload) {
  const fullName = String(payload.fullName || '').trim();
  const gender = String(payload.gender || '').trim();
  const dob = String(payload.dob || '').trim();
  const tob = String(payload.tob || '').trim();
  const birthPlace = String(payload.birthPlace || '').trim();

  if (fullName.length < 2) return { error: 'Full name must be at least 2 characters.' };
  if (!['Male', 'Female', 'Other'].includes(gender)) return { error: 'Gender is invalid.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: 'Date of birth is invalid.' };
  if (!/^\d{2}:\d{2}$/.test(tob)) return { error: 'Time of birth is invalid.' };
  if (birthPlace.length < 3) return { error: 'Place of birth must be at least 3 characters.' };

  const birthLat = payload.birthLat ? Number(payload.birthLat) : null;
  const birthLon = payload.birthLon ? Number(payload.birthLon) : null;

  return { fullName, gender, dob, tob, birthPlace, birthLat, birthLon };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    sendFile(res, INDEX_FILE);
    return;
  }

  if (req.method === 'GET' && !url.pathname.startsWith('/api/') && url.pathname !== '/health') {
    const localPath = safeLocalPath(url.pathname);
    if (localPath) {
      fs.stat(localPath, (err, stat) => {
        if (!err && stat.isFile()) {
          sendFile(res, localPath);
          return;
        }
        sendJson(res, 404, { error: 'Not found' });
      });
      return;
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/predict') {
    try {
      const payload = await parseJsonBody(req);
      const validated = validateInput(payload);
      if (validated.error) {
        sendJson(res, 400, { error: validated.error });
        return;
      }
      const result = await buildVedicKundli(validated);
      sendJson(res, 200, result);
      return;
    } catch (err) {
      const message = err && err.message === 'Payload too large' ? err.message : 'Invalid request body.';
      sendJson(res, 400, { error: message });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/cities') {
    const query = url.searchParams.get('q') || '';
    if (query.length < 2) {
      sendJson(res, 200, []);
      return;
    }
    // Check local dictionary first
    const localMatches = Object.keys(INDIAN_CITIES)
      .filter(k => k.includes(query.toLowerCase()))
      .slice(0, 5)
      .map(k => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        display: k.charAt(0).toUpperCase() + k.slice(1) + ', India',
        lat: INDIAN_CITIES[k].lat,
        lon: INDIAN_CITIES[k].lon
      }));
    if (localMatches.length >= 3) {
      sendJson(res, 200, localMatches);
      return;
    }
    // Query Nominatim for more results
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
    const nominatimReq = https.get(nominatimUrl, {
      headers: { 'User-Agent': 'AstroBrahmvid/1.0 (vedic-kundli)' }
    }, (nominatimRes) => {
      let data = '';
      nominatimRes.on('data', (chunk) => data += chunk);
      nominatimRes.on('end', () => {
        try {
          const results = JSON.parse(data);
          const suggestions = results
            .filter(r => r.type === 'city' || r.type === 'town' || r.type === 'village' || r.type === 'administrative' || r.class === 'place' || r.class === 'boundary')
            .slice(0, 6)
            .map(r => ({
              name: r.address?.city || r.address?.town || r.address?.village || r.display_name.split(',')[0],
              display: r.display_name.length > 60 ? r.display_name.substring(0, 57) + '...' : r.display_name,
              lat: parseFloat(r.lat),
              lon: parseFloat(r.lon)
            }));
          // Merge local + Nominatim, deduplicate by name
          const merged = [...localMatches];
          const existingNames = new Set(merged.map(m => m.name.toLowerCase()));
          for (const s of suggestions) {
            if (!existingNames.has(s.name.toLowerCase())) {
              merged.push(s);
              existingNames.add(s.name.toLowerCase());
            }
          }
          sendJson(res, 200, merged.slice(0, 6));
        } catch {
          sendJson(res, 200, localMatches);
        }
      });
    });
    nominatimReq.on('error', () => sendJson(res, 200, localMatches));
    nominatimReq.setTimeout(3000, () => { nominatimReq.destroy(); sendJson(res, 200, localMatches); });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Astro Brahmvid (Vedic + astronomy-engine) running at http://localhost:${PORT}`);
});

