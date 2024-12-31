const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
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
});

module.exports = mongoose.model('Item', itemSchema);
