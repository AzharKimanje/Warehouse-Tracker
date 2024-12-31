const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bwipjs = require('bwip-js');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/warehouseDB')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.log('Error connecting to MongoDB:', err);
  });

// MongoDB Models
const Item = mongoose.model('Item', new mongoose.Schema({
    name: String,
    broughtBy: String,
    timeIn: Date,
    location: String,
    barcode: String,
    checkedOut: {
        status: { type: Boolean, default: false },
        takenBy: String,
        timeOut: Date,
    },
}));

// Routes
// Home Route
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

// Add Item Route
app.post('/items/add', async (req, res) => {
    const { name, broughtBy, location } = req.body;
    const timeIn = new Date();

    const barcodeData = `${name}-${broughtBy}-${timeIn}`;
    const barcodeImage = await bwipjs.toBuffer({
        bcid: 'code128',
        text: barcodeData,
    });

    const item = new Item({ name, broughtBy, location, timeIn, barcode: barcodeImage.toString('base64') });
    await item.save();
    res.send('Item added successfully');
});

// Check Out Item Route
app.post('/items/checkout', async (req, res) => {
    const { itemId, takenBy } = req.body;
    const timeOut = new Date();
    await Item.findByIdAndUpdate(itemId, {
        $set: { 'checkedOut.status': true, 'checkedOut.takenBy': takenBy, 'checkedOut.timeOut': timeOut },
    });
    res.send('Item checked out successfully');
});

// Login Route (GET)
app.get('/auth/login', (req, res) => {
    res.render('login');  // Render the login page
});

// Login Route (POST)
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;

    // Simple login check (replace this with actual authentication logic)
    if (username === 'admin' && password === 'password') {
        res.send('Login successful');
    } else {
        res.send('Invalid username or password');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

