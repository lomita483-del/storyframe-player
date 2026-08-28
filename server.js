const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your frontend app can talk to this backend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/api/get-stream', async (req, res) => {
    const movieId = req.query.id; // Expects TMDb or IMDb ID
    if (!movieId) return res.status(400).json({ error: 'Missing movie ID' });

    // Target a public embed platform (e.g., placeholder-embed-site)
    const targetUrl = `https://vidsrc.to{movieId}`; 
    let browser;

    try {
        // Launch a headless cloud browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        let targetStreamUrl = null;

        // Listen to all network requests happening inside the hidden player page
        await page.setRequestInterception(true);
        page.on('request', interceptedRequest => {
            const url = interceptedRequest.url();
            
            // Intercept hidden HLS streaming playlists (.m3u8) or video links
            if (url.includes('.m3u8') || url.includes('.mp4')) {
                targetStreamUrl = url;
            }
            interceptedRequest.continue();
        });

        // Navigate to the video page and simulate waiting for player scripts to fire
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        if (targetStreamUrl) {
            // Return the extracted stream link back to your mobile app frontend
            res.json({ success: true, stream_url: targetStreamUrl });
        } else {
            res.status(404).json({ error: 'Streaming link could not be isolated.' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => console.log(`Scraper API running on port ${PORT}`));
