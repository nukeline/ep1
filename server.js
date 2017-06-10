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
		name: "",
		init: 'init1',
        x:450,
        y:450,
        id:id,
        color:'#'+Math.floor(Math.random()*16777215).toString(16),
		r:24,
		hp:100,
		maxHp:100,
		mana:100,
		maxMana:100,
        Q:false,
        W:false,
        E:false,
		R:false,
		Lcd: false,
		Qcd: false,
		Wcd: false,
		Ecd: false,
		Rcd: false,
		pressingMouseLeft:false,
		pressingMouseRight:false,
		mouseX:450,
		mouseY:450,
		moveX:0,
		moveY:0,
		moved: false,
		moving: false,
        maxSpd:4,
		Spd:4,
		bullets:[],
    }
	self.move = function() {
		//initialize moving
		if (self.pressingMouseRight && !self.moved) {
			self.moveX = self.mouseX;
			self.moveY = self.mouseY;
			self.moved = true;
			self.moving = true;
		} else if (!self.pressingMouseRight) {
			self.moved = false;
		}
		//move
		if (self.moving) {
			d = Math.atan2(self.moveY-self.y, self.moveX-self.x);
			self.x += self.Spd * Math.cos(d);
			self.y += self.Spd * Math.sin(d);
			if (getDistance(self.moveX,self.x,self.moveY,self.y) <= self.Spd) {
				self.moving = false;
			}
		}
	}
	self.psmove = function() {
		self.x += 5;
	}
	self.shoot = function() {
		if (!self.Lcd && self.pressingMouseLeft) {
			ldir = Math.atan2(self.mouseY-self.y,self.mouseX-self.x);
			var bullet = Bullet(self.id,'energyball',self.x+24*Math.cos(ldir),self.y+24*Math.sin(ldir),0,0,ldir,16,5);
			self.bullets.push(bullet);
			self.Lcd = true;
			console.log(self.bullets.length);
			return;
		} else if (self.Lcd && !self.pressingMouseLeft){
			self.Lcd = false;
			return;
		}

		if (!self.Qcd && self.Q && self.mana >= 40) {
			ldir = Math.atan2(self.mouseY-self.y,self.mouseX-self.x);
			var bullet = Bullet(self.id,'fireball',self.x+24*Math.cos(ldir),self.y+24*Math.sin(ldir),self.mouseX,self.mouseY,ldir,8,25);
			self.bullets.push(bullet);
			self.Qcd = true;
			console.log(self.bullets.length);
			self.mana -= 40;
			return;
		} else if (self.Qcd && !self.Q){
			self.Qcd = false;
			return;
		}
	}
    return self;
}

var Bullet = function(id,type,x,y,tx,ty,dir,Spd,dmg){
    var self = {
		id:id,
		type:type,
        x:x,
        y:y,
		tx:tx,
		ty,ty,
		dir:dir,
		Spd:Spd,
		exp:0,
		dmg:dmg,
    }
	self.move = function() {
		switch(self.type) {
			case 'fireball':
				console.log('fireball');
				self.x += self.Spd * Math.cos(self.dir);
				self.y += self.Spd * Math.sin(self.dir);
				break;
			case 'energyball':
				console.log('energyball');
				self.x += self.Spd * Math.cos(self.dir);
				self.y += self.Spd * Math.sin(self.dir);
				break;
		}
	}
	self.checkcol = function() {
		if (self.x < -24 || self.x > 2184 || self.y < -24 || self.y > 2184 ) {PLAYER_LIST[id].bullets.splice(PLAYER_LIST[id].bullets.indexOf(self),1); return;}
		switch(self.type) {
			case 'fireball':
				if (self.exp == 1) {PLAYER_LIST[self.id].bullets.splice(PLAYER_LIST[self.id].bullets.indexOf(self),1);}
				for (var i in PLAYER_LIST) {
					if (getDistance(self.tx,self.x,self.ty,self.y) <= self.Spd) {
						self.x = self.tx;
						self.y = self.ty;
						self.exp = 1;
					}
					if (self.id !== PLAYER_LIST[i].id && !PLAYER_LIST[i].dead) {
						if (self.exp == 0) {
							if (getDistance(PLAYER_LIST[i].x, self.x, PLAYER_LIST[i].y, self.y) < (24 + 8)) {
								self.exp = 1;
							}
						}
						if (self.exp == 1) {
							if (getDistance(PLAYER_LIST[i].x, self.x, PLAYER_LIST[i].y, self.y) < (24 + 32)) {
								PLAYER_LIST[i].hp -= self.dmg;
								console.log("dmgcheck " + self.id + " " + PLAYER_LIST[i].id + " " + (self.id !== PLAYER_LIST[i].id));
							}
						}
					}
				}
				break;
			case 'energyball':
				for (var i in PLAYER_LIST) {
					if (self.id != PLAYER_LIST[i].id && !PLAYER_LIST[i].dead) {
						if (getDistance(PLAYER_LIST[i].x, self.x, PLAYER_LIST[i].y, self.y) < (24 + 8)) {
							PLAYER_LIST[i].hp -= self.dmg;
							PLAYER_LIST[self.id].bullets.splice(PLAYER_LIST[self.id].bullets.indexOf(self),1)
							continue;
						}
					}
				}
				break;
		}
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
		names = [];
		for (var i in PLAYER_LIST) {
			if(PLAYER_LIST[i].init == 'init3') {
				names.push(PLAYER_LIST[i].name);
				console.log(PLAYER_LIST[i].name);
			}
		}
		io.emit('namelist',names);
    });
	
	socket.on('name',function(data){
		console.log(data.id + " " + data.name);
		PLAYER_LIST[data.id].name = data.name;
		PLAYER_LIST[data.id].init = 'init3';
		
		names = [];
		for(var i in PLAYER_LIST) {
			if(PLAYER_LIST[i].init == 'init3') {
				names.push(PLAYER_LIST[i].name);
			}
		}
		console.log(names);
		io.emit('namelist',names);
    });

    socket.on('keyPress',function(data){
        if(data.inputId === 'Q')
            player.Q = data.state;
        else if(data.inputId === 'W')
            player.W = data.state;
        else if(data.inputId === 'E')
            player.E = data.state;
        else if(data.inputId === 'R')
            player.R = data.state;
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
	
	socket.on('onping',function(data){
		r = data.state;
		socket.emit('retping',r);
	});
	
});

function getDistance(x1, x2, y1, y2) {
	return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

setInterval(function(){
	var init = [];
    var pack = [];
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
		if (player.init == 'init1'){
			init.push(player.id);
			player.init = 'init2';
			continue;
		} else if (player.init == 'init2') {
			continue;
		}
		if (player.hp <= 0 || player.dead) {
			player.dead = true;
			continue;
		}
		
		if (player.hp < player.maxHp) {
			player.hp += 1/30;
		}
		
		if (player.mana < player.maxMana) {
			player.mana += 1/15;
		}
		
		player.move();
		for (var j in player.bullets) {
			player.bullets[j].move();
			player.bullets[j].checkcol();
		}
		player.shoot();
		
        pack.push({
            x:player.x,
            y:player.y,
            color:player.color,
			r:player.r,
			name:player.name,
			mouseX:player.mouseX,
			mouseY:player.mouseY,
			hp:player.hp,
			maxHp:player.maxHp,
			mana:player.mana,
			maxMana:player.maxMana,
			bullets:player.bullets,
        });
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
	for(var i in init) {
		socket.emit('initiate',init[i]);
	}

},1000/60);
