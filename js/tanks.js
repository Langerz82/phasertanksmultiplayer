
var Player = function (index, game, player, bullets, x, y) {
    this.id = index;
    this.x = x;
    this.y = y;
    this.game = game;
    this.health = 5;
    this.maxHealth = 5;
    this.score = 0;
    this.bullets = bullets;
    this.fireRate = 1000;
    this.nextFire = 0;
    this.alive = true;
	
    this.id = index;

	//  A shadow below our tank
	this.sprite = game.add.sprite(x,y);
	game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
	this.sprite.body.drag.set(0.2);
	this.sprite.body.maxVelocity.setTo(400, 400);
	this.sprite.body.collideWorldBounds = true;

	var shadow = game.add.sprite(0, 0, 'tank', 'shadow');
	shadow.anchor.setTo(0.5, 0.5);
	this.sprite.addChild(shadow);

	var tank = game.add.sprite(0, 0, 'tank', 'tank1');
	tank.anchor.setTo(0.5, 0.5);
	tank.animations.add('move', ['tank1', 'tank2', 'tank3', 'tank4', 'tank5', 'tank6'], 20, true);
	this.sprite.addChild(tank);

	//  Finally the turret that we place on-top of the tank body
	var turret = game.add.sprite(0, 0, 'tank', 'turret');
	turret.anchor.setTo(0.5, 0.5);
	this.sprite.addChild(turret);

    return this;
};

Player.prototype.damage = function(health) {
    this.health = health;

    if (this.health <= 0)
    {
	this.health = 0;
        this.alive = false;

        this.sprite.kill();
        
        return true;
    }

    return false;

};


var game = new Phaser.Game(800, 600, Phaser.AUTO, 'phaser-example', { preload: preload, create: create, update: update, render: render });

function preload () {

    game.load.atlas('tank', 'assets/games/tanks/tanks.png', 'assets/games/tanks/tanks.json');
    game.load.atlas('enemy', 'assets/games/tanks/enemy-tanks.png', 'assets/games/tanks/tanks.json');
    game.load.image('bullet', 'assets/games/tanks/bullet.png');
    game.load.image('earth', 'assets/games/tanks/scorched_earth.png');
    game.load.spritesheet('kaboom', 'assets/games/tanks/explosion.png', 64, 64, 23);
    
}

var land;
var playerMap = {};
//var playerId = 0;
var myPlayer;

var explosions;

var currentSpeed = 0;
var cursors;

var bullets;

var upKey;
var downKey;
var leftKey;
var rightKey;

function create () {

    //  Resize our game world to be a 2000 x 2000 square
    game.world.setBounds(-1000, -1000, 1000, 1000);

    //  Our tiled scrolling background
    land = game.add.tileSprite(0, 0, 800, 600, 'earth');
    land.fixedToCamera = true;

    Client.askNewPlayer();

    //  Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet', 0, false);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    bullets.setAll('checkWorldBounds', true);
    for(var i = 0; i < 30; ++i)
    {
	bullets.children[i].id = i;
    }

    //  Explosion pool
    explosions = game.add.group();
    for (var i = 0; i < 10; i++)
    {
        var explosionAnimation = explosions.create(0, 0, 'kaboom', [0], false);
        explosionAnimation.anchor.setTo(0.5, 0.5);
        explosionAnimation.animations.add('kaboom');
    }

    //game.camera.focusOnXY(0, 0);

    cursors = game.input.keyboard.createCursorKeys();
    upKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
    downKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
    leftKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
    rightKey = game.input.keyboard.addKey(Phaser.Keyboard.D);

    setInterval(function() {	
	if (myPlayer)
	{
	    Client.sendMovement(Math.round(myPlayer.sprite.x), Math.round(myPlayer.sprite.y), currentSpeed, myPlayer.sprite.rotation, myPlayer.sprite.children[2].rotation);
	}
    },125);
}

function update () {
    if (cursors.left.isDown || leftKey.isDown)
    {
        myPlayer.sprite.angle -= 4;
    }
    else if (cursors.right.isDown || rightKey.isDown)
    {
        myPlayer.sprite.angle += 4;
    }

    if (myPlayer)
	myPlayer.sprite.children[2].rotation = angleToPointer2(myPlayer.sprite) - myPlayer.sprite.rotation;


    if (cursors.up.isDown || upKey.isDown)
    {
        currentSpeed = 200;
    }
    else if (cursors.down.isDown || downKey.isDown)
    {
	currentSpeed = Math.max(currentSpeed -= 10, -100);
    }
    else
    {
        if (currentSpeed > 0)
        {
            currentSpeed -= 10;
        }
    }

    if (currentSpeed != 0 && myPlayer)
    {
        game.physics.arcade.velocityFromRotation(myPlayer.sprite.rotation, currentSpeed, myPlayer.sprite.body.velocity);
    }

    land.tilePosition.x = -game.camera.x;
    land.tilePosition.y = -game.camera.y;

    //  Position all the parts and align rotations
    if (myPlayer && myPlayer.alive && game.input.activePointer.isDown)
    {
        //  Boom!
        fire();
    }

}

function bulletHitPlayer (data) {
    var bullet = bullets.children[data.bullet.id];
    bullet.kill();

    log.l(data.bullet.hid);
    var playerHit = playerMap[data.bullet.hid];

    log.l(data.targetHealth);
    var destroyed = playerHit.damage(data.targetHealth);
    playerHit.health = data.targetHealth;

    var playerSource = playerMap[data.bullet.pid];
    playerSource.score = data.srcScore;
    if (destroyed)
    {
        var explosionAnimation = explosions.getFirstExists(false);
        explosionAnimation.reset(playerHit.sprite.x, playerHit.sprite.y);
        explosionAnimation.play('kaboom', 30, false, true);
    }
}


function fire () {
    if (game.time.now > myPlayer.nextFire && bullets.countDead() > 0)
    {
        myPlayer.nextFire = game.time.now + myPlayer.fireRate;
	Client.sendShoot(myPlayer.id, Math.round(myPlayer.sprite.x), Math.round(myPlayer.sprite.y), 500, 			myPlayer.sprite.rotation, myPlayer.sprite.children[2].rotation);
    }
}

function shootPlayer (id, pid, x, y, v, r, tr) {
        var bullet = bullets.children[id];
	var player = playerMap[pid];
	var theta = tr + r;
        bullet.reset(x,y);
	bullet.rotation = theta;
	bullet.body.velocity = game.physics.arcade.velocityFromRotation(theta, v);
}

function render () {
	if (myPlayer)
	{
	   game.debug.text("Player Health: " + myPlayer.health + " / " + myPlayer.maxHealth, 32 ,32);
	   game.debug.text("Player Score: " + myPlayer.score, 32 ,64);
	}
}


var addThisPlayer = function(id,x,y){
	playerId = id;
	myPlayer = addPlayer(id,x,y);
    	game.camera.follow(myPlayer.sprite);
};

var addExistingPlayer = function(id,x,y){
	if (playerId == id)
		return;
	addPlayer(id,x,y);
};

var addPlayer = function(id,x,y){
	playerMap[id] = new Player(id,game,bullets, x, y);

	return playerMap[id];
};

var movePlayer = function(id,x,y,v,r,tr){
    if (myPlayer == playerMap[id])
	return;

    var player = playerMap[id];
    if (!player) return;


    var tween = game.add.tween(player.sprite.body);
    tween.to({x:x,y:y}, v);
    tween.start();

    /*var tween2 = game.add.tween(player.sprite.body);
    tween2.to({rotation:r}, 1000, null, true, 0, Infinity);
    tween2.start();*/

    player.sprite.rotation = r;
    player.sprite.children[2].rotation = tr;
};

var removePlayer = function(id){
    if (playerMap[id]) {    
	playerMap[id].sprite.destroy();
        delete playerMap[id];
    }
};


var angleToPointer2 = function(dO,p) {
	p = p || game.input.activePointer;
	var dx = p.worldX - dO.x;
	var dy = p.worldY - dO.y;

	return Math.atan2(dy, dx);
}



