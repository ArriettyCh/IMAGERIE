import { Request, Response } from 'express';

// WGS-84 转 GCJ-02 坐标转换（火星坐标系）
// 这是解决中国地区定位不准确的关键
const wgs84ToGcj02 = (lat: number, lon: number): [number, number] => {
  const a = 6378245.0; // 长半轴
  const ee = 0.00669342162296594323; // 偏心率平方

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

// 判断是否在中国境内（粗略判断）
const isInChina = (lat: number, lon: number): boolean => {
  return lat >= 18.0 && lat <= 54.0 && lon >= 73.0 && lon <= 135.0;
};

// 高德地图逆地理编码（最准确的中国地区服务）
// 注意：Web服务API不需要安全密钥，直接使用key即可
const fetchFromAmap = async (latNum: number, lonNum: number) => {
  const key = process.env.AMAP_API_KEY;
  
  if (!key) {
    throw new Error('AMAP_API_KEY not configured');
  }

  // 高德地图使用GCJ-02坐标系
  // 构建参数对象（Web服务API只需要key，不需要安全密钥）
  const params: Record<string, string> = {
    key: key,
    location: `${lonNum},${latNum}`,
    radius: '1000',
    extensions: 'all',
    output: 'json'
  };

  // 构建URL
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const url = `https://restapi.amap.com/v3/geocode/regeo?${queryString}`;
  
  try {
    // 添加超时控制和更详细的错误处理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ZJU-BS-Image-Manager/1.0',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法读取错误信息');
      throw new Error(`Amap HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    if (data.status !== '1') {
      // 详细记录API返回的错误信息
      console.error('高德地图API返回错误:', {
        status: data.status,
        info: data.info,
        infocode: data.infocode,
        url: url.replace(key, '***') // 隐藏API密钥
      });
      throw new Error(`Amap API error: ${data.info || 'Unknown error'} (code: ${data.infocode || 'N/A'})`);
    }

    return data;
  } catch (error: any) {
    // 详细记录网络错误
    if (error.name === 'AbortError') {
      throw new Error('高德地图API请求超时（超过10秒）');
    }
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      console.error('高德地图API网络连接失败:', {
        error: error.message,
        url: url.replace(key, '***'),
        stack: error.stack
      });
      throw new Error(`高德地图API网络连接失败: ${error.message}。请检查：1) 网络连接 2) API密钥类型是否为"Web服务" 3) 是否配置了IP白名单`);
    }
    throw error;
  }
};

// 百度地图逆地理编码（备用中国服务）
const fetchFromBaidu = async (latNum: number, lonNum: number) => {
  const key = process.env.BAIDU_API_KEY;
  if (!key) {
    throw new Error('BAIDU_API_KEY not configured');
  }

  // 百度地图使用BD-09坐标系，需要先转换
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

// 调用 Nominatim（国际服务，中国地区精度较低）
const fetchFromNominatim = async (latNum: number, lonNum: number) => {
  const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lonNum}&addressdetails=1&zoom=18&accept-language=zh-CN,zh,en`;
  const response = await fetch(nominatimUrl, {
    headers: {
      'User-Agent': 'ZJU-BS-Image-Manager/1.0',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim status ${response.status}`);
  }

  return response.json();
};

// 统一格式化地址
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
    
    // 构建地址：省 市 区 街道/乡镇 详细地址
    const parts: string[] = [];
    if (province) parts.push(province);
    if (city && city !== province) parts.push(city);
    if (district && district !== city) parts.push(district);
    if (township) parts.push(township);
    if (neighborhood) parts.push(neighborhood);
    if (street) parts.push(street);
    if (streetNumber) parts.push(streetNumber);
    
    const formatted = dedupe(parts).join(' ').trim();
    return formatted || regeocode.formatted_address || '未知位置';
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
    return formatted || result.formatted_address || '未知位置';
  }

  // Nominatim
    const addr = data.address || {};
    const country = addr.country || '';
    const province = addr.province || addr.state || '';
  // 优先使用city，如果没有则尝试其他字段，确保显示"市"
    const city = addr.city || addr.town || addr.municipality || addr.state_district || '';
    const district = addr.suburb || addr.district || addr.county || '';
    const street = addr.neighbourhood || addr.village || addr.road || '';
  
  const parts: string[] = [];
  if (country && country !== '中国') parts.push(country);
  if (province) parts.push(province);
  if (city && city !== province) parts.push(city);
  if (district && district !== city) parts.push(district);
  if (street) parts.push(street);
  
  const formatted = dedupe(parts).join(' ').trim();
  return formatted || data.display_name || '未知位置';
};

// 将GPS坐标转换为十进制度数格式
// 支持数组格式（度分秒）、数字格式（十进制度数）和字符串格式
const convertGPSCoordinate = (coord: any): number => {
  if (typeof coord === 'number') {
    return coord;
  }
  
  if (Array.isArray(coord) && coord.length >= 3) {
    // 度分秒格式：[度, 分, 秒]
    const degrees = Number(coord[0]) || 0;
    const minutes = Number(coord[1]) || 0;
    const seconds = Number(coord[2]) || 0;
    return degrees + minutes / 60 + seconds / 3600;
  }
  
  if (typeof coord === 'string') {
    // 尝试解析字符串格式
    // 1. 先尝试直接解析为数字（十进制度数）
    const num = parseFloat(coord);
    if (!isNaN(num) && coord.indexOf(',') === -1) {
      return num;
    }
    
    // 2. 尝试解析逗号分隔的度分秒格式，如 "22,32,23.54"
    const parts = coord.split(',').map(s => s.trim()).filter(s => s);
    if (parts.length >= 3) {
      const degrees = Number(parts[0]) || 0;
      const minutes = Number(parts[1]) || 0;
      const seconds = Number(parts[2]) || 0;
      return degrees + minutes / 60 + seconds / 3600;
    }
    
    // 3. 如果只有两个部分，可能是度分格式
    if (parts.length === 2) {
      const degrees = Number(parts[0]) || 0;
      const minutes = Number(parts[1]) || 0;
      return degrees + minutes / 60;
    }
  }
  
  return NaN;
};

// 地理编码代理 - 通过后端转发请求避免CORS问题
export const reverseGeocode = async (req: Request, res: Response) => {
  try {
    let { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: '缺少经纬度参数'
      });
    }

    // 处理可能的数组格式（度分秒）
    let latNum: number;
    let lonNum: number;

    // 尝试解析为JSON数组格式
    try {
      const latParsed = typeof lat === 'string' ? JSON.parse(lat) : lat;
      const lonParsed = typeof lon === 'string' ? JSON.parse(lon) : lon;
      latNum = convertGPSCoordinate(latParsed);
      lonNum = convertGPSCoordinate(lonParsed);
    } catch {
      // 如果不是JSON格式，直接转换
      latNum = convertGPSCoordinate(lat);
      lonNum = convertGPSCoordinate(lon);
    }

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({
        success: false,
        message: `无效的经纬度参数: lat=${lat}, lon=${lon}`
      });
    }

    // 验证坐标范围
    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return res.status(400).json({
        success: false,
        message: `经纬度超出有效范围: lat=${latNum}, lon=${lonNum}`
      });
    }

    console.log(`接收到的GPS坐标: 原始输入 lat=${lat}, lon=${lon}, 转换后 lat=${latNum}, lon=${lonNum}`);

    // 判断是否在中国境内，如果是则进行坐标转换
    const inChina = isInChina(latNum, lonNum);
    let convertedLat = latNum;
    let convertedLon = lonNum;

    if (inChina) {
      // GPS坐标（WGS-84）转换为火星坐标系（GCJ-02）
      [convertedLat, convertedLon] = wgs84ToGcj02(latNum, lonNum);
      console.log(`坐标转换: WGS-84(${latNum}, ${lonNum}) -> GCJ-02(${convertedLat}, ${convertedLon})`);
    } else {
      console.log(`坐标不在中国境内，使用原始WGS-84坐标: (${latNum}, ${lonNum})`);
    }

    // 尝试多个数据源，按优先级顺序
    let data: any;
    let source: 'amap' | 'baidu' | 'nominatim' = 'nominatim';
    let error: Error | null = null;

    // 1. 优先使用高德地图（中国地区最准确）
    if (inChina) {
      try {
        data = await fetchFromAmap(convertedLat, convertedLon);
        source = 'amap';
        console.log('✓ 使用高德地图API成功');
      } catch (err: any) {
        console.error('✗ 高德地图API失败:', {
          message: err.message,
          error: err.name,
          coordinates: `(${convertedLat}, ${convertedLon})`
        });
        error = err;
      }
    }

    // 2. 如果高德失败，尝试百度地图
    if (!data && inChina) {
      try {
        data = await fetchFromBaidu(convertedLat, convertedLon);
        source = 'baidu';
        console.log('使用百度地图API');
      } catch (err: any) {
        console.warn('百度地图API失败:', err.message);
        error = err;
      }
    }

    // 3. 如果都失败或不在中国，使用Nominatim（使用原始WGS-84坐标）
    if (!data) {
    try {
      data = await fetchFromNominatim(latNum, lonNum);
        source = 'nominatim';
        console.log('使用Nominatim API');
      } catch (err: any) {
        console.error('所有地理编码服务都失败:', err);
        throw new Error('无法获取位置信息，请检查网络连接或配置API密钥');
      }
    }

    // 格式化地址
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
    console.error('地理编码错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '解析位置信息失败，请稍后再试'
    });
  }
};

// 诊断高德地图API连接（用于排查问题）
export const diagnoseAmapAPI = async (req: Request, res: Response) => {
  try {
    const key = process.env.AMAP_API_KEY;
    
    const diagnostics: any = {
      hasApiKey: !!key,
      apiKeyType: 'Web服务API（不需要安全密钥）',
      nodeVersion: process.version,
      testUrl: 'https://restapi.amap.com/v3/geocode/regeo',
      recommendations: []
    };

    if (!key) {
      diagnostics.recommendations.push('请在 .env 文件中配置 AMAP_API_KEY');
      return res.json({
        success: false,
        diagnostics
      });
    }

    // 测试网络连接
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
          diagnostics.networkTest = '成功';
          diagnostics.apiResponse = '正常';
          diagnostics.recommendations.push('✓ API连接正常，可以正常使用');
        } else {
          diagnostics.networkTest = '成功';
          diagnostics.apiResponse = `失败: ${data.info || '未知错误'}`;
          diagnostics.apiErrorCode = data.infocode;
          
          if (data.infocode === '10001' || data.info?.includes('KEY')) {
            diagnostics.recommendations.push('❌ API密钥无效或类型错误。请确保：1) 申请的是"Web服务"类型的key 2) key已正确配置');
          } else if (data.infocode === '10003' || data.info?.includes('白名单')) {
            diagnostics.recommendations.push('❌ IP白名单限制。请在控制台添加服务器IP到白名单，或暂时关闭白名单限制');
          } else {
            diagnostics.recommendations.push(`❌ API返回错误: ${data.info}`);
          }
        }
      } else {
        diagnostics.networkTest = `HTTP ${response.status}`;
        diagnostics.recommendations.push(`❌ HTTP错误: ${response.status}`);
      }
    } catch (error: any) {
      diagnostics.networkTest = '失败';
      diagnostics.networkError = error.message;
      
      if (error.name === 'AbortError') {
        diagnostics.recommendations.push('❌ 请求超时。请检查网络连接或防火墙设置');
      } else if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
        diagnostics.recommendations.push('❌ 网络连接失败。请检查：1) 服务器能否访问互联网 2) 防火墙是否阻止了连接 3) 代理设置是否正确');
      } else if (error.message?.includes('ENOTFOUND')) {
        diagnostics.recommendations.push('❌ DNS解析失败。请检查网络连接');
      } else {
        diagnostics.recommendations.push(`❌ 未知错误: ${error.message}`);
      }
    }

    res.json({
      success: diagnostics.networkTest === '成功' && diagnostics.apiResponse === '正常',
      diagnostics
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '诊断失败'
    });
  }
};

