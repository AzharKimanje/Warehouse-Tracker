require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bwipjs = require('bwip-js');
const path = require('path');
const app = express();

// Debugging: Log to confirm app start
console.log("App is starting...");

const mongoURI = 'mongodb://localhost:27017/warehouse-tracker'; // Local MongoDB URI

// Connect to local MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to local MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));
// Set up middleware
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Item Schema
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  broughtBy: { type: String, required: true },
  timeIn: { type: Date, default: Date.now },
  location: { type: String, required: true },
  barcode: String,
  checkedOut: {
    status: { type: Boolean, default: false },
    takenBy: String,
    timeOut: Date
  }
});

const Item = mongoose.model('Item', itemSchema);

// Routes

// Index route with embedded HTML
app.get('/', (req, res) => {
  console.log("GET /");
  const indexHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Warehouse Equipment Tracker</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100">
      <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-8">Warehouse Equipment Tracker</h1>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">Check-In Item</h2>
            <form action="/check-in" method="POST">
              <div class="mb-4">
                <label class="block mb-2">Item Name</label>
                <input type="text" name="name" required class="w-full p-2 border rounded">
              </div>
              <div class="mb-4">
                <label class="block mb-2">Brought By</label>
                <input type="text" name="broughtBy" required class="w-full p-2 border rounded">
              </div>
              <div class="mb-4">
                <label class="block mb-2">Location</label>
                <input type="text" name="location" required class="w-full p-2 border rounded">
              </div>
              <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Check In</button>
            </form>
          </div>

          <div class="bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">Check-Out Item</h2>
            <form action="/check-out" method="POST">
              <div class="mb-4">
                <label class="block mb-2">Select Item</label>
                <select name="itemId" required class="w-full p-2 border rounded">
                  <% items?.forEach(item => { %>
                    <% if (!item.checkedOut.status) { %>
                      <option value="<%= item._id %>"><%= item.name %></option>
                    <% } %>
                  <% }) %>
                </select>
              </div>
              <div class="mb-4">
                <label class="block mb-2">Taken By</label>
                <input type="text" name="takenBy" required class="w-full p-2 border rounded">
              </div>
              <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded">Check Out</button>
            </form>
          </div>
        </div>

        <div class="mt-8">
          <a href="/items" class="text-blue-500 hover:underline">View All Items</a>
        </div>
      </div>
    </body>
    </html>
  `;
  res.send(indexHtml);
});

// Items List route with embedded HTML
app.get('/items', async (req, res) => {
  console.log("GET /items");
  try {
    const items = await Item.find().sort('-timeIn');
    const itemsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Item List - Warehouse Equipment Tracker</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-100">
        <div class="container mx-auto px-4 py-8">
          <h1 class="text-3xl font-bold mb-8">Item List</h1>
          <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left">Name</th>
                  <th class="px-6 py-3 text-left">Location</th>
                  <th class="px-6 py-3 text-left">Status</th>
                  <th class="px-6 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                ${items.map(item => `
                  <tr class="${item.checkedOut.status ? 'bg-red-50' : ''}">
                    <td class="px-6 py-4">${item.name}</td>
                    <td class="px-6 py-4">${item.location}</td>
                    <td class="px-6 py-4">
                      ${item.checkedOut.status ? `Checked Out by ${item.checkedOut.takenBy}` : 'Available'}
                    </td>
                    <td class="px-6 py-4">
                      ${item.checkedOut.status ? new Date(item.checkedOut.timeOut).toLocaleString() : new Date(item.timeIn).toLocaleString()}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="mt-8">
            <a href="/" class="text-blue-500 hover:underline">Back to Home</a>
          </div>
        </div>
      </body>
      </html>
    `;
    res.send(itemsHtml);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).send('Error fetching items');
  }
});

// Check-in route
app.post('/check-in', async (req, res) => {
  console.log("POST /check-in", req.body);
  const { name, broughtBy, location } = req.body;
  
  // Create barcode data
  const barcodeData = `${name}-${broughtBy}-${new Date().toISOString()}`;
  
  try {
    const barcode = await new Promise((resolve, reject) => {
      bwipjs.toBuffer({
        bcid: 'code128',
        text: barcodeData,
        scale: 3,
        height: 10,
        includetext: true
      }, (err, png) => {
        if (err) reject(err);
        resolve(png.toString('base64'));
      });
    });

    const item = new Item({
      name,
      broughtBy,
      location,
      barcode: `data:image/png;base64,${barcode}`
    });

    await item.save();
    console.log("Item saved:", item);
    res.redirect(`/barcode/${item._id}`);
  } catch (err) {
    console.error('Error during check-in:', err);
    res.status(500).send('Error during check-in');
  }
});

// Barcode route with embedded HTML
app.get('/barcode/:id', async (req, res) => {
  console.log("GET /barcode/:id", req.params);
  try {
    const item = await Item.findById(req.params.id);
    const barcodeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - Warehouse Equipment Tracker</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-100">
        <div class="container mx-auto px-4 py-8 text-center">
          <h1 class="text-3xl font-bold mb-8">Item Barcode</h1>
          <div class="bg-white p-6 rounded-lg shadow inline-block">
            <div class="mb-4">
              <p class="font-semibold">${item.name}</p>
              <p>Brought by: ${item.broughtBy}</p>
              <p>Location: ${item.location}</p>
            </div>
            <img src="${item.barcode}" alt="Barcode" class="mx-auto mb-4">
            <div class="flex justify-center gap-4">
              <a href="${item.barcode}" download="barcode.png" class="bg-blue-500 text-white px-4 py-2 rounded">Download</a>
              <button onclick="window.print()" class="bg-green-500 text-white px-4 py-2 rounded">Print</button>
            </div>
          </div>
          <div class="mt-8">
            <a href="/" class="text-blue-500 hover:underline">Back to Home</a>
          </div>
        </div>
      </body>
      </html>
    `;
    res.send(barcodeHtml);
  } catch (err) {
    console.error('Error fetching barcode:', err);
    res.status(500).send('Error fetching barcode');
  }
});

// Check-out route
app.post('/check-out', async (req, res) => {
  console.log("POST /check-out", req.body);
  const { itemId, takenBy } = req.body;
  try {
    await Item.findByIdAndUpdate(itemId, {
      'checkedOut.status': true,
      'checkedOut.takenBy': takenBy,
      'checkedOut.timeOut': new Date()
    });
    console.log('Item checked out:', itemId);
    res.redirect('/items');
  } catch (err) {
    console.error('Error during check-out:', err);
    res.status(500).send('Error during check-out');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
