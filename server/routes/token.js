const express = require("express");
const { saveExpoToken } = require("../controllers/token.controller.js");
const router = express.Router();

router.post("/", saveExpoToken);

module.exports = router;
