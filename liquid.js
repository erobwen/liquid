
var express = require('express');
var colors = require('colors');
var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Liquid is now listening on port 3000!');
});

console.log(colors.cyan(
"  _     _             _     _         \n" +
" | |   (_)           (_)   | |     /\\  \n" +
" | |    _  __ _ _   _ _  __| |    /  \\    \n" + 
" | |   | |/ _` | | | | |/ _` |   /    \\  \n" +
" | |___| | (_| | |_| | | (_| |  (      )\n" +
" |_____|_|\\__, |\\__,_|_|\\__,_|   \\_____/      \n" +
"             | |                      \n" +			  
"             |_|                      \n"));