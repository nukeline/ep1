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
		r:24,
		rs:48,
		rns:24,
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
		pressingMouseLeft:false,
		pressingMouseRight:false,
		mouseX:640,
		mouseY:360,
        maxSpd:5,
		maxHp:100,
		hp:100,
		maxMana:120,
		mana:60,
		maxCharge:60,
		charge:0,
		shootcd: false,
		shootin: false,
		sheild: false,
		bullets: [],
    }
    self.updatePosition = function(){
		
        if(self.pressingRight && self.x < 1280-self.r)
            self.x += self.maxSpd;
        if(self.pressingLeft && self.x > 0+self.r)
            self.x -= self.maxSpd;
        if(self.pressingUp && self.y > 0+self.r)
            self.y -= self.maxSpd;
        if(self.pressingDown && self.y < 720-self.r)
            self.y += self.maxSpd;	
    }
	self.shoot = function(){
		if (self.pressingMouseLeft && !self.shootin) {																							//initiate shooting
			self.shootin = true;
		} else if (self.shootin && self.charge < self.maxCharge) {																				//already shooting and not full
			self.charge++;
		}
		if(!self.pressingMouseLeft && self.shootin) {																							//not shooting and have charge
			console.log(self.bullets.length);
			ldir = Math.atan2(self.mouseY-self.y,self.mouseX-self.x);
			var bullet = Bullet(self.x+(self.r+10)*Math.cos(ldir), self.y+(self.r+10)*Math.sin(ldir), ldir, 10+10*self.charge/60, 50*self.charge/60, self.id);
			console.log(bullet.dmg);
			self.bullets.push(bullet);
			self.shootcd = true;
			self.shootin = false;
			self.charge = 0;
		}
	}
	self.updateshield = function() {
		self.shield = self.pressingMouseRight;
		if (self.mana < self.maxMana) {
			self.mana += 0.1;
		}
		if (self.shield && self.mana >= 1) {
			self.mana--;
			self.shield = self.pressingMouseRight;
		} else {
			self.shield = false;
		}

		//console.log(self.pressingMouseRight)
		//self.shield = true;
		//if (self.shield) {self.r = self.rs;} else {self.r = self.rns;}
	}
	self.updateBullets = function() {
		for (var i in self.bullets) {
			if (self.bullets[i].x > 1280 || self.bullets[i].x < 0 || self.bullets[i].y > 720 || self.bullets[i].y < 0) {						//bullets out of bound
				self.bullets.splice(i,1);
				continue;
			} else {
				broken = false;
				for (j in PLAYER_LIST) {
					if (self.id == PLAYER_LIST[j].id) {
						continue;
					} else if (getDistance(self.bullets[i].x,PLAYER_LIST[j].x,self.bullets[i].y,PLAYER_LIST[j].y) < self.bullets[i].r+PLAYER_LIST[j].r) {	//collision
						if (!PLAYER_LIST[j].shield) {																										//shield
							PLAYER_LIST[j].hp -= self.bullets[i].dmg;
							self.bullets.splice(i,1);
							if (self.mana < self.maxMana) {
								self.mana += 3;
							}
							if (self.mana > self.maxMana) {
								self.mana = self.maxMana;
							}
							
							broken = true;
							break;
						} else {
							self.bullets[i].dir += Math.PI;
							self.bullets[i].id = PLAYER_LIST[j].id;
						}
					}
				}
				if (!broken) {
					self.bullets[i].x += self.bullets[i].maxSpd*Math.cos(self.bullets[i].dir);
					self.bullets[i].y += self.bullets[i].maxSpd*Math.sin(self.bullets[i].dir);
				}
			}
		}
	}
    return self;
}

var Bullet = function(x, y, d, s, dmg, id){
    var self = {
        x:x,
        y:y,
		dir:d,
		r:5,
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
		else if(data.inputId === 'mouseleft')
            player.pressingMouseLeft = data.state;
		else if(data.inputId === 'mouseright')
            player.pressingMouseRight = data.state;
    });
	socket.on('mouseMove',function(data){
		if(data.inputId === 'mouse') {
			player.mouseX = data.state[0];
			player.mouseY = data.state[1];
		}
    });
});

function getDistance(x1, x2, y1, y2) {
	return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

setInterval(function(){	
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
		if (PLAYER_LIST[i].hp <= 0) {
			delete PLAYER_LIST[i];
			continue;
		}
		player.updateBullets();
        player.updatePosition();
		player.shoot();
		player.updateshield();
        pack.push({
            x:player.x,
            y:player.y,
            color:player.color,
			r:player.r,
			mouseX:player.mouseX,
			mouseY:player.mouseY,
			bullets:player.bullets,
			maxHp:player.maxHp,
			hp:player.hp,
			maxMana:player.maxMana,
			mana:player.mana,
			maxCharge:player.maxCharge,
			charge:player.charge,
			shield:player.shield,
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/60);
