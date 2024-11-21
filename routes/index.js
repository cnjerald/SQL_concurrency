const express = require('express');
const router = express.Router();


router.get('/', (req, res) => {
  res.render('main',{
    title:'Test',
    layout:'index'
  }); // or any other view
});

module.exports = router;