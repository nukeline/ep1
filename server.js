var express = require('express');
var app = express();
var serv = require('http').Server(app);
var port = process.env.PORT || 8080;
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(port);

console.log("Server started.");
 
var SOCKET_LIST = {};
var PLAYER_LIST = {};
 
var Player = function(id){
    var self = {
        x:640,
        y:360,
        id:id,
        color:'#'+Math.floor(Math.random()*16777215).toString(16),
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
		pressingMouse:false,
		mouseX:640,
		mouseY:360,
        maxSpd:5,
		bullets:[],
		shootcd: false,
    }
    self.updatePosition = function(){
        if(self.pressingRight)
            self.x += self.maxSpd;
        if(self.pressingLeft)
            self.x -= self.maxSpd;
        if(self.pressingUp)
            self.y -= self.maxSpd;
        if(self.pressingDown)
            self.y += self.maxSpd;			
    }
	self.shoot = function(){
		if(self.pressingMouse && !self.shootcd) {
			var bullet = Bullet(self.x, self.y, Math.atan2(self.mouseY-self.y,self.mouseX-self.x), 10, 10, self.id);
			self.bullets.push(bullet);
			self.shootcd = true;
		}
		if(!self.pressingMouse) {
			self.shootcd = false;
		}
	}
	self.updateBullets = function() {
		for (i in self.bullets) {
			self.bullets[i].updatePosition();
		}
	}
    return self;
}

var Bullet = function(x, y, d, s, dmg,id){
    var self = {
        x:x,
        y:y,
		dir:d,
        maxSpd:s,
		dmg:dmg,
		id:id,
    }
    self.updatePosition = function(){
		self.x += self.maxSpd * Math.cos(self.dir);
		self.y += self.maxSpd * Math.sin(self.dir);
    }
    return self;
}
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
 
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
   
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });
   
    socket.on('keyPress',function(data){
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
		else if(data.inputId === 'mouse')
            player.pressingMouse = data.state;
    });
	socket.on('mouseMove',function(data){
		if(data.inputId === 'mouse') {
			player.mouseX = data.state[0];
			player.mouseY = data.state[1];
		}
    });
});

setInterval(function(){
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition();
		player.shoot();
		player.updateBullets();
        pack.push({
            x:player.x,
            y:player.y,
            color:player.color,
			mouseX:player.mouseX,
			mouseY:player.mouseY,
			bullets:player.bullets,
        }); 
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/60);
