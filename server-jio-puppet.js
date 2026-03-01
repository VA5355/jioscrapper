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
		/*
			<div class="plp-card-container"><div class="plp-card-image-wrapper"><div class="plp-card-image-container">
			<div class="plp-card-image">
			<img data-src="https://www.jiomart.com/images/product/original/rvzfzexyxq/pantene-advanced-hairfall-solution-2in1-anti-hairfall-silky-smooth-shampoo-conditioner-for-women-1l-product-images-orvzfzexyxq-p611573685-0-202505311508.jpg?im=Resize=(280,280)" 
			alt="Pantene Advanced Hairfall Solution, 2in1 Anti-Hairfall Silky Smooth Shampoo &amp; Conditioner for Women, 1L" class="lazyautosizes lazyloaded" data-sizes="auto" onerror="this.src='/assets/global/jiomart-default-image-312x420.png'" 
			src="https://www.jiomart.com/images/product/original/rvzfzexyxq/pantene-advanced-hairfall-solution-2in1-anti-hairfall-silky-smooth-shampoo-conditioner-for-women-1l-product-images-orvzfzexyxq-p611573685-0-202505311508.jpg?im=Resize=(280,280)" sizes="249px">
			</div>
			<div class="plp-card-wishlist">
			<span class="jm-wishlist-btn medium wishlist_btn" data-sku="611573685" id="wishlist_611573685"></span>
			</div></div></div>
			<div class="plp-card-details-wrapper"><div class="plp-card-details-container"><div class="plp-card-details-tag">
			<div class="jm-badge jm-badge-popular-curve jm-badge-popular-curve-small">sponsored</div></div>
			<div class="plp-card-details-name line-clamp jm-body-xs jm-fc-primary-grey-80">Pantene Advanced Hairfall Solution, 2in1 Anti-Hairfall Silky Smooth Shampoo &amp; Conditioner for Women, 1L</div>
			<div class="plp-card-details-price-wrapper"><div class="plp-card-details-price"><span class="jm-heading-xxs jm-mb-xxs">₹573.00</span><!--v-if-->
			 <span class="jm-body-xxs jm-fc-primary-grey-60 line-through jm-mb-xxs"> ₹1333.00</span></div><div class="plp-card-details-discount jm-mb-xxs"><span class="jm-badge">57% OFF </span></div></div>
			 <div class="plp-card-details-sub"><div class="plp-card-cart"><div class="product-card-cta jm-mt-xs" data-parentbtn-class="small full-width secondary jm-body-s-bold" data-parentbtn-text="Add" data-parentbtn-image="1" data-minusclass="secondary small jm-icon jm-mr-s center" data-plusclass="secondary small jm-icon jm-ml-s center" data-countclass="product-card-cta-qty">
			 <button class="jm-btn small secondary full-width jm-body-s-bold addtocartbtn jioads_cart_btn" data-sku="611573685" data-sellerid="92761" data-vertical="GROCERIES" data-adindex="0" data-source="PLP"> Add 
			 <img class="jm-ml-xs" src="/assets/ds2web/jds-icons/add-icon.svg" alt=""></button></div></div></div></div></div>
			 
			 </div>
			*/	
        // Wait for either the product grid OR the 'no results' selector to appear
        // JioMart often uses .plp-card-container for products
        try {
            await page.waitForSelector('.plp-card-container', {     timeout: 15000,
    				state: 'attached' });
    		//		If you want to ensure actual rendering:
			// await page.waitForLoadState('networkidle');
        } catch (e) {
            console.log("Product selector not found, checking for alternative elements...");
        }

        // Simulate a small human scroll to trigger lazy-loaded images/prices
      	//  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
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
       // await page.waitForTimeout(1000);

        const products = await page.evaluate(() => {
						    const results = [];
						    const items = document.querySelectorAll('.plp-card-container');

						    items.forEach(item => {
						        const name = item.querySelector('.plp-card-details-name')?.innerText.trim();

						        const priceText = item
						            .querySelector('.plp-card-details-price span')
						            ?.innerText || "";

						        const price = priceText.replace(/[^0-9.]/g, '');

						        const imgElement = item.querySelector('img');

						        let image = null;

						        if (imgElement) {
						            // Priority 1 → data-src (lazy)
						            if (imgElement.getAttribute('data-src')) {
						                image = imgElement.getAttribute('data-src');
						            }
						            // Priority 2 → src
						            else if (imgElement.src) {
						                image = imgElement.src;
						            }

						            // Reject default fallback image
						            if (image && image.includes('jiomart-default-image')) {
						                image = null;
						                // try once again 
						                
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

             /* await page.evaluate(() => {
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
        });*/

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