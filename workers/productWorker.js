// workers/productWorker.js
const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const MONGO_CONN_URL = workerData.mongoUrl;
const products = workerData.products;
const query = workerData.query;
const userId = workerData.userId;

async function insertProducts() {
  try {
    await mongoose.connect(MONGO_CONN_URL);

    for (const item of products) {

      // Skip if no image
      if (!item.image) continue;

      // Check duplicate by name
      const exists = await Product.findOne({ name: item.name });
      if (exists) continue;

      const newProduct = new Product({
        name: item.name,
        price: item.price,
        image: item.image,
        brand: item.name,
        category: query,
        description: item.name,
        rating: 0,
        numReviews: 0,
        countInStock: 10,
        user: userId,
        reviews: []
      });

      await newProduct.save();

      // Small delay to reduce DB pressure
      await new Promise(res => setTimeout(res, 200));
    }

    parentPort.postMessage('Insertion completed');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

insertProducts();