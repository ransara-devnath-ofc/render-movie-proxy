const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;
const fuckingfast = require('./api/ffast.js');
const config = {
  API_KEY: "anjubot3"
}

app.get('/api/fuckingfast', async (req, res) => {
  const { url, apikey } = req.query;

  // Check for API key
  if (!apikey || apikey !== config.API_KEY) {
    return res.status(401).json({
      status: false,
      error: "Unauthorized. Invalid API key.",
    });
  }

  // Validate URL
  if (!url) {
    return res.status(400).json({
      status: false,
      error: "No URL provided. Please provide a 'url' parameter.",
    });
  }

  // Check if it's a valid fuckingfast URL
  if (!url.includes('fuckingfast.co')) {
    return res.status(400).json({
      status: false,
      error: "Invalid URL. Only fuckingfast.co URLs are supported.",
    });
  }

  try {
    // Resolve the URL to get direct link
    const directLink = await fuckingfast.resolveFuckingFastUrl(url);
    
    // Get file info
    const fileInfo = await fuckingfast.getFileInfo(url);

    if (!directLink && !fileInfo) {
      return res.status(500).json({
        status: false,
        error: "Failed to resolve URL or fetch file information.",
      });
    }

    return res.status(200).json({
      status: true,
      createdBy: "MR.RASHMIKA",
      data: {
        originalUrl: url,
        directLink: directLink,
        fileInfo: fileInfo || null
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message
    });
  }
});

// Optional: Batch endpoint for multiple URLs
app.post('/api/fuckingfast/batch', async (req, res) => {
  const { urls, apikey } = req.body;

  // Check for API key
  if (!apikey || apikey !== config.API_KEY) {
    return res.status(401).json({
      status: false,
      error: "Unauthorized. Invalid API key.",
    });
  }

  // Validate URLs
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      status: false,
      error: "No URLs provided. Please provide an array of URLs in the request body.",
    });
  }

  // Validate all URLs
  const invalidUrls = urls.filter(url => !url.includes('fuckingfast.co'));
  if (invalidUrls.length > 0) {
    return res.status(400).json({
      status: false,
      error: "Some URLs are invalid. Only fuckingfast.co URLs are supported.",
      invalidUrls: invalidUrls
    });
  }

  try {
    // Resolve multiple URLs in parallel
    const results = await fuckingfast.resolveMultipleFuckingFastUrls(urls);

    return res.status(200).json({
      status: true,
      createdBy: "MR.RASHMIKA",
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message
    });
  }
});

// Optional: Sequential batch endpoint (with delay)
app.post('/api/fuckingfast/batch-sequential', async (req, res) => {
  const { urls, apikey, delay } = req.body;

  // Check for API key
  if (!apikey || apikey !== config.API_KEY) {
    return res.status(401).json({
      status: false,
      error: "Unauthorized. Invalid API key.",
    });
  }

  // Validate URLs
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      status: false,
      error: "No URLs provided. Please provide an array of URLs in the request body.",
    });
  }

  // Validate all URLs
  const invalidUrls = urls.filter(url => !url.includes('fuckingfast.co'));
  if (invalidUrls.length > 0) {
    return res.status(400).json({
      status: false,
      error: "Some URLs are invalid. Only fuckingfast.co URLs are supported.",
      invalidUrls: invalidUrls
    });
  }

  try {
    // Resolve multiple URLs sequentially with optional delay
    const delayMs = delay ? parseInt(delay) : 1000;
    const results = await fuckingfast.resolveMultipleFuckingFastUrlsSequential(urls, delayMs);

    return res.status(200).json({
      status: true,
      createdBy: "MR.RASHMIKA",
      data: results,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message
    });
  }
});

// Optional: File info only endpoint
app.get('/api/fuckingfast/info', async (req, res) => {
  const { url, apikey } = req.query;

  // Check for API key
  if (!apikey || apikey !== config.API_KEY) {
    return res.status(401).json({
      status: false,
      error: "Unauthorized. Invalid API key.",
    });
  }

  // Validate URL
  if (!url) {
    return res.status(400).json({
      status: false,
      error: "No URL provided. Please provide a 'url' parameter.",
    });
  }

  // Check if it's a valid fuckingfast URL
  if (!url.includes('fuckingfast.co')) {
    return res.status(400).json({
      status: false,
      error: "Invalid URL. Only fuckingfast.co URLs are supported.",
    });
  }

  try {
    // Get file info only
    const fileInfo = await fuckingfast.getFileInfo(url);

    if (!fileInfo) {
      return res.status(500).json({
        status: false,
        error: "Failed to fetch file information.",
      });
    }

    return res.status(200).json({
      status: true,
      createdBy: "MR.RASHMIKA",
      data: fileInfo,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message
    });
  }
});

// Basic health check to keep it awake using UptimeRobot
app.get('/', (req, res) => {
    res.send('Proxy is online and active.');
});

// The proxy streaming endpoint
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send('Error: Missing "url" parameter.');
    }

    try {
        console.log(`[Proxy] Routing stream request for: ${targetUrl}`);

        const response = await axios({
            method: 'GET',
            url: targetUrl,
            responseType: 'stream',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://movie-box.co/",
                "Origin": "https://movie-box.co"
            }
        });

        // Pass along the video content-type header so the bot receives it cleanly
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }

        // Pipe the incoming movie server stream directly back to the response
        response.data.pipe(res);

    } catch (err) {
        console.error(`[Proxy Error]: ${err.message}`);
        res.status(500).send(`Proxy failed to fetch video: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Render proxy server streaming on port ${PORT}`);
});
