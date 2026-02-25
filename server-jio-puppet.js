const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Apply the stealth plugin
chromium.use(stealth);

const app = express();
const PORT = 3000;

/**
 * Enhanced Scraper with better error handling
 */
app.get('/search/:query', async (req, res) => {
    const { query } = req.params;
    const url = `https://www.jiomart.com/search?q=${encodeURIComponent(query)}`;
    
    let browser;
    try {
        console.log(`Starting search for: ${query}`);
        
        // Launching with args to help in restricted environments
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        // Navigate and wait for content
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for either the product grid OR the 'no results' selector to appear
        // JioMart often uses .plp-card-container for products
        try {
            await page.waitForSelector('.plp-card-container', { timeout: 10000 });
        } catch (e) {
            console.log("Product selector not found, checking for alternative elements...");
        }

        // Simulate a small human scroll to trigger lazy-loaded images/prices
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await page.waitForTimeout(1000);

        const products = await page.evaluate(() => {
            const results = [];
            // Target the product cards
            const items = document.querySelectorAll('.plp-card-container');
            
            items.forEach(item => {
                const name = item.querySelector('.plp-card-details-name')?.innerText.trim();
                const price = item.querySelector('.plp-card-details-price')?.innerText.replace(/[^0-9.]/g, '');
                const img = item.querySelector('img.plp-card-image')?.src || item.querySelector('img')?.src;
                const link = item.querySelector('a')?.href;

                if (name) {
                    results.push({
                        name,
                        price: price ? parseFloat(price) : null,
                        image: img,
                        url: link
                    });
                }
            });
            return results;
        });

        res.json({
            status: "success",
            count: products.length,
            data: products
        });

    } catch (error) {
        console.error("Scraping Failure:", error.message);
        
        // Specific message for missing browser binaries
        if (error.message.includes('Executable doesn\'t exist')) {
            res.status(500).json({
                status: "error",
                message: "Browser binaries missing. Please run 'npx playwright install chromium' on the server."
            });
        } else {
            res.status(500).json({ status: "error", message: error.message });
        }
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Scraper service active on port ${PORT}`);
});