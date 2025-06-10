const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/getItems', productController.getItems);
router.get('/izdelek', productController.getProduct);
router.get('/history', productController.getHistory);
module.exports = router;