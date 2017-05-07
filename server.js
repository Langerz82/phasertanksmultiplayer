//TODO: add package.json
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

app.use('/css',express.static(__dirname + '/css'));
app.use('/js',express.static(__dirname + '/js'));
app.use('/bower_components',express.static(__dirname + '/bower_components'));
app.use('/assets',express.static(__dirname + '/assets'));

app.get('/',function(req,res){
    res.sendFile(__dirname+'/index.htm');
});

server.lastPlayderID = 0;
server.lastBulletID = 0;
server.playersList = [];

server.listen(process.env.PORT || 8081,function(){
    console.log('Listening on '+server.address().port);
});

var Bullet = function (id,pid,x,y,v,r,tr)
{
	this.dt = Date.now();
	this.id = id;
	this.pid = pid;
	this.x = x;
	this.y = y;
	this.v = v;
	this.r = r;
	this.tr = tr;
	return this;
};

var Player = function (id,x,y)
{
	this.id = id;
	this.x = x;
	this.y = y;
	this.v = 0;
	this.r = 0;
	this.tr = 0;
	this.health = 5;
	this.score = 0;
	return this;
};

Player.maxHeath = 5;
bullets = [];
gSocket = null;

io.on('connection',function(socket){
    gSocket = socket;
    socket.on('newplayer',function(){
	socket.player = new Player(
            server.lastPlayderID++,
            randomInt(-1000,1000),
            randomInt(-1000,1000)
	);
	socket.emit('thisplayer',socket.player);
        socket.broadcast.emit('allplayers',getAllPlayers());
        socket.emit('allplayers',getAllPlayers());

        socket.on('move',function(data){
//            console.log('click to '+data.x+', '+data.y);
            socket.player.x = data.x;
            socket.player.y = data.y;
	    socket.player.v = data.v;
	    socket.player.r = data.r;
	    socket.player.tr = data.tr;
            socket.broadcast.emit('move',socket.player);
        });

	socket.on('shoot', function(data) {
		var bullet = new Bullet(Object.keys(bullets).length, data.pid, data.x, data.y, data.v, data.r, data.tr);
		bullets.push(bullet);
                socket.broadcast.emit('shoot',bullet);
		socket.emit('shoot',bullet);
	});

        socket.on('disconnect',function(){
            io.emit('remove',socket.player.id);
        });
    });

    socket.on('test',function(){
        console.log('test received');
    });
});

// Physics
setInterval (function () {
    // For each Players go through the bullets if any contact report.	
	var players = getAllPlayers();	
	for (var i=0; i < bullets.length; ++i)
	{
		var bullet = bullets[i];
		if (!bullet) continue;
		for (var id2 in players) {
			var player = players[id2];
			if (!player || player.id == bullet.pid) continue;
			elapsedTime = (Date.now() - bullet.dt) / 1000;
			//console.log("elapsedTime: " + elapsedTime);
			
			//console.log("radians:"+bullet.r/Math.PI);
			var theta = bullet.r + bullet.tr
			var x = Math.round(bullet.x+(Math.cos(theta) * bullet.v) * elapsedTime);
			var y = Math.round(bullet.y+(Math.sin(theta) * bullet.v) * elapsedTime);
			console.log("x:"+x+",y:"+y);
			if (x < -1000 || x > 1000 || y < -1000 || y > 1000)
			{
				console.log("x:"+x+",y:"+y+",bullet.r:"+bullet.r+",bullet.v:"+bullet.v);
				bullets.splice(bullet,1);
				delete bullet;
				continue;
			}
			//console.log("radians2:"+player.r);

		        var theta = player.r;
			var p1 = rotatePoint(30,30, player.x,player.y,theta);
			var p2 = rotatePoint(-30,-30, player.x,player.y,theta);
			if (pointRectangleIntersection({x:x,y:y},
			    {x1:Math.min(p1.x,p2.x),x2:Math.max(p1.x,p2.x), 
                             y1:Math.min(p1.y,p2.y), y2:Math.max(p1.y, p2.y)}))
			{
				bullet.hid = player.id;			
				console.log("PLAYER HIT!!!!!!!");
				var packet = {bullet:bullet, targetHealth:--player.health, srcScore:++player.score};
				gSocket.broadcast.emit('shot',packet);
				gSocket.emit('shot',packet);
				bullets.splice(bullet,1);
				delete bullet;				
				continue;
			}

		}
	}    
}, 32); // 30 FPS


function getAllPlayers(){
    var players = [];
    Object.keys(io.sockets.connected).forEach(function(socketID){
        var player = io.sockets.connected[socketID].player;
        if(player) players.push(player);
    });
    return players;
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function pointRectangleIntersection(p, r) {
    console.log("p.x:"+p.x+",p.y:"+p.y);
    console.log("x1:"+r.x1+",y1:"+r.y1+",x2:"+r.x2+",y2:"+r.y2);
    return p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;
}

function rotatePoint(px,py,ox,oy,theta)
{
	var rx = Math.round(px*Math.cos(theta) - py*Math.sin(theta));
	var ry = Math.round(px*Math.sin(theta) + py*Math.cos(theta));
	return {x:ox + rx, y:oy + ry};
}

