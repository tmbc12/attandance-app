const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const holidayController = require('../controllers/holiday.controller');

// All routes require authentication
router.get('/', auth, holidayController.getHolidays);
router.get('/:id', auth, holidayController.getHoliday);
router.post('/', auth, holidayController.createHoliday);
router.put('/:id', auth, holidayController.updateHoliday);
router.delete('/:id', auth, holidayController.deleteHoliday);

module.exports = router;

