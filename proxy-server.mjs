import express from 'express';
import { gotScraping } from 'got-scraping';

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

    console.log(`[Proxy] Routing stream request for: ${targetUrl}`);

    try {
        const stream = gotScraping.stream(targetUrl, {
            headerGeneratorOptions: {
                browsers: [{ name: 'edge', minVersion: 149 }],
                devices: ['desktop'],
                operatingSystems: ['windows'],
            },
            headers: {
                'Referer': 'https://movie-box.co/',
                'Origin': 'https://movie-box.co',
            },
            followRedirect: true,
            throwHttpErrors: true,
        });

        // Forward useful response headers as soon as they arrive
        stream.on('response', (response) => {
            const forward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
            for (const header of forward) {
                if (response.headers[header]) {
                    res.setHeader(header, response.headers[header]);
                }
            }
        });

        stream.on('error', (err) => {
            console.error(`[Proxy Error]: ${err.message}`);
            if (!res.headersSent) {
                res.status(500).send(`Proxy failed to fetch stream: ${err.message}`);
            } else {
                res.destroy();
            }
        });

        stream.pipe(res);

    } catch (err) {
        console.error(`[Proxy Error]: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).send(`Proxy failed to fetch stream: ${err.message}`);
        }
    }
});

app.listen(PORT, () => {
    console.log(`Render proxy server streaming on port ${PORT}`);
});
