// fuckingfast.cjs
const cloudscraper = require('cloudscraper');
const cheerio = require('cheerio');

/**
 * Gets cookies including Cloudflare clearance by solving the challenge
 * @param {string} url - The fuckingfast URL
 * @returns {Promise<Object>} - Cookies object
 */
async function getCloudflareClearance(url) {
  try {
    console.error(`[FuckingFast] Getting Cloudflare clearance for: ${url}`);
    
    // Use cloudscraper to solve the Cloudflare challenge
    const response = await cloudscraper.get({
      uri: url,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'sec-ch-ua': '"Not)A;Brand";v="24", "Microsoft Edge";v="149", "Chromium";v="149"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
    
    // Extract cookies from response
    const cookies = {};
    if (response.headers['set-cookie']) {
      response.headers['set-cookie'].forEach(cookie => {
        const parts = cookie.split(';')[0].split('=');
        if (parts.length === 2) {
          cookies[parts[0].trim()] = parts[1].trim();
        }
      });
    }
    
    // Also get cookies from the request object
    if (response.request && response.request.headers && response.request.headers.cookie) {
      response.request.headers.cookie.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length === 2) {
          cookies[parts[0].trim()] = parts[1].trim();
        }
      });
    }
    
    console.error('[FuckingFast] Got cookies:', Object.keys(cookies).join(', '));
    
    if (cookies['cf_clearance']) {
      console.error('[FuckingFast] Cloudflare clearance obtained');
    }
    
    return {
      cookies,
      html: response.body
    };
    
  } catch (err) {
    console.error(`[FuckingFast] Failed to get clearance: ${err.message}`);
    
    // Even on error, try to extract cookies from the error response
    if (err.response && err.response.headers && err.response.headers['set-cookie']) {
      const cookies = {};
      err.response.headers['set-cookie'].forEach(cookie => {
        const parts = cookie.split(';')[0].split('=');
        if (parts.length === 2) {
          cookies[parts[0].trim()] = parts[1].trim();
        }
      });
      return { cookies, html: err.response.body };
    }
    
    return { cookies: {}, html: null };
  }
}

/**
 * Extracts download URL from HTML/JavaScript
 */
function extractDownloadUrl(html) {
  if (!html) return null;
  
  const $ = cheerio.load(html);
  let downloadUrl = null;
  
  $('script').each((i, el) => {
    const scriptContent = $(el).html() || '';
    if (scriptContent.length < 10) return;
    
    // Primary: window.open("url")
    const match = scriptContent.match(/window\.open\(["']([^"']+)["']\)/);
    if (match && match[1].includes('dl.fuckingfast.co')) {
      downloadUrl = match[1];
      console.error(`[FuckingFast] Found in window.open: ${downloadUrl}`);
      return false;
    }
    
    // Alternative: Direct URL string
    const altMatch = scriptContent.match(/["'](https:\/\/dl\.fuckingfast\.co\/[^"']+)["']/);
    if (altMatch) {
      downloadUrl = altMatch[1];
      console.error(`[FuckingFast] Found direct URL: ${downloadUrl}`);
      return false;
    }
    
    // Base64 encoded
    const b64Match = scriptContent.match(/atob\(["']([A-Za-z0-9+/=]+)["']\)/);
    if (b64Match) {
      try {
        const decoded = Buffer.from(b64Match[1], 'base64').toString('utf-8');
        if (decoded.includes('dl.fuckingfast.co')) {
          downloadUrl = decoded;
          console.error(`[FuckingFast] Found encoded: ${downloadUrl}`);
          return false;
        }
      } catch (e) {}
    }
    
    // Any dl.fuckingfast.co URL
    const anyMatch = scriptContent.match(/https:\/\/dl\.fuckingfast\.co\/[^\s"'<>]+/);
    if (anyMatch) {
      downloadUrl = anyMatch[0];
      console.error(`[FuckingFast] Found any URL: ${downloadUrl}`);
      return false;
    }
  });
  
  return downloadUrl;
}

/**
 * Triggers the download (sends POST to /f/FILEID/dl)
 */
async function triggerDownload(fileId, cookies, referer) {
  try {
    console.error(`[FuckingFast] Triggering download for: ${fileId}`);
    
    // Convert cookies object to string
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    console.error(`[FuckingFast] Using cookies: ${cookieString.substring(0, 100)}...`);
    
    const response = await cloudscraper.post({
      uri: `https://fuckingfast.co/f/${fileId}/dl`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cookie': cookieString,
        'Origin': 'https://fuckingfast.co',
        'Referer': referer || `https://fuckingfast.co/${fileId}`,
        'sec-ch-ua': '"Not)A;Brand";v="24", "Microsoft Edge";v="149", "Chromium";v="149"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'Content-Length': '0'
      },
      resolveWithFullResponse: true,
      simple: false // Don't throw on non-200 status
    });
    
    console.error(`[FuckingFast] Download trigger status: ${response.statusCode}`);
    
    // Check for new cookies after the POST
    if (response.headers['set-cookie']) {
      response.headers['set-cookie'].forEach(cookie => {
        const parts = cookie.split(';')[0].split('=');
        if (parts.length === 2) {
          cookies[parts[0].trim()] = parts[1].trim();
        }
      });
    }
    
    return true;
  } catch (err) {
    console.error(`[FuckingFast] Download trigger error: ${err.message}`);
    return false;
  }
}

/**
 * Main resolution function
 */
async function resolveFuckingFastUrl(fuckingfastUrl) {
  try {
    let cleanUrl = fuckingfastUrl.split('#')[0].trim();
    console.error(`[FuckingFast] Resolving: ${cleanUrl}`);
    
    if (!cleanUrl || !cleanUrl.includes('fuckingfast.co')) {
      throw new Error('Invalid URL');
    }

    const urlParts = cleanUrl.split('/').filter(p => p);
    const fileId = urlParts[urlParts.length - 1];
    console.error(`[FuckingFast] File ID: ${fileId}`);

    // Step 1: Get Cloudflare clearance and page content
    const { cookies, html } = await getCloudflareClearance(cleanUrl);
    
    if (!html) {
      console.error('[FuckingFast] Failed to get page content');
      return null;
    }

    // Step 2: Try to find download URL in the HTML
    let downloadUrl = extractDownloadUrl(html);

    // Step 3: If URL found in page, trigger the download POST
    if (downloadUrl) {
      await triggerDownload(fileId, cookies, cleanUrl);
      return downloadUrl;
    }

    // Step 4: If no URL found, try to trigger download and then re-fetch page
    console.error('[FuckingFast] No URL in initial page, triggering download first...');
    
    await triggerDownload(fileId, cookies, cleanUrl);
    
    // Step 5: Re-fetch the page with cookies to get the URL
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const secondResponse = await cloudscraper.get({
      uri: cleanUrl,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': cookieString,
        'Referer': cleanUrl,
        'sec-ch-ua': '"Not)A;Brand";v="24", "Microsoft Edge";v="149", "Chromium";v="149"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });
    
    const secondHtml = typeof secondResponse === 'string' ? secondResponse : secondResponse.body;
    downloadUrl = extractDownloadUrl(secondHtml);

    if (downloadUrl) {
      return downloadUrl;
    }

    // Step 6: Try direct download URL pattern
    const directUrl = `https://dl.fuckingfast.co/dl/${fileId}`;
    console.error(`[FuckingFast] Falling back to direct URL: ${directUrl}`);
    return directUrl;

  } catch (err) {
    console.error(`[FuckingFast] Error: ${err.message}`);
    return null;
  }
}

/**
 * Get file info
 */
async function getFileInfo(fuckingfastUrl) {
  try {
    const cleanUrl = fuckingfastUrl.split('#')[0].trim();
    const { html } = await getCloudflareClearance(cleanUrl);
    
    if (!html) return null;

    const $ = cheerio.load(html);
    const fileName = $('span.text-xl').first().text().trim();
    const fileSize = $('span.text-gray-500').first().text().trim();
    const sizeMatch = fileSize.match(/Size:\s*([\d.]+(?:GB|MB|KB))/);
    const downloadsMatch = fileSize.match(/Downloads:\s*(\d+)/);
    
    return {
      fileName: fileName || null,
      fileSize: sizeMatch ? sizeMatch[1] : null,
      downloads: downloadsMatch ? parseInt(downloadsMatch[1]) : null,
      url: fuckingfastUrl
    };
  } catch (err) {
    console.error(`[FuckingFast] File info error: ${err.message}`);
    return null;
  }
}

/**
 * Batch resolvers
 */
async function resolveMultipleFuckingFastUrls(urls) {
  const results = await Promise.all(urls.map(async (url) => {
    try {
      const directUrl = await resolveFuckingFastUrl(url);
      return { original: url, direct: directUrl, success: !!directUrl };
    } catch (err) {
      return { original: url, direct: null, success: false, error: err.message };
    }
  }));
  return results;
}

async function resolveMultipleFuckingFastUrlsSequential(urls, delayMs = 1000) {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const directUrl = await resolveFuckingFastUrl(urls[i]);
      results.push({ original: urls[i], direct: directUrl, success: !!directUrl });
    } catch (err) {
      results.push({ original: urls[i], direct: null, success: false, error: err.message });
    }
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

module.exports = {
  resolveFuckingFastUrl,
  resolveMultipleFuckingFastUrls,
  resolveMultipleFuckingFastUrlsSequential,
  getFileInfo
};
