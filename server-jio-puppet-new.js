const express = require('express');
const connectDB = require('./mongo'); // or wherever your mongo file is
const searchRoutes = require('./routes/searchRoutes');

const app = express();
const PORT = 3000;
connectDB(); // 🔴 THIS IS IMPORTANT
// Mount routes
app.use('/', searchRoutes);

app.listen(PORT, () => {
    console.log(`Scraper service active on port ${PORT}`);
});