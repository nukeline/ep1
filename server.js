

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var port = var port = process.env.PORT || 8080;
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(port);
