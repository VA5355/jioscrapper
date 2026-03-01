const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { Worker } = require('worker_threads');
const Product = require('../models/Product');

const router = express.Router();

const MONGO_CONN_URL = 'mongodb+srv://fairvinay:Bench_123@cluster0.9ke4d.mongodb.net/test?retryWrites=true&w=majority&serverSelectionTimeoutMS=30000';

// Apply stealth
chromium.use(stealth);

router.get('/search/:query', async (req, res) => {

    const { query } = req.params;
    const url = `https://www.jiomart.com/search?q=${encodeURIComponent(query)}`;

    let browser;

    try {

        console.log(`🔎 Searching MongoDB first for: ${query}`);

        // ✅ 1️⃣ FETCH FROM MONGODB FIRST
        const dbProducts = await Product.find({
            category: new RegExp(query, 'i')
        });

        console.log(`✅ Found ${dbProducts.length} products in MongoDB`);
        if ( dbProducts.length <= 0 ) { 
        	
        	
        // ✅ 2️⃣ SCRAPE JIOMART USING PLAYWRIGHT
        console.log(`🌐 Scraping JioMart...`);

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        try {
            await page.waitForSelector('.plp-card-container', {
                timeout: 15000,
                state: 'attached'
            });
        } catch (e) {
            console.log("Product selector not found.");
        }

        // Human-like scroll
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });

        await page.waitForTimeout(1500);

        const scrapedProducts = await page.evaluate(() => {
            const results = [];
            const items = document.querySelectorAll('.plp-card-container');

            items.forEach(item => {
                const name = item.querySelector('.plp-card-details-name')?.innerText.trim();

                const priceText =
                    item.querySelector('.plp-card-details-price span')
                        ?.innerText || "";

                const price = priceText.replace(/[^0-9.]/g, '');

                const imgElement = item.querySelector('img');

                let image = null;

                if (imgElement) {
                    if (imgElement.getAttribute('data-src')) {
                        image = imgElement.getAttribute('data-src');
                    } else if (imgElement.src) {
                        image = imgElement.src;
                    }

                    if (image && image.includes('jiomart-default-image')) {
                        image = null;
                    }
                }

                const link = item.querySelector('a')?.href;

                if (name && image) {
                    results.push({
                        name,
                        price: price ? parseFloat(price) : null,
                        image,
                        url: link
                    });
                }
            });

            return results;
        });

        console.log(`🛒 Scraped ${scrapedProducts.length} products`);

        // ✅ 3️⃣ START WORKER THREAD FOR BACKGROUND INSERT
        if (scrapedProducts.length > 0) {
            const worker = new Worker('./workers/productWorker.js', {
                workerData: {
                    mongoUrl: MONGO_CONN_URL,
                    products: scrapedProducts,
                    query: query,
                    userId: "6819f3bd808190ec8f62a953"
                }
            });

            worker.on('message', msg => console.log('Worker:', msg));
            worker.on('error', err => console.error('Worker Error:', err));
        }
        console.log("SENDING JIO MART SCARPEPED PRODUCTS ", scrapedProducts.length  );
         // ✅ 4️⃣ RETURN RESPONSE IMMEDIATELY (NON-BLOCKING)
        res.json({
            status: "success",
            fromDatabase: dbProducts,
            count: scrapedProducts.length,
            data: scrapedProducts
        });
     }  //  DB PRODUCT PRESENT so DIRECTLY SEND DB DATA 
     else { 
     	 // RE-CHECK DB PRODUCT LENTH 
     	if(dbProducts !==undefined && dbProducts.length > 0 ) {
     	
     	 		console.log("SENDING MONGO DB CACHED PRODUCTS ", dbProducts.length  );
		     		 // ✅ 4️⃣ RETURN RESPONSE IMMEDIATELY (NON-BLOCKING)
		        res.json({
		            status: "success",
		            count: dbProducts.length,
		            data: dbProducts
		        });
     	} 
     	else {
     		console.log("NO MONGO DB CACHED PRODUCTS "  );
		     		 // ✅ 4️⃣ RETURN RESPONSE IMMEDIATELY (NON-BLOCKING)
		        res.json({
		            status: "success",
		            count: 0,
		            data: []
		        });
     	}
     
     }
         

    } catch (error) {

        console.error("❌ Search Failure:", error.message);

        if (error.message.includes('Executable doesn\'t exist')) {
            res.status(500).json({
                status: "error",
                message: "Browser binaries missing. Run: npx playwright install chromium"
            });
        } else {
            res.status(500).json({
                status: "error",
                message: error.message
            });
        }

    } finally {
        if (browser) await browser.close();
    }
});

module.exports = router;