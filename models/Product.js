// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    brand: { type: String },
    category: { type: String },
    description: { type: String },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    countInStock: { type: Number, default: 0 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviews: []
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);