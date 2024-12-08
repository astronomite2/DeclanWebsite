const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let enemies;
const MAX_PLAYER_HITS = 20;

const CENTER_X = 400;
const CENTER_Y = 300;
const OUTER_RADIUS = 300;

// Movement parameters
const ACCELERATION = 0.5;
const MAX_SPEED = 200;
const FRICTION = 0.95;

// Enemy parameters
const ENEMY_SPAWN_INTERVAL = 2000; // milliseconds
const ENEMY_ACCELERATION = 0.5;
const ENEMY_MAX_SPEED = 100;
const ENEMY_FRICTION = 0.98;

// Player growth and healing parameters
const PLAYER_MAX_SIZE_MULTIPLIER = 2;
const SECOND_RING_GROWTH_RATE = 0.05;
const INNER_RING_GROWTH_RATE = 0.075;

function preload() {
    // No preload needed
}

function create() {
    // Create graphics for circles
    const graphics = this.add.graphics();

    // Outer circle (blue)
    graphics.fillStyle(0x0000FF, 0.3);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS));
    graphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS));

    // Middle circle (green)
    graphics.fillStyle(0x00FF00, 0.3);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 2/3));
    graphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 2/3));

    // Inner circle (red)
    graphics.fillStyle(0xFF0000, 0.3);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 1/3));
    graphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 1/3));

    // Create player
    player = this.add.circle(CENTER_X, CENTER_Y, 20, 0xffffff);
    player.setOrigin(0.5);

    // Velocity tracking
    player.velocity = { x: 0, y: 0 };
    player.hits = 0;
    player.originalRadius = 20;
    player.setRadius(player.originalRadius);
    player.mass = 1; // Default mass
    player.colorTimer = 0;
    player.colorPhase = 0;
    player.maxRadius = player.originalRadius * PLAYER_MAX_SIZE_MULTIPLIER;

    // Create enemy group
    enemies = this.add.group();

    // Setup keyboard
    cursors = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Spawn enemies periodically
    this.time.addEvent({
        delay: ENEMY_SPAWN_INTERVAL,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });
}

function spawnEnemy() {
    // Randomly spawn enemy at the border
    const angle = Math.random() * Math.PI * 2;
    const x = CENTER_X + Math.cos(angle) * (OUTER_RADIUS - 10);
    const y = CENTER_Y + Math.sin(angle) * (OUTER_RADIUS - 10);

    const enemy = this.add.circle(x, y, 15, 0xFFA500);
    enemy.setOrigin(0.5);
    enemy.velocity = { x: 0, y: 0 };
    enemy.hits = 0;
    enemy.originalRadius = 15;
    enemy.setRadius(enemy.originalRadius);
    enemy.mass = 0.5; // Enemy mass
    enemy.isDestroyed = false; // Add a flag to track destroyed enemies
    enemies.add(enemy);
    
    return enemy; // Return the enemy for potential further manipulation
}

function createTrail(scene, x, y, color, velocity, parentObject) {
    // Calculate trail length and width based on velocity
    const trailLength = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const trailWidth = trailLength / 3;  // Adjust width relative to length
    
    // Create a graphics object for a smooth, solid trail
    const trail = scene.add.graphics();
    
    // Set the trail color and alpha
    trail.setAlpha(0.7);
    trail.fillStyle(color, 0.7);
    
    // Calculate the movement angle
    const angle = Math.atan2(velocity.y, velocity.x);
    
    // Begin path
    trail.beginPath();
    
    // Create a curved trail using bezier curve
    trail.moveTo(0, -trailWidth/2);
    trail.lineTo(0, trailWidth/2);
    trail.lineTo(trailLength, trailWidth/2);
    trail.lineTo(trailLength, -trailWidth/2);
    trail.closePath();
    
    // Fill the path
    trail.fillPath();
    
    // Position and rotate the trail
    trail.x = x;
    trail.y = y;
    trail.rotation = angle;
    
    // Fade out and destroy trail
    scene.tweens.add({
        targets: trail,
        alpha: 0,
        duration: 400,
        onComplete: () => trail.destroy()
    });
}

function handleCollision(obj1, obj2) {
    // Calculate collision normal
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if objects are actually colliding
    if (distance >= obj1.radius + obj2.radius) return false;

    // Calculate collision vector
    const collisionX = dx / distance;
    const collisionY = dy / distance;

    // Calculate relative velocity
    const velDiffX = obj2.velocity.x - obj1.velocity.x;
    const velDiffY = obj2.velocity.y - obj1.velocity.y;

    // Calculate velocity along the collision normal
    const velocityAlongNormal = velDiffX * collisionX + velDiffY * collisionY;

    // Do not resolve if objects are moving apart
    if (velocityAlongNormal > 0) return false;

    // Restitution (bounciness)
    const restitution = 0.7;

    // Compute impulse scalar
    const impulse = -(1 + restitution) * velocityAlongNormal / 
        (1/obj1.mass + 1/obj2.mass);

    // Apply impulse
    const impulse_x = impulse * collisionX;
    const impulse_y = impulse * collisionY;

    // Limit extreme velocities
    const MAX_IMPULSE = 30;
    const impulseLength = Math.sqrt(impulse_x * impulse_x + impulse_y * impulse_y);
    const scaledImpulseX = impulse_x * Math.min(1, MAX_IMPULSE / impulseLength);
    const scaledImpulseY = impulse_y * Math.min(1, MAX_IMPULSE / impulseLength);

    // Update velocities
    obj1.velocity.x -= scaledImpulseX / obj1.mass;
    obj1.velocity.y -= scaledImpulseY / obj1.mass;
    obj2.velocity.x += scaledImpulseX / obj2.mass;
    obj2.velocity.y += scaledImpulseY / obj2.mass;

    // Separate objects to prevent sticking
    const separationDistance = obj1.radius + obj2.radius - distance;
    const separationX = separationDistance * collisionX * 0.5;
    const separationY = separationDistance * collisionY * 0.5;

    obj1.x -= separationX;
    obj1.y -= separationY;
    obj2.x += separationX;
    obj2.y += separationY;

    // Damage handling (only for player-enemy interactions)
    if (damageAllowed) {
        // If collision is between player and enemy
        if (obj1 === player && obj2 !== player) {
            // Track enemy hits
            obj2.hits = (obj2.hits || 0) + 1;

            // Destroy enemy on second hit
            if (obj2.hits >= 2) {
                obj2.isDestroyed = true;
                obj2.destroy();
                enemies.remove(obj2);
            }

            // Player loses only a small amount of size
            player.setRadius(Math.max(
                player.originalRadius * 0.9, 
                player.radius - 5
            ));
        }
        // If collision is enemy and player (reverse of previous case)
        else if (obj2 === player && obj1 !== player) {
            // Track enemy hits
            obj1.hits = (obj1.hits || 0) + 1;

            // Destroy enemy on second hit
            if (obj1.hits >= 2) {
                obj1.isDestroyed = true;
                obj1.destroy();
                enemies.remove(obj1);
            }

            // Player loses only a small amount of size
            player.setRadius(Math.max(
                player.originalRadius * 0.9, 
                player.radius - 5
            ));
        }
    }
    return true;
}

function handlePlayerMovement() {
    // Horizontal movement
    if (cursors.left.isDown) {
        player.velocity.x -= ACCELERATION;
    }
    if (cursors.right.isDown) {
        player.velocity.x += ACCELERATION;
    }

    // Vertical movement
    if (cursors.up.isDown) {
        player.velocity.y -= ACCELERATION;
    }
    if (cursors.down.isDown) {
        player.velocity.y += ACCELERATION;
    }

    // Apply friction (deceleration) when no keys are pressed
    if (!cursors.left.isDown && !cursors.right.isDown) {
        player.velocity.x *= FRICTION;
    }
    if (!cursors.up.isDown && !cursors.down.isDown) {
        player.velocity.y *= FRICTION;
    }
}

// Limit player speed and create trail
function updatePlayerVelocity(scene) {
    // Limit maximum speed
    player.velocity.x = Math.max(Math.min(player.velocity.x, MAX_SPEED), -MAX_SPEED);
    player.velocity.y = Math.max(Math.min(player.velocity.y, MAX_SPEED), -MAX_SPEED);

    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
        createTrail(scene, player.x, player.y, 0xffffff, player.velocity, player);
    }

    // Stop very small velocities
    if (Math.abs(player.velocity.x) < 0.1) player.velocity.x = 0;
    if (Math.abs(player.velocity.y) < 0.1) player.velocity.y = 0;
}

// Update player position and constrain within arena
function constrainPlayerPosition() {
    // Update player position
    player.x += player.velocity.x;
    player.y += player.velocity.y;
    

    // Arena boundary constraint for player
    const distanceFromCenter = Phaser.Math.Distance.Between(
        player.x, player.y, CENTER_X, CENTER_Y
    );

    if (distanceFromCenter > OUTER_RADIUS - player.radius) {
        const angle = Phaser.Math.Angle.Between(
            CENTER_X, CENTER_Y, player.x, player.y
        );
        
        player.x = CENTER_X + Math.cos(angle) * (OUTER_RADIUS - player.radius);
        player.y = CENTER_Y + Math.sin(angle) * (OUTER_RADIUS - player.radius);
        
        // Bounce off boundary with reduced velocity
        player.velocity.x *= -0.5;
        player.velocity.y *= -0.5;
    }
}

// Update individual enemy
function updateEnemy(scene, enemy) {
    // Chase player
    const angleToPlayer = Phaser.Math.Angle.Between(
        enemy.x, enemy.y, player.x, player.y
    );

    // Apply acceleration towards player
    enemy.velocity.x += Math.cos(angleToPlayer) * ENEMY_ACCELERATION;
    enemy.velocity.y += Math.sin(angleToPlayer) * ENEMY_ACCELERATION;

    // Apply friction
    enemy.velocity.x *= ENEMY_FRICTION;
    enemy.velocity.y *= ENEMY_FRICTION;

    // Limit enemy speed
    enemy.velocity.x = Math.max(Math.min(enemy.velocity.x, ENEMY_MAX_SPEED), -ENEMY_MAX_SPEED);
    enemy.velocity.y = Math.max(Math.min(enemy.velocity.y, ENEMY_MAX_SPEED), -ENEMY_MAX_SPEED);

    // Update enemy position
    enemy.x += enemy.velocity.x;
    enemy.y += enemy.velocity.y;

    if (enemy.velocity.x !== 0 || enemy.velocity.y !== 0) {
        createTrail(scene, enemy.x, enemy.y, 0xFFA500, enemy.velocity, enemy);
    }
}

// Constrain enemy within arena
function constrainEnemyPosition(enemy) {
    const enemyDistanceFromCenter = Phaser.Math.Distance.Between(
        enemy.x, enemy.y, CENTER_X, CENTER_Y
    );

    if (enemyDistanceFromCenter > OUTER_RADIUS - enemy.radius) {
        const boundaryAngle = Phaser.Math.Angle.Between(
            CENTER_X, CENTER_Y, enemy.x, enemy.y
        );
        
        enemy.x = CENTER_X + Math.cos(boundaryAngle) * (OUTER_RADIUS - enemy.radius);
        enemy.y = CENTER_Y + Math.sin(boundaryAngle) * (OUTER_RADIUS - enemy.radius);
        
        // Bounce off boundary
        enemy.velocity.x *= -0.5;
        enemy.velocity.y *= -0.5;
    }
}

// Handle collision between player and enemy
function handleEnemyPlayerCollision(enemy) {
    const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
    if (distanceToPlayer < (enemy.radius + player.radius)) {
        // Elastic collision
        handleCollision(player, enemy);

        // Destroy enemy if hit twice
        enemy.hits++;
        if (enemy.hits >= 2) {
            enemy.destroy();
            enemies.remove(enemy);
        }

        // Increase player hits and shrink
        player.hits++;
        player.radius = player.originalRadius * Math.max(0, 1 - (player.hits / MAX_PLAYER_HITS));
        
        // Increase player mass with hits
        player.mass += 0.1;

        // Check if player is defeated
        if (player.hits >= MAX_PLAYER_HITS) {
            player.destroy();
            // You could add game over logic here
        }
    }
}

// Main update method
function update() {
    handlePlayerMovement();
    updatePlayerVelocity(this);
    constrainPlayerPosition();

    // Create a copy of enemies to safely iterate
    const enemyList = [...enemies.children.entries];

    // Update and chase enemies
    enemyList.forEach(enemy => {
        updateEnemy(this, enemy);
        constrainEnemyPosition(enemy);
        handleEnemyPlayerCollision(enemy);
    });
}