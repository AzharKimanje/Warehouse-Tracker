const express = require('express');
const bwipjs = require('bwip-js');
const Item = require('./models/Item');
const router = express.Router();

// Add Item
router.post('/add', async (req, res) => {
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

// Check Out Item
router.post('/checkout', async (req, res) => {
    const { itemId, takenBy } = req.body;
    const timeOut = new Date();
    await Item.findByIdAndUpdate(itemId, {
        $set: { 'checkedOut.status': true, 'checkedOut.takenBy': takenBy, 'checkedOut.timeOut': timeOut },
    });
    res.send('Item checked out successfully');
});

module.exports = router;
