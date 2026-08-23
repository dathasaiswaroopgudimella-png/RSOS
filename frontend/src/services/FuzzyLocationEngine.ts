/**
 * RoadSOS — Intelligent Fuzzy Location Autocorrection & Nearest Geo-Resolver Engine
 * Handles misspelled localities, colleges, landmarks, and districts across India.
 * Automatically recovers from typos and resolves to exact GPS coordinates.
 */

export interface LocationPreset {
  name: string;
  category: 'Metro' | 'Locality' | 'Campus' | 'District' | 'Landmark';
  city: string;
  state: string;
  lat: number;
  lon: number;
  aliases: string[];
}

export const KNOWN_INDIAN_LOCATIONS: LocationPreset[] = [
  // --- Metros & Major Cities ---
  { name: 'Hyderabad', category: 'Metro', city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867, aliases: ['hyd', 'hyderabad', 'hyderbad', 'huderabad', 'hyderabadd'] },
  { name: 'Bengaluru', category: 'Metro', city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946, aliases: ['bangalore', 'bengaluru', 'blr', 'bengalooru', 'bangaluru'] },
  { name: 'Delhi NCR', category: 'Metro', city: 'Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090, aliases: ['delhi', 'new delhi', 'ncr', 'dilli', 'delhy'] },
  { name: 'Mumbai', category: 'Metro', city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, aliases: ['mumbai', 'bombay', 'mumbay', 'mumbao'] },
  { name: 'Chennai', category: 'Metro', city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, aliases: ['chennai', 'madras', 'chenai', 'chenna'] },
  { name: 'Kolkata', category: 'Metro', city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639, aliases: ['kolkata', 'calcutta', 'kolkatta', 'kolkatha'] },
  { name: 'Pune', category: 'Metro', city: 'Pune', state: 'Maharashtra', lat: 18.5204, lon: 73.8567, aliases: ['pune', 'poona', 'puney', 'punee'] },
  { name: 'Jaipur', category: 'Metro', city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, aliases: ['jaipur', 'jaypur', 'pink city', 'jaipoor'] },
  { name: 'Lucknow', category: 'Metro', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462, aliases: ['lucknow', 'lakhnau', 'luknow', 'lko'] },
  { name: 'Ahmedabad', category: 'Metro', city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714, aliases: ['ahmedabad', 'amdavad', 'ahmdabad', 'ahmedbad'] },
  { name: 'Warangal', category: 'Metro', city: 'Warangal', state: 'Telangana', lat: 17.9689, lon: 79.5941, aliases: ['warangal', 'varangal', 'kazipet', 'hanamkonda', 'tri-cities'] },
  { name: 'Visakhapatnam', category: 'Metro', city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185, aliases: ['vizag', 'visakhapatnam', 'vishakapatnam', 'waltair'] },
  { name: 'Varanasi', category: 'Metro', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lon: 82.9739, aliases: ['varanasi', 'banaras', 'kashi', 'varnasi', 'banaras city'] },
  { name: 'Ramnagar', category: 'District', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.2762, lon: 83.0276, aliases: ['ramnagar', 'ram nager', 'ram nagar', 'ramnaagr'] },

  // --- Major Universities & Tech Campuses ---
  { name: 'IIT BHU / BHU Campus', category: 'Campus', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.2677, lon: 82.9913, aliases: ['bhu', 'iit bhu', 'bhu campus', 'banaras hindu university', 'iit varanasi', 'lanka bhu'] },
  { name: 'IIT Hyderabad (Kandi)', category: 'Campus', city: 'Sangareddy', state: 'Telangana', lat: 17.5947, lon: 78.1230, aliases: ['iit hyd', 'iit hyderabad', 'iith', 'kandi iit'] },
  { name: 'BITS Pilani Hyderabad', category: 'Campus', city: 'Hyderabad', state: 'Telangana', lat: 17.5449, lon: 78.5718, aliases: ['bits hyd', 'bits hyderabad', 'bits pilani hyd', 'shameerpet bits'] },
  { name: 'IIT Bombay (Powai)', category: 'Campus', city: 'Mumbai', state: 'Maharashtra', lat: 19.1334, lon: 72.9133, aliases: ['iit bombay', 'iitb', 'powai iit', 'iit powai'] },
  { name: 'IIT Delhi (Hauz Khas)', category: 'Campus', city: 'Delhi', state: 'Delhi', lat: 28.5450, lon: 77.1926, aliases: ['iit delhi', 'iitd', 'hauz khas iit'] },
  { name: 'IISc Bengaluru', category: 'Campus', city: 'Bengaluru', state: 'Karnataka', lat: 13.0219, lon: 77.5671, aliases: ['iisc', 'iisc bangalore', 'indian institute of science'] },
  { name: 'IIIT Hyderabad (Gachibowli)', category: 'Campus', city: 'Hyderabad', state: 'Telangana', lat: 17.4455, lon: 78.3489, aliases: ['iiit hyd', 'iiit hyderabad', 'iiith'] },

  // --- High-Frequency Urban Localities (Hyderabad) ---
  { name: 'Madhapur', category: 'Locality', city: 'Hyderabad', state: 'Telangana', lat: 17.4483, lon: 78.3915, aliases: ['madhapur', 'madapur', 'hitech city', 'hitex', 'cyber towers', 'madhapoore'] },
  { name: 'Gachibowli', category: 'Locality', city: 'Hyderabad', state: 'Telangana', lat: 17.4401, lon: 78.3489, aliases: ['gachibowli', 'gachibowly', 'gachiboli', 'gachibauli', 'financial district'] },
  { name: 'Jubilee Hills', category: 'Locality', city: 'Hyderabad', state: 'Telangana', lat: 17.4319, lon: 78.4073, aliases: ['jubilee hills', 'jubli hills', 'jublee hills', 'road no 36', 'road no 45'] },
  { name: 'Banjara Hills', category: 'Locality', city: 'Hyderabad', state: 'Telangana', lat: 17.4156, lon: 78.4350, aliases: ['banjara hills', 'banjarahills', 'banjara hils', 'road no 1 banjara', 'road no 12'] },
  { name: 'Kondapur', category: 'Locality', city: 'Hyderabad', state: 'Telangana', lat: 17.4699, lon: 78.3578, aliases: ['kondapur', 'kondapoor', 'kondapure', 'kothaguda'] },
  { name: 'Kukatpally', category: 'Locality', city: 'Hyderabad', state: 'Telangana', lat: 17.4947, lon: 78.3996, aliases: ['kukatpally', 'kukatpalli', 'kphb', 'kukatpaly'] },
  { name: 'Secunderabad', category: 'Locality', city: 'Hyderabad', state: 'Telangana', lat: 17.4399, lon: 78.4983, aliases: ['secunderabad', 'secundrabad', 'secunderbad', 'sikandarabad'] },

  // --- High-Frequency Urban Localities (Bengaluru) ---
  { name: 'Koramangala', category: 'Locality', city: 'Bengaluru', state: 'Karnataka', lat: 12.9352, lon: 77.6245, aliases: ['koramangala', 'kormangla', 'kormangala', 'koramangla', 'kora mangala'] },
  { name: 'Indiranagar', category: 'Locality', city: 'Bengaluru', state: 'Karnataka', lat: 12.9784, lon: 77.6408, aliases: ['indiranagar', 'indranagar', 'indirangar', 'indiranagarr', '100ft road'] },
  { name: 'HSR Layout', category: 'Locality', city: 'Bengaluru', state: 'Karnataka', lat: 12.9121, lon: 77.6446, aliases: ['hsr', 'hsr layout', 'h s r layout', 'hsr sect 1', 'hsr sector'] },
  { name: 'Whitefield', category: 'Locality', city: 'Bengaluru', state: 'Karnataka', lat: 12.9698, lon: 77.7499, aliases: ['whitefield', 'whitfield', 'itpl', 'kadugodi'] },
  { name: 'Electronic City', category: 'Locality', city: 'Bengaluru', state: 'Karnataka', lat: 12.8399, lon: 77.6770, aliases: ['electronic city', 'ecity', 'electronics city', 'e-city'] },

  // --- High-Frequency Urban Localities (Mumbai & Delhi NCR) ---
  { name: 'Andheri West', category: 'Locality', city: 'Mumbai', state: 'Maharashtra', lat: 19.1363, lon: 72.8277, aliases: ['andheri', 'andheri west', 'andheri wst', 'lokhandwala', 'versova'] },
  { name: 'Bandra West', category: 'Locality', city: 'Mumbai', state: 'Maharashtra', lat: 19.0596, lon: 72.8295, aliases: ['bandra', 'bandra west', 'bandra wst', 'pali hill', 'carter road'] },
  { name: 'Connaught Place', category: 'Locality', city: 'Delhi', state: 'Delhi', lat: 28.6315, lon: 77.2167, aliases: ['connaught place', 'cp', 'conaught place', 'rajiv chowk'] },
  { name: 'Noida Sector 62', category: 'Locality', city: 'Noida', state: 'Uttar Pradesh', lat: 28.6280, lon: 77.3649, aliases: ['noida', 'noida 62', 'sector 62', 'sector 62 noida'] },
  { name: 'Gurugram Cyber City', category: 'Locality', city: 'Gurugram', state: 'Haryana', lat: 28.4952, lon: 77.0891, aliases: ['gurgaon', 'gurugram', 'cyber city', 'cyber hub', 'dlf phase 2'] },

  // --- Key Uttar Pradesh Districts & Varanasi Localities ---
  { name: 'Lanka, Varanasi', category: 'Locality', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.2818, lon: 82.9996, aliases: ['lanka', 'lanka varanasi', 'bhu gate', 'assi ghat'] },
  { name: 'Cantonment, Varanasi', category: 'Locality', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3283, lon: 82.9830, aliases: ['varanasi cantt', 'cantt varanasi', 'cantonment', 'cant', 'varanasi station'] },
  { name: 'Godowlia, Varanasi', category: 'Locality', city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3090, lon: 83.0070, aliases: ['godowlia', 'godowlia varanasi', 'dashashwamedh', 'kashi vishwanath'] },
  { name: 'Gomti Nagar, Lucknow', category: 'Locality', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8500, lon: 80.9990, aliases: ['gomti nagar', 'gomtinagar', 'gomti ngr'] },
  { name: 'Hazratganj, Lucknow', category: 'Locality', city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8530, lon: 80.9460, aliases: ['hazratganj', 'hazrat ganj', 'ganj'] },
  { name: 'Civil Lines, Prayagraj', category: 'Locality', city: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.4520, lon: 81.8340, aliases: ['allahabad', 'prayagraj', 'civil lines prayagraj', 'sangam'] },
  { name: 'Swaroop Nagar, Kanpur', category: 'Locality', city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4780, lon: 80.3200, aliases: ['kanpur', 'swaroop nagar', 'iit kanpur', 'mall road kanpur'] }
];

/**
 * Calculates Levenshtein Distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculates similarity score (0.0 to 1.0)
 */
function stringSimilarity(s1: string, s2: string): number {
  const clean1 = s1.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const clean2 = s2.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  if (clean1 === clean2) return 1.0;
  if (clean1.length === 0 || clean2.length === 0) return 0.0;

  // Substring bonus
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    const minLen = Math.min(clean1.length, clean2.length);
    const maxLen = Math.max(clean1.length, clean2.length);
    return 0.85 + 0.15 * (minLen / maxLen);
  }

  const dist = levenshteinDistance(clean1, clean2);
  const maxLen = Math.max(clean1.length, clean2.length);
  return Math.max(0.0, 1.0 - dist / maxLen);
}

/**
 * Performs fuzzy search against known Indian locations dictionary
 */
export function fuzzyFindIndianLocation(query: string): {
  preset: LocationPreset;
  confidence: number;
  isAutocorrected: boolean;
} | null {
  if (!query || query.trim().length < 2) return null;

  const rawClean = query.toLowerCase().trim();
  let bestPreset: LocationPreset | null = null;
  let highestScore = 0;

  for (const loc of KNOWN_INDIAN_LOCATIONS) {
    // Check main name
    const mainScore = stringSimilarity(rawClean, loc.name);
    if (mainScore > highestScore) {
      highestScore = mainScore;
      bestPreset = loc;
    }

    // Check city
    const cityScore = stringSimilarity(rawClean, loc.city);
    if (cityScore > highestScore) {
      highestScore = cityScore;
      bestPreset = loc;
    }

    // Check all aliases
    for (const alias of loc.aliases) {
      const aliasScore = stringSimilarity(rawClean, alias);
      if (aliasScore > highestScore) {
        highestScore = aliasScore;
        bestPreset = loc;
      }
    }
  }

  // Threshold: >= 0.65 similarity qualifies for match
  if (bestPreset && highestScore >= 0.65) {
    const isAutocorrected = rawClean !== bestPreset.name.toLowerCase() && rawClean !== bestPreset.city.toLowerCase();
    return {
      preset: bestPreset,
      confidence: highestScore,
      isAutocorrected,
    };
  }

  return null;
}

/**
 * Returns typeahead suggestions for location search query
 */
export function getFuzzyLocationSuggestions(query: string, limit: number = 5): LocationPreset[] {
  if (!query || query.trim().length < 1) {
    return KNOWN_INDIAN_LOCATIONS.slice(0, limit);
  }

  const rawClean = query.toLowerCase().trim();
  const scored: { preset: LocationPreset; score: number }[] = [];

  for (const loc of KNOWN_INDIAN_LOCATIONS) {
    let maxScore = Math.max(
      stringSimilarity(rawClean, loc.name),
      stringSimilarity(rawClean, loc.city),
      stringSimilarity(rawClean, loc.state)
    );

    for (const alias of loc.aliases) {
      maxScore = Math.max(maxScore, stringSimilarity(rawClean, alias));
    }

    if (maxScore >= 0.40) {
      scored.push({ preset: loc, score: maxScore });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.preset);
}
