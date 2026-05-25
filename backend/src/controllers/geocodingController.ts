import { Request, Response } from 'express';

// Convert WGS-84 coordinates to GCJ-02 for mainland China map providers.
const wgs84ToGcj02 = (lat: number, lon: number): [number, number] => {
  const a = 6378245.0; // Semi-major axis.
  const ee = 0.00669342162296594323; // Eccentricity squared.

  let dLat = transformLat(lon - 105.0, lat - 35.0);
  let dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  const mgLat = lat + dLat;
  const mgLon = lon + dLon;
  return [mgLat, mgLon];
};

const transformLat = (lat: number, lon: number): number => {
  let ret =
    -100.0 +
    2.0 * lat +
    3.0 * lon +
    0.2 * lon * lon +
    0.1 * lat * lon +
    0.2 * Math.sqrt(Math.abs(lat));
  ret +=
    ((20.0 * Math.sin(6.0 * lat * Math.PI) + 20.0 * Math.sin(2.0 * lat * Math.PI)) * 2.0) / 3.0;
  ret +=
    ((20.0 * Math.sin(lon * Math.PI) + 40.0 * Math.sin((lon / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret +=
    ((160.0 * Math.sin((lon / 12.0) * Math.PI) + 320 * Math.sin((lon * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
};

const transformLon = (lat: number, lon: number): number => {
  let ret =
    300.0 +
    lat +
    2.0 * lon +
    0.1 * lat * lat +
    0.1 * lat * lon +
    0.1 * Math.sqrt(Math.abs(lat));
  ret +=
    ((20.0 * Math.sin(6.0 * lat * Math.PI) + 20.0 * Math.sin(2.0 * lat * Math.PI)) * 2.0) / 3.0;
  ret +=
    ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin((lat / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret +=
    ((150.0 * Math.sin((lat / 12.0) * Math.PI) + 300.0 * Math.sin((lat / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
};

// Rough mainland China bounding-box check.
const isInChina = (lat: number, lon: number): boolean => {
  return lat >= 18.0 && lat <= 54.0 && lon >= 73.0 && lon <= 135.0;
};

// Amap reverse geocoding for mainland China.
// Amap Web Service API only requires the key.
const fetchFromAmap = async (latNum: number, lonNum: number) => {
  const key = process.env.AMAP_API_KEY;
  
  if (!key) {
    throw new Error('AMAP_API_KEY not configured');
  }

  // Amap uses GCJ-02 coordinates.
  // Build request parameters for the Web Service API.
  const params: Record<string, string> = {
    key: key,
    location: `${lonNum},${latNum}`,
    radius: '1000',
    extensions: 'all',
    output: 'json'
  };

  // Build URL.
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `https://restapi.amap.com/v3/geocode/regeo?${queryString}`;
  
  try {
    // Add timeout control and detailed error handling.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout.
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ZJU-BS-Image-Manager/1.0',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response.');
      throw new Error(`Amap HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    if (data.status !== '1') {
      // Log provider errors with the API key masked.
      console.error('Amap API returned an error:', {
        status: data.status,
        info: data.info,
        infocode: data.infocode,
        url: url.replace(key, '***') // Mask API key.
      });
      throw new Error(`Amap API error: ${data.info || 'Unknown error'} (code: ${data.infocode || 'N/A'})`);
    }

    return data;
  } catch (error: any) {
    // Log network errors.
    if (error.name === 'AbortError') {
      throw new Error('Amap API request timed out after 10 seconds.');
    }
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      console.error('Amap API network connection failed:', {
        error: error.message,
        url: url.replace(key, '***'),
        stack: error.stack
      });
      throw new Error(`Amap API network connection failed: ${error.message}. Please check network access, Web Service API key type, and any IP allowlist settings.`);
    }
    throw error;
  }
};

// Baidu reverse geocoding as a China-region fallback.
const fetchFromBaidu = async (latNum: number, lonNum: number) => {
  const key = process.env.BAIDU_API_KEY;
  if (!key) {
    throw new Error('BAIDU_API_KEY not configured');
  }

  // Baidu expects provider-specific coordinates.
  const url = `https://api.map.baidu.com/reverse_geocoding/v3?ak=${key}&output=json&coordtype=gcj02ll&location=${latNum},${lonNum}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ZJU-BS-Image-Manager/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Baidu status ${response.status}`);
  }

  const data = await response.json() as any;
  if (data.status !== 0) {
    throw new Error(`Baidu API error: ${data.message || 'Unknown error'}`);
  }

  return data;
};

// Nominatim reverse geocoding for international fallback.
const fetchFromNominatim = async (latNum: number, lonNum: number) => {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lonNum}&addressdetails=1&zoom=18&accept-language=en`;
  const response = await fetch(nominatimUrl, {
    headers: {
      'User-Agent': 'ZJU-BS-Image-Manager/1.0',
      'Accept-Language': 'en'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim status ${response.status}`);
  }

  return response.json();
};

// Format provider-specific address payloads into a readable address.
const formatAddress = (data: any, source: 'amap' | 'baidu' | 'nominatim'): string => {
  const dedupe = (parts: string[]) =>
    parts.filter(Boolean).filter((part, idx, arr) => idx === 0 || part !== arr[idx - 1]);

  if (source === 'amap') {
    const regeocode = data.regeocode || {};
    const addressComponent = regeocode.addressComponent || {};
    
    const province = addressComponent.province || '';
    const city = addressComponent.city || addressComponent.district || '';
    const district = addressComponent.district || addressComponent.adcode || '';
    const township = addressComponent.township || '';
    const neighborhood = addressComponent.neighborhood?.name || '';
    const street = addressComponent.street || '';
    const streetNumber = addressComponent.streetNumber?.street || addressComponent.streetNumber?.number || '';
    
    // Build an address from administrative and street-level parts.
    const parts: string[] = [];
    if (province) parts.push(province);
    if (city && city !== province) parts.push(city);
    if (district && district !== city) parts.push(district);
    if (township) parts.push(township);
    if (neighborhood) parts.push(neighborhood);
    if (street) parts.push(street);
    if (streetNumber) parts.push(streetNumber);
    
    const formatted = dedupe(parts).join(' ').trim();
    return formatted || regeocode.formatted_address || 'Unknown location';
  }

  if (source === 'baidu') {
    const result = data.result || {};
    const addressComponent = result.addressComponent || {};
    
    const province = addressComponent.province || '';
    const city = addressComponent.city || '';
    const district = addressComponent.district || '';
    const street = addressComponent.street || '';
    const streetNumber = addressComponent.street_number || '';
    
    const parts: string[] = [];
    if (province) parts.push(province);
    if (city && city !== province) parts.push(city);
    if (district && district !== city) parts.push(district);
    if (street) parts.push(street);
    if (streetNumber) parts.push(streetNumber);
    
    const formatted = dedupe(parts).join(' ').trim();
    return formatted || result.formatted_address || 'Unknown location';
  }

  // Nominatim
    const addr = data.address || {};
    const country = addr.country || '';
    const province = addr.province || addr.state || '';
  // Prefer city, then fall back to other locality fields.
    const city = addr.city || addr.town || addr.municipality || addr.state_district || '';
    const district = addr.suburb || addr.district || addr.county || '';
    const street = addr.neighbourhood || addr.village || addr.road || '';
  
  const parts: string[] = [];
  if (country && country !== 'China') parts.push(country);
  if (province) parts.push(province);
  if (city && city !== province) parts.push(city);
  if (district && district !== city) parts.push(district);
  if (street) parts.push(street);
  
  const formatted = dedupe(parts).join(' ').trim();
  return formatted || data.display_name || 'Unknown location';
};

// Convert GPS coordinate inputs to decimal degrees.
// Supports degree-minute-second arrays, numeric values, and strings.
const convertGPSCoordinate = (coord: any): number => {
  if (typeof coord === 'number') {
    return coord;
  }
  
  if (Array.isArray(coord) && coord.length >= 3) {
    // Degree-minute-second format: [degrees, minutes, seconds].
    const degrees = Number(coord[0]) || 0;
    const minutes = Number(coord[1]) || 0;
    const seconds = Number(coord[2]) || 0;
    return degrees + minutes / 60 + seconds / 3600;
  }
  
  if (typeof coord === 'string') {
    // Try to parse string formats.
    // 1. Parse a plain decimal degree value.
    const num = parseFloat(coord);
    if (!isNaN(num) && coord.indexOf(',') === -1) {
      return num;
    }
    
    // 2. Parse comma-separated degree-minute-second values such as "22,32,23.54".
    const parts = coord.split(',').map(s => s.trim()).filter(s => s);
    if (parts.length >= 3) {
      const degrees = Number(parts[0]) || 0;
      const minutes = Number(parts[1]) || 0;
      const seconds = Number(parts[2]) || 0;
      return degrees + minutes / 60 + seconds / 3600;
    }
    
    // 3. Two parts may represent degree-minute format.
    if (parts.length === 2) {
      const degrees = Number(parts[0]) || 0;
      const minutes = Number(parts[1]) || 0;
      return degrees + minutes / 60;
    }
  }
  
  return NaN;
};

// Geocoding proxy to avoid browser-side CORS issues.
export const reverseGeocode = async (req: Request, res: Response) => {
  try {
    let { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: 'Missing latitude or longitude parameters.'
      });
    }

    // Handle possible degree-minute-second array values.
    let latNum: number;
    let lonNum: number;

    // Try to parse JSON array values.
    try {
      const latParsed = typeof lat === 'string' ? JSON.parse(lat) : lat;
      const lonParsed = typeof lon === 'string' ? JSON.parse(lon) : lon;
      latNum = convertGPSCoordinate(latParsed);
      lonNum = convertGPSCoordinate(lonParsed);
    } catch {
      // If the value is not JSON, convert it directly.
      latNum = convertGPSCoordinate(lat);
      lonNum = convertGPSCoordinate(lon);
    }

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        success: false,
        message: `Invalid latitude or longitude parameters: lat=${lat}, lon=${lon}`
      });
    }

    // Validate coordinate range.
    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return res.status(400).json({
        success: false,
        message: `Latitude or longitude is out of range: lat=${latNum}, lon=${lonNum}`
      });
    }

    console.log(`Received GPS coordinates: raw lat=${lat}, lon=${lon}; converted lat=${latNum}, lon=${lonNum}`);

    // Convert coordinates for China-region providers when needed.
    const inChina = isInChina(latNum, lonNum);
    let convertedLat = latNum;
    let convertedLon = lonNum;

    if (inChina) {
      // Convert GPS coordinates from WGS-84 to GCJ-02.
      [convertedLat, convertedLon] = wgs84ToGcj02(latNum, lonNum);
      console.log(`Coordinate conversion: WGS-84(${latNum}, ${lonNum}) -> GCJ-02(${convertedLat}, ${convertedLon})`);
    } else {
      console.log(`Coordinates are outside mainland China. Using original WGS-84 coordinates: (${latNum}, ${lonNum})`);
    }

    // Try multiple data sources in priority order.
    let data: any;
    let source: 'amap' | 'baidu' | 'nominatim' = 'nominatim';
    let error: Error | null = null;

    // 1. Prefer Amap for mainland China.
    if (inChina) {
      try {
        data = await fetchFromAmap(convertedLat, convertedLon);
        source = 'amap';
        console.log('Amap API succeeded.');
      } catch (err: any) {
        console.error('Amap API failed:', {
          message: err.message,
          error: err.name,
          coordinates: `(${convertedLat}, ${convertedLon})`
        });
        error = err;
      }
    }

    // 2. If Amap fails, try Baidu Maps.
    if (!data && inChina) {
      try {
        data = await fetchFromBaidu(convertedLat, convertedLon);
        source = 'baidu';
        console.log('Using Baidu Maps API.');
      } catch (err: any) {
        console.warn('Baidu Maps API failed:', err.message);
        error = err;
      }
    }

    // 3. If China-region providers fail or are not applicable, use Nominatim with WGS-84.
    if (!data) {
    try {
      data = await fetchFromNominatim(latNum, lonNum);
        source = 'nominatim';
        console.log('Using Nominatim API.');
      } catch (err: any) {
        console.error('All geocoding services failed:', err);
        throw new Error('Unable to resolve location. Please check network access or API key configuration.');
      }
    }

    // Format address.
    const formattedAddress = formatAddress(data, source);

    res.json({
      success: true,
      data: {
        address: formattedAddress,
        raw: data,
        source: source,
        coordinateSystem: inChina ? 'GCJ-02' : 'WGS-84'
      }
    });
  } catch (error: any) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resolve location. Please try again later.'
    });
  }
};

// Diagnose Amap API connectivity.
export const diagnoseAmapAPI = async (req: Request, res: Response) => {
  try {
    const key = process.env.AMAP_API_KEY;
    
    const diagnostics: any = {
      hasApiKey: !!key,
      apiKeyType: 'Web Service API key, no security key required',
      nodeVersion: process.version,
      testUrl: 'https://restapi.amap.com/v3/geocode/regeo',
      recommendations: []
    };

    if (!key) {
      diagnostics.recommendations.push('Configure AMAP_API_KEY in the .env file.');
      return res.json({
        success: false,
        diagnostics
      });
    }

    // Test network connectivity.
    try {
      const testUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=120.153576,30.287459&radius=1000&extensions=all&output=json`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testUrl, {
        headers: {
          'User-Agent': 'ZJU-BS-Image-Manager/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json() as any;
        if (data.status === '1') {
          diagnostics.networkTest = 'success';
          diagnostics.apiResponse = 'normal';
          diagnostics.recommendations.push('API connection is healthy.');
        } else {
          diagnostics.networkTest = 'success';
          diagnostics.apiResponse = `failed: ${data.info || 'Unknown error'}`;
          diagnostics.apiErrorCode = data.infocode;
          
          if (data.infocode === '10001' || data.info?.includes('KEY')) {
            diagnostics.recommendations.push('The API key is invalid or has the wrong type. Use a Web Service key and verify configuration.');
          } else if (data.infocode === '10003' || data.info?.includes('allowlist')) {
            diagnostics.recommendations.push('IP allowlist restriction detected. Add the server IP to the allowlist or disable the restriction for local testing.');
          } else {
            diagnostics.recommendations.push(`API returned an error: ${data.info}`);
          }
        }
      } else {
        diagnostics.networkTest = `HTTP ${response.status}`;
        diagnostics.recommendations.push(`HTTP error: ${response.status}`);
      }
    } catch (error: any) {
      diagnostics.networkTest = 'failed';
      diagnostics.networkError = error.message;
      
      if (error.name === 'AbortError') {
        diagnostics.recommendations.push('Request timed out. Check network connectivity or firewall settings.');
      } else if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
        diagnostics.recommendations.push('Network connection failed. Check internet access, firewall rules, and proxy settings.');
      } else if (error.message?.includes('ENOTFOUND')) {
        diagnostics.recommendations.push('DNS resolution failed. Check network connectivity.');
      } else {
        diagnostics.recommendations.push(`Unknown error: ${error.message}`);
      }
    }

    res.json({
      success: diagnostics.networkTest === 'success' && diagnostics.apiResponse === 'normal',
      diagnostics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Diagnostics failed.'
    });
  }
};

