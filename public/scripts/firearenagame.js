// Import Firebase
import { db, app} from "./firebaseAPI.js";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, getFirestore, limit} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    transparent: true,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Global variable to track game over state
let isGameOver = false;
let gameOverGroup;

let player;
let cursors;
let enemies;
let scoreText;
let healthBar;
let enemiesDestroyed = 0;
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

function preload() {
    // No preload needed
}

function create() {
    // Create a transparent overlay for smoother transitions
    this.overlay = this.add.rectangle(
        this.game.config.width / 2, 
        this.game.config.height / 2, 
        this.game.config.width, 
        this.game.config.height, 
        0xFFFFFF, 
        0
    );
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(1000); // Ensure it's on top of everything else
    
    // Create graphics for circles
    this.arenagraphics = this.add.graphics();

    // Create UI elements
    scoreText = createScoreUI(this);
    healthBar = createHealthBar(this);

    // Outer circle (blue)
    this.arenagraphics.fillStyle(0x0000FF, 0.3);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS));
    this.arenagraphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS));

    // Middle circle (green)
    this.arenagraphics.fillStyle(0x00FF00, 0.3);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 2/3));
    this.arenagraphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 2/3));

    // Inner circle (red)
    this.arenagraphics.fillStyle(0xFF0000, 0.3);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 1/3));
    this.arenagraphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 1/3));

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

function createScoreUI(scene) {
    // Create a futuristic, cartoony score display
    const scoreText = scene.add.text(scene.game.config.width - 150, 20, 'ENEMIES DESTROYED: 0', {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color: '#00FFFF', // Bright cyan for futuristic look
        stroke: '#00FFFF',
        strokeThickness: 4,
        shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#0066FF',
            blur: 4,
            stroke: true,
            fill: true
        }
    });
    scoreText.setOrigin(0.6, 0);
    scoreText.setScrollFactor(0); // Fixed position on screen
    return scoreText;
}

function updateScoreUI(scene, scoreText, enemiesDestroyed) {
    scoreText.setText(`ENEMIES DESTROYED: ${enemiesDestroyed}`);
    
    // Add a little bounce animation when score updates
    scoreText.setScale(1.1);
    scene.tweens.add({
        targets: scoreText,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Bounce'
    });
}

function createHealthBar(scene) {
    // Create a health bar container
    const healthBarBG = scene.add.rectangle(50, scene.game.config.height - 50, 200, 30, 0x333333, 0.7);
    const healthBar = scene.add.rectangle(50, scene.game.config.height - 50, 200, 30, 0x00FF00, 0.9);
    
    healthBarBG.setOrigin(0, 0.5);
    healthBar.setOrigin(0, 0.5);
    
    return {
        background: healthBarBG,
        bar: healthBar
    };
}

function updateHealthBar(scene, healthBar, currentHits, maxHits) {
    const healthPercentage = 1 - (currentHits / maxHits);
    const barWidth = 200 * healthPercentage;
    
    // Update bar width
    healthBar.bar.width = barWidth;
    
    // Change color based on health
    if (healthPercentage > 0.5) {
        healthBar.bar.fillColor = 0x00FF00; // Green
    } else if (healthPercentage > 0.25) {
        healthBar.bar.fillColor = 0xFFFF00; // Yellow
    } else {
        healthBar.bar.fillColor = 0xFF0000; // Red
    }
    
    //Broken code claude can't figure this out
    // // Add shake effect when health is low
    // if (healthPercentage < 0.25) {
    //     scene.tweens.add({
    //         targets: [healthBar.background, healthBar.bar],
    //         angle: [
    //             { value: -10, duration: 30 },
    //             { value: 10, duration: 30 },
    //             { value: -10, duration: 30 },
    //             { value: 0, duration: 30 }
    //         ],
    //         ease: 'Sine.easeInOut'
    //     });
    // }
}

function determinePlayerRingState(player) {
    const distanceFromCenter = Phaser.Math.Distance.Between(
        player.x, player.y, CENTER_X, CENTER_Y
    );
    
    let ringState = 'outer';
    let ringColor = 0x6e6e6e;
    
    if (distanceFromCenter <= OUTER_RADIUS * 1/3) {
        ringState = 'inner';
        ringColor = 0xf5f5f5;
    } else if (distanceFromCenter <= OUTER_RADIUS * 2/3) {
        ringState = 'middle';
        ringColor = 0xb8b8b8;
    }
    


    return { ringState, ringColor };
}

function handleRingHealthRegeneration(scene) {
    const { ringState } = determinePlayerRingState(player);
    
    // Static variable to track regeneration timing
    if (!scene.ringRegenTimer) {
        scene.ringRegenTimer = {
            inner: { startTime: 0, currentRing: null },
            middle: { startTime: 0, currentRing: null }
        };
    }

    const timer = scene.ringRegenTimer;

    // Inner ring regeneration
    if (ringState === 'inner') {
        if (timer.inner.currentRing !== 'inner') {
            // Reset timer when entering inner ring
            timer.inner.startTime = scene.time.now;
            timer.inner.currentRing = 'inner';
        }
        
        // Regenerate if in inner ring for at least 1 second
        if (scene.time.now - timer.inner.startTime >= 500 && player.hits > 0) {
            player.hits = Math.max(0, player.hits - 1);
            timer.inner.startTime = scene.time.now; // Reset timer
        }
    } else {
        timer.inner.currentRing = null;
    }

    // Middle ring regeneration
    if (ringState === 'middle') {
        if (timer.middle.currentRing !== 'middle') {
            // Reset timer when entering middle ring
            timer.middle.startTime = scene.time.now;
            timer.middle.currentRing = 'middle';
        }
        
        // Regenerate if in middle ring for at least 3 seconds
        if (scene.time.now - timer.middle.startTime >= 1500 && player.hits > 0) {
            player.hits = Math.max(0, player.hits - 1);
            timer.middle.startTime = scene.time.now; // Reset timer
        }
    } else {
        timer.middle.currentRing = null;
    }
}

function updateRingColors(scene, player) {
    const { ringState, ringColor } = determinePlayerRingState(player);
    
    // Redraw circles with brighter colors based on player position
    scene.arenagraphics.clear();
    
    // Outer circle
    ringState === 'outer' ? scene.arenagraphics.fillStyle(0x0000FF, 0.5) : scene.arenagraphics.fillStyle(0x1b2735, 0.8);
    scene.arenagraphics.lineStyle(2, 0xffffff, 1);
    scene.arenagraphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS));
    scene.arenagraphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS));

    // Middle circle
    ringState === 'middle' ? scene.arenagraphics.fillStyle(0x00FF00, 0.5) : scene.arenagraphics.fillStyle(0x1b2735, 0.8);
    scene.arenagraphics.lineStyle(2, 0xffffff, 1);
    scene.arenagraphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 2/3));
    scene.arenagraphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 2/3));

    // Inner circle
    ringState === 'inner' ? scene.arenagraphics.fillStyle(0xFF0000, 0.5) : scene.arenagraphics.fillStyle(0x1b2735, 0.8);
    scene.arenagraphics.lineStyle(2, 0xffffff, 1);
    scene.arenagraphics.strokeCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 1/3));
    scene.arenagraphics.fillCircleShape(new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS * 1/3));
    
    return ringState;
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
    if (distance >= obj1.radius + obj2.radius) return;

    // Calculate collision vector
    const collisionX = dx / distance;
    const collisionY = dy / distance;

    // Calculate relative velocity
    const velDiffX = obj2.velocity.x - obj1.velocity.x;
    const velDiffY = obj2.velocity.y - obj1.velocity.y;

    // Calculate velocity along the collision normal
    const velocityAlongNormal = velDiffX * collisionX + velDiffY * collisionY;

    // Do not resolve if objects are moving apart
    if (velocityAlongNormal > 0) return;

    // Restitution (bounciness)
    const restitution = 0.7;

    // Compute impulse scalar
    const impulse = -(1 + restitution) * velocityAlongNormal / 
        (1/obj1.mass + 1/obj2.mass);

    // Apply impulse
    const impulseX = impulse * collisionX;
    const impulseY = impulse * collisionY;

    // Limit extreme velocities
    const MAX_IMPULSE = 30;
    const impulseLength = Math.sqrt(impulseX * impulseX + impulseY * impulseY);
    const scaledImpulseX = impulseX * Math.min(1, MAX_IMPULSE / impulseLength);
    const scaledImpulseY = impulseY * Math.min(1, MAX_IMPULSE / impulseLength);

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
}

//Handle player movement
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

function generateCollisionParticles(scene, x, y) {
    // Create a group of geometric particles
    const particleCount = 20;
    const particleGroup = scene.add.group();

    for (let i = 0; i < particleCount; i++) {
        // Randomly choose geometric shape
        const shapeType = Phaser.Math.Between(0, 2);
        let particle;

        switch (shapeType) {
            case 0: // Triangle
                particle = scene.add.triangle(x, y, 0, 0, 5, 0, 2, 5, 0xFFA500);
                break;
            case 1: // Rectangle
                particle = scene.add.rectangle(x, y, 4, 4, 0xFFA500);
                break;
            case 2: // Circle
                particle = scene.add.circle(x, y, 3, 0xFFA500);
                break;
        }

        // Set particle properties
        particle.setAlpha(0.8);
        particle.setBlendMode(Phaser.BlendModes.ADD);

        // Random velocity
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.FloatBetween(2, 5);
        particle.velocityX = Math.cos(angle) * speed;
        particle.velocityY = Math.sin(angle) * speed;

        particleGroup.add(particle);

        // Tween for movement and fade
        scene.tweens.add({
            targets: particle,
            x: `+=${particle.velocityX * 30}`,
            y: `+=${particle.velocityY * 30}`,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                particle.destroy();
            }
        });
    }

    return particleGroup;
}

function screenShake(scene, intensity) {
    scene.tweens.add({
        targets: scene.cameras.main,
        x: { from: -intensity, to: intensity },
        y: { from: -intensity, to: intensity },
        duration: 50,
        yoyo: true,
        ease: 'Quad.easeInOut'
    });
}

function constrainPlayerPosition(scene) {
    player.x += player.velocity.x;
    player.y += player.velocity.y;

    const distanceFromCenter = Phaser.Math.Distance.Between(
        player.x, player.y, CENTER_X, CENTER_Y
    );

    if (distanceFromCenter > OUTER_RADIUS - player.radius) {
        const angle = Phaser.Math.Angle.Between(
            CENTER_X, CENTER_Y, player.x, player.y
        );
        
        // Correct player position to be exactly on the boundary
        player.x = CENTER_X + Math.cos(angle) * (OUTER_RADIUS - player.radius);
        player.y = CENTER_Y + Math.sin(angle) * (OUTER_RADIUS - player.radius);
        
        // Calculate normal vector at point of collision
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        
        // Calculate incident velocity vector
        const incidentVelX = player.velocity.x;
        const incidentVelY = player.velocity.y;
        
        // Calculate dot product of incident velocity with normal
        const dotProduct = incidentVelX * normalX + incidentVelY * normalY;
        
        // Reflect velocity across normal with some energy loss
        const reflectionFactor = 0.8;
        player.velocity.x = reflectionFactor * (incidentVelX - 2 * dotProduct * normalX);
        player.velocity.y = reflectionFactor * (incidentVelY - 2 * dotProduct * normalY);

        playerHit(scene);

        // Screen shake intensity based on dot product
        const shakeIntensity = Math.min(Math.abs(dotProduct) * 2, 5);
        if (shakeIntensity > 0.5) {
            screenShake(scene, shakeIntensity);
        }
    }
}

// Update individual enemy
function updateEnemy(scene, enemy) {
    if (!enemy || !enemy.active) return;
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
    if (!enemy || !enemy.active) return;
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

function createGameOverUI(scene, enemiesDestroyed) {
    // Fade-in blur overlay
    const overlay = scene.add.rectangle(
        scene.game.config.width / 2, 
        scene.game.config.height / 2, 
        scene.game.config.width, 
        scene.game.config.height, 
        0x000000, 
        0
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(1999);

    // Fade in blur effect
    scene.tweens.add({
        targets: overlay,
        alpha: 0.5,
        duration: 500,
        ease: 'Cubic.easeOut'
    });

    // Create a larger game over container to accommodate leaderboard
    const gameOverContainer = scene.add.container(
        scene.game.config.width / 2, 
        scene.game.config.height / 2
    );
    gameOverContainer.setDepth(2000);
    gameOverContainer.setAlpha(0);

    // Stylized background rectangle (increased size)
    const background = scene.add.rectangle(
        0, 0, 500, 600, 0x4A4A6A, 0.9
    );
    background.setStrokeStyle(4, 0xD3D3D3, 0.5);

    // Fantasy-style Game Over text
    const gameOverText = scene.add.text(
        0, -250, 'Game Over', 
        { 
            fontFamily: 'Papyrus, Fantasy', 
            fontSize: '40px', 
            color: '#D4AF37', 
            stroke: '#8B4513', 
            strokeThickness: 4 
        }
    );
    gameOverText.setOrigin(0.5);

    // Score text
    const scoreText = scene.add.text(
        0, -180, 
        `Enemies Destroyed: ${enemiesDestroyed}`, 
        { 
            fontFamily: 'Palatino Linotype, serif', 
            fontSize: '24px', 
            color: '#A0D6B4' 
        }
    );
    scoreText.setOrigin(0.5);

    // Leaderboard title
    const leaderboardTitle = scene.add.text(
        0, -120, 'Leaderboard', 
        { 
            fontFamily: 'Papyrus, Fantasy', 
            fontSize: '30px', 
            color: '#D3D3D3' 
        }
    );
    leaderboardTitle.setOrigin(0.5);

    // Leaderboard mask for scrolling
    const leaderboardMask = scene.add.rectangle(
        0, 0, 400, 200, 0x000000
    );
    leaderboardMask.setVisible(false);

    // Leaderboard container
    const leaderboardContainer = scene.add.container(0, -30);
    leaderboardContainer.setMask(
        new Phaser.Display.Masks.GeometryMask(scene, leaderboardMask)
    );

    // Buttons container
    const buttonsContainer = scene.add.container(0, 230);

    // Play Again button
    const playAgainButton = scene.add.text(
        -100, 0, 'Play Again', 
        { 
            fontFamily: 'Papyrus, Fantasy', 
            fontSize: '28px', 
            color: '#B0E0E6', 
            backgroundColor: '#2F4F4F', 
            padding: 10 
        }
    );
    playAgainButton.setOrigin(0.5);
    playAgainButton.setInteractive();

    // Main Menu button
    const mainMenuButton = scene.add.text(
        100, 0, 'Main Menu', 
        { 
            fontFamily: 'Papyrus, Fantasy', 
            fontSize: '28px', 
            color: '#B0E0E6', 
            backgroundColor: '#2F4F4F', 
            padding: 10 
        }
    );
    mainMenuButton.setOrigin(0.5);
    mainMenuButton.setInteractive();

    // Button hover and click effects (apply to both buttons)
    [playAgainButton, mainMenuButton].forEach(button => {
        button.on('pointerover', () => {
            scene.tweens.add({
                targets: button,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100,
                ease: 'Power1'
            });
        });

        button.on('pointerout', () => {
            scene.tweens.add({
                targets: button,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Power1'
            });
        });
    });

    // Play Again button click effect
    playAgainButton.on('pointerdown', () => {
        // Button press visual effect
        scene.tweens.add({
            targets: playAgainButton,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 50,
            yoyo: true,
            ease: 'Power1'
        });

        // Fade out entire game over screen
        scene.tweens.add({
            targets: [overlay, gameOverContainer],
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                overlay.destroy();
                gameOverContainer.destroy();
                resetGame(scene);
            }
        });
    });

    // Main Menu button click effect
    mainMenuButton.on('pointerdown', () => {
        // Button press visual effect
        scene.tweens.add({
            targets: mainMenuButton,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 50,
            yoyo: true,
            ease: 'Power1'
        });

        // Transition to main menu
        scene.tweens.add({
            targets: [overlay, gameOverContainer],
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                overlay.destroy();
                gameOverContainer.destroy();
                scene.scene.start('MainMenuScene');
            }
        });
    });

    // Function to populate and update leaderboard
async function updateLeaderboard() {
    try {
        // Fetch top 25 scores from Firestore
        const leaderboardRef = collection(db, 'leaderboard');
        const q = query(leaderboardRef, orderBy('score', 'desc'), limit(25));

        const snapshot = await getDocs(q);
        
        // Clear existing leaderboard entries
        leaderboardContainer.removeAll(true);

        // Color mapping for top 3 places
        const placeColors = [
            '#FFD700', // Gold (1st)
            '#C0C0C0', // Silver (2nd)
            '#CD7F32'  // Bronze (3rd)
        ];

        // Populate leaderboard
        snapshot.forEach((doc, index) => {
            const data = doc.data();
            const entryColor = index < 3 ? placeColors[index] : '#FFFFFF';
            
            const nameText = scene.add.text(
                -150, index * 40, data.name, 
                { 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '22px', 
                    color: entryColor 
                }
            );

            const scoreText = scene.add.text(
                150, index * 40, data.score.toString(), 
                { 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '22px', 
                    color: entryColor 
                }
            );

            leaderboardContainer.add([nameText, scoreText]);
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

// Function to submit score to Firestore
async function submitScore(playerName, score) {
    try {
        await addDoc(collection(db, 'leaderboard'), {
            "Enemies Destroyed": score,
            Name: playerName,
            Time: serverTimestamp()
        });
        
        // Update leaderboard after submission
        updateLeaderboard();
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

    // Add elements to container
    gameOverContainer.add([
        background, 
        gameOverText, 
        scoreText, 
        leaderboardTitle,
        leaderboardContainer,
        buttonsContainer
    ]);

    buttonsContainer.add([playAgainButton, mainMenuButton]);

    // Fade in game over container
    scene.tweens.add({
        targets: gameOverContainer,
        alpha: 1,
        duration: 500,
        delay: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            // Trigger leaderboard update after UI is shown
            updateLeaderboard();
            
            // Prompt for player name and submit score
            const playerName = prompt('Enter your name for the leaderboard:');
            if (playerName) {
                submitScore(playerName, enemiesDestroyed);
            }
        }
    });

    return gameOverContainer;
}

// Note: Ensure firebaseAPI.js is included before this script
// Requires Firebase and Firestore to be initialized

function resetGame(scene) {
    // Reset game state
    isGameOver = false;
    enemiesDestroyed = 0;

    // Destroy existing game over UI
    if (gameOverGroup) {
        gameOverGroup.clear(true, true);
    }

    // Recreate player
    player = scene.add.circle(CENTER_X, CENTER_Y, 20, 0xffffff);
    player.velocity = { x: 0, y: 0 };
    player.hits = 0;
    player.originalRadius = 20;
    player.mass = 1;

    // Clear existing enemies
    enemies.clear(true, true);

    // Recreate enemy spawner
    scene.time.addEvent({
        delay: ENEMY_SPAWN_INTERVAL,
        callback: spawnEnemy,
        callbackScope: scene,
        loop: true
    });
}

// Handle collision between player and enemy
function handleEnemyPlayerCollision(scene, enemy) {
    if (isGameOver) return;
    
    const distanceToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);
    if (distanceToPlayer < (enemy.radius + player.radius)) {
        
        generateCollisionParticles(scene, 
            (enemy.x + player.x) / 2, 
            (enemy.y + player.y) / 2
        );

        // Elastic collision
        handleCollision(player, enemy);

        // Destroy enemy if hit twice
        enemy.hits++;
        if (enemy.hits >= 2) {
            enemy.destroy();
            enemiesDestroyed++;
            updateScoreUI(scene, scoreText, enemiesDestroyed);
            enemies.remove(enemy);
        }

        playerHit(scene);
    }
}

function playerHit(scene)
{
    // Increase player hits and shrink
    player.hits++;
    player.radius = player.originalRadius * Math.max(0, 1 - (player.hits / MAX_PLAYER_HITS));
    
    // Increase player mass with hits
    player.mass += 0.1;

    // Check if player is defeated
    if (player.hits >= MAX_PLAYER_HITS) {
         // Destroy player
         player.destroy();
        
         // Set game over state
         isGameOver = true;

         // Stop enemy spawning
         scene.time.removeAllEvents();

         // Destroy all existing enemies
         enemies.clear(true, true);

         // Create game over UI
         createGameOverUI(scene);
    }
}

// Handle collision between enemy and enemy
function handleEnemyEnemyCollision(enemy1, enemy2) {
    
    const distanceBetweenEnemies = Phaser.Math.Distance.Between(enemy1.x, enemy1.y, enemy2.x, enemy2.y);
    // Check if enemies are colliding
    if ((enemy1.active && enemy2.active)&&(distanceBetweenEnemies < (enemy1.radius + enemy2.radius))) {
        // Perform elastic collision physics
        handleCollision(enemy1, enemy2);
    }
}

// Main update method
function update() {
    
    if (isGameOver) return;

    updateScoreUI(this, scoreText, enemiesDestroyed);
    
    handlePlayerMovement();
    updatePlayerVelocity(this);
    constrainPlayerPosition(this);

    handleRingHealthRegeneration(this);

    // Create a copy of enemies to safely iterate
    const enemyList = [...enemies.children.entries];

    // Update and chase enemies
    enemyList.forEach(enemy => {
        updateEnemy(this, enemy);
        constrainEnemyPosition(enemy);
        handleEnemyPlayerCollision(this,enemy);

        enemyList.forEach(otherEnemy => {
            if (!otherEnemy || enemy === otherEnemy) return;

            handleEnemyEnemyCollision(enemy, otherEnemy);
        });
    });
    
    // Update health bar
    updateHealthBar(this, healthBar, player.hits, MAX_PLAYER_HITS);
    
    // Update ring colors and get current ring state
    const currentRingState = updateRingColors(this, player);
}