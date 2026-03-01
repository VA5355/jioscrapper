const express = require('express');
const axios = require('axios');
const { Worker } = require('worker_threads');
const Product = require('./models/Product');
const router = express.Router();

const MONGO_CONN_URL = 'mongodb+srv://fairvinay:Bench_123@cluster0.9ke4d.mongodb.net/test?retryWrites=true&w=majority&serverSelectionTimeoutMS=30000';

router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;

    // 1️⃣ Fetch from MongoDB first
    const dbProducts = await Product.find({
      category: new RegExp(query, 'i')
    });

    // 2️⃣ Fetch from JioMart
    const url = `https://www.jiomart.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url);

    const fetchedProducts = response.data.data || [];

    // 3️⃣ Start Worker to Insert in Background
    const worker = new Worker('./workers/productWorker.js', {
      workerData: {
        mongoUrl: MONGO_CONN_URL,
        products: fetchedProducts,
        query: query,
        userId: "6819f3bd808190ec8f62a953"
      }
    });

    worker.on('message', msg => console.log(msg));
    worker.on('error', err => console.error(err));

    // 4️⃣ Return DB + fresh fetched results immediately
    res.json({
      fromDatabase: dbProducts,
      fromJioMart: fetchedProducts
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;