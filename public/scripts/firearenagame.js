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
const ACCELERATION = 1;
const MAX_SPEED = 200;
const FRICTION = 0.95;

// Enemy parameters
const ENEMY_SPAWN_INTERVAL = 2000; // milliseconds
const ENEMY_ACCELERATION = 0.5;
const ENEMY_MAX_SPEED = 100;
const ENEMY_FRICTION = 0.98;

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

    // Velocity tracking
    player.velocity = { x: 0, y: 0 };
    player.hits = 0;
    player.originalRadius = 20;
    player.mass = 1; // Default mass

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
    enemy.velocity = { x: 0, y: 0 };
    enemy.hits = 0;
    enemy.mass = 0.5; // Enemy mass
    enemies.add(enemy);
}

function handleElasticCollision(obj1, obj2) {
    // Calculate collision normal
    const dx = obj2.x - obj1.x;
    const dy = obj2.y - obj1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Separate objects if overlapping
    if (distance < obj1.radius + obj2.radius) {
        const overlap = obj1.radius + obj2.radius - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Move objects apart proportional to their mass
        const totalMass = obj1.mass + obj2.mass;
        obj1.x -= overlap * (obj2.mass / totalMass) * nx;
        obj1.y -= overlap * (obj2.mass / totalMass) * ny;
        obj2.x += overlap * (obj1.mass / totalMass) * nx;
        obj2.y += overlap * (obj1.mass / totalMass) * ny;
    }

    // Recalculate normal after separation
    const newDx = obj2.x - obj1.x;
    const newDy = obj2.y - obj1.y;
    const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);
    const nx = newDx / newDistance;
    const ny = newDy / newDistance;

    // Calculate relative velocity
    const dvx = obj2.velocity.x - obj1.velocity.x;
    const dvy = obj2.velocity.y - obj1.velocity.y;

    // Calculate velocity along the normal
    const velocityAlongNormal = dvx * nx + dvy * ny;

    // Do not resolve if velocities are separating
    if (velocityAlongNormal > 0) return;

    // Coefficient of restitution (bounciness)
    const e = 0.8;

    // Compute impulse scalar
    const j = -(1 + e) * velocityAlongNormal / 
        (1/obj1.mass + 1/obj2.mass);

    // Apply impulse
    const impulseX = j * nx;
    const impulseY = j * ny;

    // Limit the impulse to prevent extreme velocities
    const MAX_IMPULSE = 50; // Adjust this value as needed
    const impulseLength = Math.sqrt(impulseX * impulseX + impulseY * impulseY);
    const scaledImpulseX = impulseX * Math.min(1, MAX_IMPULSE / impulseLength);
    const scaledImpulseY = impulseY * Math.min(1, MAX_IMPULSE / impulseLength);

    obj1.velocity.x -= scaledImpulseX / obj1.mass;
    obj1.velocity.y -= scaledImpulseY / obj1.mass;
    obj2.velocity.x += scaledImpulseX / obj2.mass;
    obj2.velocity.y += scaledImpulseY / obj2.mass;
}

function update() {
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

    // Limit maximum speed
    player.velocity.x = Math.max(Math.min(player.velocity.x, MAX_SPEED), -MAX_SPEED);
    player.velocity.y = Math.max(Math.min(player.velocity.y, MAX_SPEED), -MAX_SPEED);

    // Stop very small velocities
    if (Math.abs(player.velocity.x) < 0.1) player.velocity.x = 0;
    if (Math.abs(player.velocity.y) < 0.1) player.velocity.y = 0;

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

    // Update and chase enemies
    enemies.children.entries.forEach(enemy => {
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

        // Check collision with player
        const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
        if (distanceToPlayer < (enemy.radius + player.radius)) {
            // Elastic collision
            handleElasticCollision(player, enemy);

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

        // Constrain enemy within outer arena boundary
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
    });
}