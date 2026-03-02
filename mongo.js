// mongo.js
const mongoose = require('mongoose');
require('dotenv').config();
const MONGO_CONN_URL = 'mongodb+srv://w4zDgsOSw6TDrMOSw5zDgsOydMKEw4rDnMOGw5DCvmJkZg==@cluster0.9ke4d.mongodb.net/test?retryWrites=true&w=majority&serverSelectionTimeoutMS=30000';

let usernamepassd = "";
let username = ""; 
let password = "";
// Regular Expression Breakdown:
// \/\/   : Matches the last // (escaped forward slash)
// ([^@]+): Captures one or more characters that are NOT '@'
// @      : Matches the '@' character
const regex = /\/\/([^@]+)@/;
const match = MONGO_CONN_URL.match(regex);

if (match && match[1]) {
  const extractedString = match[1];
  console.log("Extracted String:", extractedString);
  usernamepassd = extractedString;
  
} else {
  console.log("No match found");
}
// second extraction try 
if ( usernamepassd === "" ) { 
// Split by //, take the second part, then split by @ and take the first part
const partAfterSlash = uri.split('//')[1];
const finalResult = partAfterSlash.split('@')[0];

console.log("Extracted String:", finalResult);
      
}

if(usernamepassd !=undefined &&  usernamepassd !== "" ) {
	 let  decoded = decodeCredentials(usernamepassd);
	 let   splitStrings   = decoded.split(":");
	   if (splitStrings !== undefined && splitStrings.length >=2) {
	   	     username = splitStrings[0];
	   	     password = splitStrings[1];
	   	   
	   }
	  
}


// Function to encode with a simple left shift and Base64
function encodeCredentials(username, password) {
  const credentials = `${username}:${password}`;
  // 1. Convert string to character codes, apply left shift
  const shiftedChars = credentials.split('').map(char => {
    // Left shift the character's ASCII value by 1 bit
    const shiftedCode = char.charCodeAt(0) << 1;
    return String.fromCharCode(shiftedCode);
  }).join('');

  // 4. Encode the resulting string to Base64 using Node.js Buffer
  const encoded = Buffer.from(shiftedChars, 'utf8').toString('base64');
  return encoded;
}

// Function to decode from Base64 and right shift
function decodeCredentials(encodedCredentials) {
  // Decode the Base64 string first
  const shiftedChars = Buffer.from(encodedCredentials, 'base64').toString('utf8');

  // Apply the right shift to reverse the operation
  const originalCredentials = shiftedChars.split('').map(char => {
    // Right shift the character's ASCII value by 1 bit
    const originalCode = char.charCodeAt(0) >> 1;
    return String.fromCharCode(originalCode);
  }).join('');

  return originalCredentials;
}


async function connectDB() {
  try {
  	   let MONGOENVURL =process.env.MONGO_CONN_URL;
  	   
  	  if(MONGOENVURL !== undefined && MONGOENVURL !==null ) {
  	  	  console.log("PROCESS ENV MONGO_CONN_URL "+MONGOENVURL);
  	     await mongoose.connect(process.env.MONGO_CONN_URL);
  	} 
  	else { 
  		let NEW_MONGO_URL = 'mongodb+srv://'+username+':'+password+'@cluster0.9ke4d.mongodb.net/test?retryWrites=true&w=majority&serverSelectionTimeoutMS=30000';
	  		
          await mongoose.connect(NEW_MONGO_URL);
    } 
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
