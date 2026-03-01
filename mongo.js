// mongo.js
const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_CONN_URL = 'mongodb+srv://fairvinay:Bench_123@cluster0.9ke4d.mongodb.net/test?retryWrites=true&w=majority&serverSelectionTimeoutMS=30000';

async function connectDB() {
  try {
  	   let MONGOENVURL =process.env.MONGO_CONN_URL;
  	   
  	  if(MONGOENVURL !== undefined && MONGOENVURL !==null ) {
  	  	  console.log("PROCESS ENV MONGO_CONN_URL "+MONGOENVURL);
  	     await mongoose.connect(process.env.MONGO_CONN_URL);
  	} 
  	else { 
          await mongoose.connect(MONGO_CONN_URL);
    } 
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;