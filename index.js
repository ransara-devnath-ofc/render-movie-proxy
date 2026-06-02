const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

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
