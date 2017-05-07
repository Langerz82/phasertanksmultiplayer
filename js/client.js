/**
 * Created by Jerome on 03-03-17.
 */

var Client = {};
Client.socket = io.connect(); // By default to localhost?

Client.sendTest = function(){
    console.log("test sent");
    Client.socket.emit('test');
};

Client.askNewPlayer = function(){
    Client.socket.emit('newplayer');
};

Client.sendMovement = function(x,y,speed,rotation,turretRotation){
  Client.socket.emit('move',{x:x,y:y,v:speed,r:rotation,tr:turretRotation});
};

Client.sendShoot = function(pid,x,y,speed,rotation,turretRotation){
  Client.socket.emit('shoot',{pid:pid,x:x,y:y,v:speed,r:rotation,tr:turretRotation});
};

Client.socket.on('thisplayer',function(data){
     addThisPlayer(data.id,data.x,data.y);
});

Client.socket.on('allplayers',function(data){
    for(var i = 0; i < data.length; i++){
        addExistingPlayer(data[i].id,data[i].x,data[i].y);
    }
});

Client.socket.on('shot',function(data){
    bulletHitPlayer(data);
});

Client.socket.on('shoot', function(data) {
    shootPlayer(data.id,data.pid,data.x,data.y,data.v,data.r,data.tr);
});

Client.socket.on('move',function(data){
    movePlayer(data.id,data.x,data.y,data.v,data.r,data.tr);
});

Client.socket.on('remove',function(id){
    removePlayer(id);
});
