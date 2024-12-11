// Import Firebase
import { db, app } from "./firebaseAPI.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  getFirestore,
  limit,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init(data) {
    // Initialize game state variables
    this.isGameOver = false;
    this.gameOverGroup = null;
    this.player = null;
    this.cursors = null;
    this.enemies = null;
    this.scoreText = null;
    this.healthBar = null;
    this.enemiesDestroyed = 0;
    this.playerColor = data.playerColor || 0xffffff;

  }
  preload() {
    // No preload needed
  }

  create() {
    // Create a transparent overlay for smoother transitions
    this.overlay = this.add.rectangle(
      this.game.config.width / 2,
      this.game.config.height / 2,
      this.game.config.width,
      this.game.config.height,
      0xffffff,
      0
    );
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(1000); // Ensure it's on top of everything else

    // Create graphics for circles
    this.arenagraphics = this.add.graphics();

    // Create UI elements
    this.scoreText = this.createScoreUI();
    this.healthBar = this.createHealthBar();

    // Outer circle (blue)
    this.arenagraphics.fillStyle(0x0000ff, 0.3);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS)
    );
    this.arenagraphics.fillCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS)
    );

    // Middle circle (green)
    this.arenagraphics.fillStyle(0x00ff00, 0.3);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 2) / 3)
    );
    this.arenagraphics.fillCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 2) / 3)
    );

    // Inner circle (red)
    this.arenagraphics.fillStyle(0xff0000, 0.3);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 1) / 3)
    );
    this.arenagraphics.fillCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 1) / 3)
    );

    // Create player
    this.player = this.add.circle(CENTER_X, CENTER_Y, 20, this.playerColor);

    // Velocity tracking
    this.player.velocity = { x: 0, y: 0 };
    this.player.hits = 0;
    this.player.originalRadius = 20;
    this.player.mass = 1; // Default mass

    // Create enemy group
    this.enemies = this.add.group();

    // Setup keyboard
    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Spawn enemies periodically
    this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL,
      callback: () => this.spawnEnemy(),
      callbackScope: this,
      loop: true,
    });
  }

  createScoreUI() {
    // Create a futuristic, cartoony score display
    const scoreText = this.add.text(
      this.game.config.width - 150,
      20,
      "ENEMIES DESTROYED: 0",
      {
        fontFamily: "Arial Black",
        fontSize: "24px",
        color: "#00FFFF", // Bright cyan for futuristic look
        stroke: "#00FFFF",
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: "#0066FF",
          blur: 4,
          stroke: true,
          fill: true,
        },
      }
    );
    scoreText.setOrigin(0.6, 0);
    scoreText.setScrollFactor(0); // Fixed position on screen
    return scoreText;
  }

  updateScoreUI() {
    this.scoreText.setText(`ENEMIES DESTROYED: ${this.enemiesDestroyed}`);

    // Add a little bounce animation when score updates
    this.scoreText.setScale(1.1);
    this.tweens.add({
      targets: this.scoreText,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: "Bounce",
    });
  }

  createHealthBar() {
    // Create a health bar container
    const healthBarBG = this.add.rectangle(
      50,
      this.game.config.height - 50,
      200,
      30,
      0x333333,
      0.7
    );
    const healthBar = this.add.rectangle(
      50,
      this.game.config.height - 50,
      200,
      30,
      0x00ff00,
      0.9
    );

    healthBarBG.setOrigin(0, 0.5);
    healthBar.setOrigin(0, 0.5);

    return {
      background: healthBarBG,
      bar: healthBar,
    };
  }

  updateHealthBar() {
    const healthPercentage = 1 - this.player.hits / MAX_PLAYER_HITS;
    const barWidth = 200 * healthPercentage;

    // Update bar width
    this.healthBar.bar.width = barWidth;

    // Change color based on health
    if (healthPercentage > 0.5) {
      this.healthBar.bar.fillColor = 0x00ff00; // Green
    } else if (healthPercentage > 0.25) {
      this.healthBar.bar.fillColor = 0xffff00; // Yellow
    } else {
      this.healthBar.bar.fillColor = 0xff0000; // Red
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

  determinePlayerRingState() {
    const distanceFromCenter = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      CENTER_X,
      CENTER_Y
    );

    let ringState = "outer";
    let ringColor = 0x6e6e6e;

    if (distanceFromCenter <= (OUTER_RADIUS * 1) / 3) {
      ringState = "inner";
      ringColor = 0xf5f5f5;
    } else if (distanceFromCenter <= (OUTER_RADIUS * 2) / 3) {
      ringState = "middle";
      ringColor = 0xb8b8b8;
    }

    return { ringState, ringColor };
  }

  handleRingHealthRegeneration() {
    const { ringState } = this.determinePlayerRingState();

    // Static variable to track regeneration timing
    if (!this.ringRegenTimer) {
      this.ringRegenTimer = {
        inner: { startTime: 0, currentRing: null },
        middle: { startTime: 0, currentRing: null },
      };
    }

    const timer = this.ringRegenTimer;

    // Inner ring regeneration
    if (ringState === "inner") {
      if (timer.inner.currentRing !== "inner") {
        // Reset timer when entering inner ring
        timer.inner.startTime = this.time.now;
        timer.inner.currentRing = "inner";
      }

      // Regenerate if in inner ring for at least 1 second
      if (
        this.time.now - timer.inner.startTime >= 500 &&
        this.player.hits > 0
      ) {
        this.player.hits = Math.max(0, this.player.hits - 1);
        timer.inner.startTime = this.time.now; // Reset timer
      }
    } else {
      timer.inner.currentRing = null;
    }

    // Middle ring regeneration
    if (ringState === "middle") {
      if (timer.middle.currentRing !== "middle") {
        // Reset timer when entering middle ring
        timer.middle.startTime = this.time.now;
        timer.middle.currentRing = "middle";
      }

      // Regenerate if in middle ring for at least 3 seconds
      if (
        this.time.now - timer.middle.startTime >= 1500 &&
        this.player.hits > 0
      ) {
        this.player.hits = Math.max(0, this.player.hits - 1);
        timer.middle.startTime = this.time.now; // Reset timer
      }
    } else {
      timer.middle.currentRing = null;
    }
  }

  updateRingColors() {
    const { ringState, ringColor } = this.determinePlayerRingState();

    // Redraw circles with brighter colors based on player position
    this.arenagraphics.clear();

    // Outer circle
    ringState === "outer"
      ? this.arenagraphics.fillStyle(0x0000ff, 0.5)
      : this.arenagraphics.fillStyle(0x1b2735, 0.8);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS)
    );
    this.arenagraphics.fillCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, OUTER_RADIUS)
    );

    // Middle circle
    ringState === "middle"
      ? this.arenagraphics.fillStyle(0x00ff00, 0.5)
      : this.arenagraphics.fillStyle(0x1b2735, 0.8);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 2) / 3)
    );
    this.arenagraphics.fillCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 2) / 3)
    );

    // Inner circle
    ringState === "inner"
      ? this.arenagraphics.fillStyle(0xff0000, 0.5)
      : this.arenagraphics.fillStyle(0x1b2735, 0.8);
    this.arenagraphics.lineStyle(2, 0xffffff, 1);
    this.arenagraphics.strokeCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 1) / 3)
    );
    this.arenagraphics.fillCircleShape(
      new Phaser.Geom.Circle(CENTER_X, CENTER_Y, (OUTER_RADIUS * 1) / 3)
    );

    return ringState;
  }

  spawnEnemy() {
    // Randomly spawn enemy at the border
    const angle = Math.random() * Math.PI * 2;
    const x = CENTER_X + Math.cos(angle) * (OUTER_RADIUS - 10);
    const y = CENTER_Y + Math.sin(angle) * (OUTER_RADIUS - 10);

    const enemy = this.add.circle(x, y, 15, 0xffa500);
    enemy.velocity = { x: 0, y: 0 };
    enemy.hits = 0;
    enemy.mass = 0.5; // Enemy mass
    this.enemies.add(enemy);
  }

  createTrail(x, y, color, velocity, parentObject) {
    // Calculate trail length and width based on velocity
    const trailLength = Math.sqrt(
      velocity.x * velocity.x + velocity.y * velocity.y
    );
    const trailWidth = trailLength / 3; // Adjust width relative to length

    // Create a graphics object for a smooth, solid trail
    const trail = this.add.graphics();

    // Set the trail color and alpha
    trail.setAlpha(0.7);
    trail.fillStyle(color, 0.7);

    // Calculate the movement angle
    const angle = Math.atan2(velocity.y, velocity.x);

    // Begin path
    trail.beginPath();

    // Create a curved trail using bezier curve
    trail.moveTo(0, -trailWidth / 2);
    trail.lineTo(0, trailWidth / 2);
    trail.lineTo(trailLength, trailWidth / 2);
    trail.lineTo(trailLength, -trailWidth / 2);
    trail.closePath();

    // Fill the path
    trail.fillPath();

    // Position and rotate the trail
    trail.x = x;
    trail.y = y;
    trail.rotation = angle;

    // Fade out and destroy trail
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 400,
      onComplete: () => trail.destroy(),
    });
  }

  handleCollision(obj1, obj2) {
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
    const impulse =
      (-(1 + restitution) * velocityAlongNormal) /
      (1 / obj1.mass + 1 / obj2.mass);

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
  handlePlayerMovement() {
    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.velocity.x -= ACCELERATION;
    }
    if (this.cursors.right.isDown) {
      this.player.velocity.x += ACCELERATION;
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.velocity.y -= ACCELERATION;
    }
    if (this.cursors.down.isDown) {
      this.player.velocity.y += ACCELERATION;
    }

    // Apply friction (deceleration) when no keys are pressed
    if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
      this.player.velocity.x *= FRICTION;
    }
    if (!this.cursors.up.isDown && !this.cursors.down.isDown) {
      this.player.velocity.y *= FRICTION;
    }
  }

  // Limit player speed and create trail
  updatePlayerVelocity() {
    // Limit maximum speed
    this.player.velocity.x = Math.max(
      Math.min(this.player.velocity.x, MAX_SPEED),
      -MAX_SPEED
    );
    this.player.velocity.y = Math.max(
      Math.min(this.player.velocity.y, MAX_SPEED),
      -MAX_SPEED
    );

    if (this.player.velocity.x !== 0 || this.player.velocity.y !== 0) {
      this.createTrail(
        this.player.x,
        this.player.y,
        0xffffff,
        this.player.velocity,
        this.player
      );
    }

    // Stop very small velocities
    if (Math.abs(this.player.velocity.x) < 0.1) this.player.velocity.x = 0;
    if (Math.abs(this.player.velocity.y) < 0.1) this.player.velocity.y = 0;
  }

  generateCollisionParticles(x, y) {
    // Create a group of geometric particles
    const particleCount = 20;
    const particleGroup = this.add.group();

    for (let i = 0; i < particleCount; i++) {
      // Randomly choose geometric shape
      const shapeType = Phaser.Math.Between(0, 2);
      let particle;

      switch (shapeType) {
        case 0: // Triangle
          particle = this.add.triangle(x, y, 0, 0, 5, 0, 2, 5, 0xffa500);
          break;
        case 1: // Rectangle
          particle = this.add.rectangle(x, y, 4, 4, 0xffa500);
          break;
        case 2: // Circle
          particle = this.add.circle(x, y, 3, 0xffa500);
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
      this.tweens.add({
        targets: particle,
        x: `+=${particle.velocityX * 30}`,
        y: `+=${particle.velocityY * 30}`,
        alpha: 0,
        duration: 500,
        ease: "Cubic.easeOut",
        onComplete: () => {
          particle.destroy();
        },
      });
    }

    return particleGroup;
  }

  screenShake(intensity) {
    this.tweens.add({
      targets: this.cameras.main,
      x: { from: -intensity, to: intensity },
      y: { from: -intensity, to: intensity },
      duration: 50,
      yoyo: true,
      ease: "Quad.easeInOut",
    });
  }

  constrainPlayerPosition() {
    this.player.x += this.player.velocity.x;
    this.player.y += this.player.velocity.y;

    const distanceFromCenter = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      CENTER_X,
      CENTER_Y
    );

    if (distanceFromCenter > OUTER_RADIUS - this.player.radius) {
      const angle = Phaser.Math.Angle.Between(
        CENTER_X,
        CENTER_Y,
        this.player.x,
        this.player.y
      );

      // Correct player position to be exactly on the boundary
      this.player.x =
        CENTER_X + Math.cos(angle) * (OUTER_RADIUS - this.player.radius);
      this.player.y =
        CENTER_Y + Math.sin(angle) * (OUTER_RADIUS - this.player.radius);

      // Calculate normal vector at point of collision
      const normalX = Math.cos(angle);
      const normalY = Math.sin(angle);

      // Calculate incident velocity vector
      const incidentVelX = this.player.velocity.x;
      const incidentVelY = this.player.velocity.y;

      // Calculate dot product of incident velocity with normal
      const dotProduct = incidentVelX * normalX + incidentVelY * normalY;

      // Reflect velocity across normal with some energy loss
      const reflectionFactor = 0.8;
      this.player.velocity.x =
        reflectionFactor * (incidentVelX - 2 * dotProduct * normalX);
      this.player.velocity.y =
        reflectionFactor * (incidentVelY - 2 * dotProduct * normalY);

      this.playerHit();

      // Screen shake intensity based on dot product
      const shakeIntensity = Math.min(Math.abs(dotProduct) * 2, 5);
      if (shakeIntensity > 0.5) {
        this.screenShake(shakeIntensity);
      }
    }
  }

  // Update individual enemy
  updateEnemy(enemy) {
    if (!enemy || !enemy.active) return;
    // Chase player
    const angleToPlayer = Phaser.Math.Angle.Between(
      enemy.x,
      enemy.y,
      this.player.x,
      this.player.y
    );

    // Apply acceleration towards player
    enemy.velocity.x += Math.cos(angleToPlayer) * ENEMY_ACCELERATION;
    enemy.velocity.y += Math.sin(angleToPlayer) * ENEMY_ACCELERATION;

    // Apply friction
    enemy.velocity.x *= ENEMY_FRICTION;
    enemy.velocity.y *= ENEMY_FRICTION;

    // Limit enemy speed
    enemy.velocity.x = Math.max(
      Math.min(enemy.velocity.x, ENEMY_MAX_SPEED),
      -ENEMY_MAX_SPEED
    );
    enemy.velocity.y = Math.max(
      Math.min(enemy.velocity.y, ENEMY_MAX_SPEED),
      -ENEMY_MAX_SPEED
    );

    // Update enemy position
    enemy.x += enemy.velocity.x;
    enemy.y += enemy.velocity.y;

    if (enemy.velocity.x !== 0 || enemy.velocity.y !== 0) {
      this.createTrail(this, enemy.x, enemy.y, 0xffa500, enemy.velocity, enemy);
    }
  }

  // Constrain enemy within arena
  constrainEnemyPosition(enemy) {
    if (!enemy || !enemy.active) return;
    const enemyDistanceFromCenter = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      CENTER_X,
      CENTER_Y
    );

    if (enemyDistanceFromCenter > OUTER_RADIUS - enemy.radius) {
      const boundaryAngle = Phaser.Math.Angle.Between(
        CENTER_X,
        CENTER_Y,
        enemy.x,
        enemy.y
      );

      enemy.x =
        CENTER_X + Math.cos(boundaryAngle) * (OUTER_RADIUS - enemy.radius);
      enemy.y =
        CENTER_Y + Math.sin(boundaryAngle) * (OUTER_RADIUS - enemy.radius);

      // Bounce off boundary
      enemy.velocity.x *= -0.5;
      enemy.velocity.y *= -0.5;
    }
  }

  createGameOverUI() {
    // Fade-in blur overlay
    const overlay = this.add.rectangle(
      this.game.config.width / 2,
      this.game.config.height / 2,
      this.game.config.width,
      this.game.config.height,
      0x000000,
      0
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(1999);

    // Fade in blur effect
    this.tweens.add({
      targets: overlay,
      alpha: 0.5,
      duration: 500,
      ease: "Cubic.easeOut",
    });

    // Create a larger game over container to accommodate leaderboard
    const gameOverContainer = this.add.container(
      this.game.config.width / 2,
      this.game.config.height / 2
    );
    gameOverContainer.setDepth(2000);
    gameOverContainer.setAlpha(0);

    // Stylized background rectangle (increased size)
    const background = this.add.rectangle(0, 0, 500, 600, 0x4a4a6a, 0.9);
    background.setStrokeStyle(4, 0xd3d3d3, 0.5);

    // Fantasy-style Game Over text
    const gameOverText = this.add.text(0, -250, "Game Over", {
      fontFamily: "Papyrus, Fantasy",
      fontSize: "40px",
      color: "#D4AF37",
      stroke: "#8B4513",
      strokeThickness: 4,
    });
    gameOverText.setOrigin(0.5);

    // Score text
    const scoreText = this.add.text(
      0,
      -180,
      `Enemies Destroyed: ${this.enemiesDestroyed}`,
      {
        fontFamily: "Palatino Linotype, serif",
        fontSize: "24px",
        color: "#A0D6B4",
      }
    );
    scoreText.setOrigin(0.5);

    // Leaderboard title
    const leaderboardTitle = this.add.text(0, -120, "Leaderboard", {
      fontFamily: "Papyrus, Fantasy",
      fontSize: "30px",
      color: "#D3D3D3",
    });
    leaderboardTitle.setOrigin(0.5);

    // Leaderboard mask for scrolling
    const leaderboardMask = this.add.rectangle(0, 0, 400, 200, 0x000000);
    leaderboardMask.setVisible(false);

    // Leaderboard container
    const leaderboardContainer = this.add.container(0, -30);
    leaderboardContainer.setMask(
      new Phaser.Display.Masks.GeometryMask(this, leaderboardMask)
    );

    // Buttons container
    const buttonsContainer = this.add.container(0, 230);

    // Play Again button
    const playAgainButton = this.add.text(-100, 0, "Play Again", {
      fontFamily: "Papyrus, Fantasy",
      fontSize: "28px",
      color: "#B0E0E6",
      backgroundColor: "#2F4F4F",
      padding: 10,
    });
    playAgainButton.setOrigin(0.5);
    playAgainButton.setInteractive();

    // Main Menu button
    const mainMenuButton = this.add.text(100, 0, "Main Menu", {
      fontFamily: "Papyrus, Fantasy",
      fontSize: "28px",
      color: "#B0E0E6",
      backgroundColor: "#2F4F4F",
      padding: 10,
    });
    mainMenuButton.setOrigin(0.5);
    mainMenuButton.setInteractive();

    // Button hover and click effects (apply to both buttons)
    [playAgainButton, mainMenuButton].forEach((button) => {
      button.on("pointerover", () => {
        this.tweens.add({
          targets: button,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100,
          ease: "Power1",
        });
      });

      button.on("pointerout", () => {
        this.tweens.add({
          targets: button,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: "Power1",
        });
      });
    });

    // Play Again button click effect
    playAgainButton.on("pointerdown", () => {
      // Button press visual effect
      this.tweens.add({
        targets: playAgainButton,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 50,
        yoyo: true,
        ease: "Power1",
      });

      // Fade out entire game over screen
      this.tweens.add({
        targets: [overlay, gameOverContainer],
        alpha: 0,
        duration: 500,
        ease: "Cubic.easeIn",
        onComplete: () => {
          overlay.destroy();
          gameOverContainer.destroy();
          this.resetGame();
        },
      });
    });

    // Main Menu button click effect
    mainMenuButton.on("pointerdown", () => {
      // Button press visual effect
      this.tweens.add({
        targets: mainMenuButton,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 50,
        yoyo: true,
        ease: "Power1",
      });

      // Transition to main menu
      this.tweens.add({
        targets: [overlay, gameOverContainer],
        alpha: 0,
        duration: 500,
        ease: "Cubic.easeIn",
        onComplete: () => {
          overlay.destroy();
          gameOverContainer.destroy();
          this.scene.start("MainMenuScene");
        },
      });
    });

    // Function to populate and update leaderboard
    async function updateLeaderboard() {
      try {
        // Fetch top 25 scores from Firestore
        const leaderboardRef = collection(db, "leaderboard");
        const q = query(leaderboardRef, orderBy("score", "desc"), limit(25));

        const snapshot = await getDocs(q);

        // Clear existing leaderboard entries
        leaderboardContainer.removeAll(true);

        // Color mapping for top 3 places
        const placeColors = [
          "#FFD700", // Gold (1st)
          "#C0C0C0", // Silver (2nd)
          "#CD7F32", // Bronze (3rd)
        ];

        // Populate leaderboard
        snapshot.forEach((doc, index) => {
          const data = doc.data();
          const entryColor = index < 3 ? placeColors[index] : "#FFFFFF";

          const nameText = this.add.text(-150, index * 40, data.name, {
            fontFamily: "Arial, sans-serif",
            fontSize: "22px",
            color: entryColor,
          });

          const scoreText = this.add.text(
            150,
            index * 40,
            data.score.toString(),
            {
              fontFamily: "Arial, sans-serif",
              fontSize: "22px",
              color: entryColor,
            }
          );

          leaderboardContainer.add([nameText, scoreText]);
        });
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    }

    // Function to submit score to Firestore
    async function submitScore(playerName, score) {
      try {
        await addDoc(collection(db, "leaderboard"), {
          "Enemies Destroyed": score,
          Name: playerName,
          Time: serverTimestamp(),
        });

        // Update leaderboard after submission
        updateLeaderboard();
      } catch (error) {
        console.error("Error submitting score:", error);
      }
    }

    // Add elements to container
    gameOverContainer.add([
      background,
      gameOverText,
      scoreText,
      leaderboardTitle,
      leaderboardContainer,
      buttonsContainer,
    ]);

    buttonsContainer.add([playAgainButton, mainMenuButton]);

    // Fade in game over container
    this.tweens.add({
      targets: gameOverContainer,
      alpha: 1,
      duration: 500,
      delay: 500,
      ease: "Cubic.easeOut",
      onComplete: () => {
        // Trigger leaderboard update after UI is shown
        updateLeaderboard();

        // Prompt for player name and submit score
        const playerName = prompt("Enter your name for the leaderboard:");
        if (playerName) {
          submitScore(playerName, this.enemiesDestroyed);
        }
      },
    });

    return gameOverContainer;
  }

  // Note: Ensure firebaseAPI.js is included before this script
  // Requires Firebase and Firestore to be initialized

  resetGame() {
    // Reset game state
    this.isGameOver = false;
    this.enemiesDestroyed = 0;

    // Destroy existing game over UI
    if (this.gameOverGroup) {
      this.gameOverGroup.clear(true, true);
    }

    // Recreate player
    this.player = this.add.circle(CENTER_X, CENTER_Y, 20, this.playerColor);
    this.player.velocity = { x: 0, y: 0 };
    this.player.hits = 0;
    this.player.originalRadius = 20;
    this.player.mass = 1;

    // Clear existing enemies
    this.enemies.clear(true, true);

    // Recreate enemy spawner
    this.time.addEvent({
      delay: ENEMY_SPAWN_INTERVAL,
      callback: () => this.spawnEnemy(),
      callbackScope: this,
      loop: true,
    });
  }

  // Handle collision between player and enemy
  handleEnemyPlayerCollision(enemy) {
    if (this.isGameOver) return;

    const distanceToPlayer = Phaser.Math.Distance.Between(
      enemy.x,
      enemy.y,
      this.player.x,
      this.player.y
    );
    if (distanceToPlayer < enemy.radius + this.player.radius) {
      this.generateCollisionParticles(
        (enemy.x + this.player.x) / 2,
        (enemy.y + this.player.y) / 2
      );

      // Elastic collision
      this.handleCollision(this.player, enemy);

      // Destroy enemy if hit twice
      enemy.hits++;
      if (enemy.hits >= 2) {
        enemy.destroy();
        this.enemiesDestroyed++;
        this.updateScoreUI();
        this.enemies.remove(enemy);
      }

      this.playerHit();
    }
  }

  playerHit() {
    // Increase player hits and shrink
    this.player.hits++;
    this.player.radius =
      this.player.originalRadius *
      Math.max(0, 1 - this.player.hits / MAX_PLAYER_HITS);

    // Increase player mass with hits
    this.player.mass += 0.1;

    // Check if player is defeated
    if (this.player.hits >= MAX_PLAYER_HITS) {
      // Destroy player
      this.player.destroy();

      // Set game over state
      this.isGameOver = true;

      // Stop enemy spawning
      this.time.removeAllEvents();

      // Destroy all existing enemies
      this.enemies.clear(true, true);

      // Create game over UI
      this.createGameOverUI();
    }
  }

  // Handle collision between enemy and enemy
  handleEnemyEnemyCollision(enemy1, enemy2) {
    const distanceBetweenEnemies = Phaser.Math.Distance.Between(
      enemy1.x,
      enemy1.y,
      enemy2.x,
      enemy2.y
    );
    // Check if enemies are colliding
    if (
      enemy1.active &&
      enemy2.active &&
      distanceBetweenEnemies < enemy1.radius + enemy2.radius
    ) {
      // Perform elastic collision physics
      this.handleCollision(enemy1, enemy2);
    }
  }

  // Main update method
  update() {
    if (this.isGameOver) return;

    this.updateScoreUI();

    this.handlePlayerMovement();
    this.updatePlayerVelocity();
    this.constrainPlayerPosition();

    this.handleRingHealthRegeneration();

    // Create a copy of enemies to safely iterate
    const enemyList = [...this.enemies.children.entries];

    // Update and chase enemies
    enemyList.forEach((enemy) => {
      this.updateEnemy(enemy);
      this.constrainEnemyPosition(enemy);
      this.handleEnemyPlayerCollision(enemy);

      enemyList.forEach((otherEnemy) => {
        if (!otherEnemy || enemy === otherEnemy) return;

        this.handleEnemyEnemyCollision(enemy, otherEnemy);
      });
    });

    // Update health bar
    this.updateHealthBar();

    // Update ring colors and get current ring state
    const currentRingState = this.updateRingColors();
  }
}

class MainMenuScene extends Phaser.Scene {
  constructor() {
      super({ key: 'MainMenuScene' });
      this.playerColor = 0xffffff; // Default white
  }

  create() {
      // Background
      this.add.rectangle(
          this.game.config.width / 2, 
          this.game.config.height / 2, 
          this.game.config.width, 
          this.game.config.height, 
          0x1b2735
      );

      // Game Title
      const titleText = this.add.text(
          this.game.config.width / 2, 
          100, 
          'CLASSIC MODE', 
          { 
              fontFamily: 'Arial Black', 
              fontSize: '64px', 
              color: '#00FFFF',
              stroke: '#00FFFF',
              strokeThickness: 4,
              shadow: {
                  offsetX: 3,
                  offsetY: 3,
                  color: '#0066FF',
                  blur: 4,
                  stroke: true,
                  fill: true
              }
          }
      );
      titleText.setOrigin(0.5);

      // Color Selection Section
      const colorSelectionText = this.add.text(
          this.game.config.width / 2, 
          200, 
          'SELECT PLAYER COLOR', 
          { 
              fontFamily: 'Arial Black', 
              fontSize: '24px', 
              color: '#FFFFFF' 
          }
      );
      colorSelectionText.setOrigin(0.5);

      // Preset Color Options
      const presetColors = [
          { name: 'White', color: 0xffffff },
          { name: 'Red', color: 0xff0000 },
          { name: 'Blue', color: 0x0000ff },
          { name: 'Green', color: 0x00ff00 },
          { name: 'Purple', color: 0x800080 },
          { name: 'Orange', color: 0xffa500 }
      ];

      // Color Preview
      const colorPreview = this.add.circle(
          this.game.config.width / 2, 
          270, 
          40, 
          this.playerColor
      ).setStrokeStyle(2, 0xffffff);

      // Preset Color Buttons
      const colorButtonContainer = this.add.container(
          this.game.config.width / 2, 
          350
      );
      
      presetColors.forEach((colorOption, index) => {
          const colorButton = this.add.circle(
              (index - (presetColors.length - 1) / 2) * 70, 
              0, 
              25, 
              colorOption.color
          );
          colorButton.setInteractive();
          colorButton.setStrokeStyle(2, 0xffffff);
          colorButton.on('pointerdown', () => {
              this.playerColor = colorOption.color;
              colorPreview.fillColor = this.playerColor;
          });
          
          colorButtonContainer.add(colorButton);
      });

      // Instructions
      const instructionsText = this.add.text(
          this.game.config.width / 2, 
          450, 
          `INSTRUCTIONS:
- Use WASD keys to move
- Destroy as many enemies as possible by collision
- Being in red regens health every 0.5 secs
- Being in green regens health every 1.5 secs`, 
          { 
              fontFamily: 'Arial', 
              fontSize: '18px', 
              color: '#FFFFFF',
              align: 'center'
          }
      );
      instructionsText.setOrigin(0.5);

      // Buttons container
      const buttonsContainer = this.add.container(
          this.game.config.width / 2, 
          550
      );

      // Start Button
      const startButton = this.add.text(
          -100, 
          0, 
          'START', 
          { 
              fontFamily: 'Arial Black', 
              fontSize: '32px', 
              color: '#B0E0E6', 
              backgroundColor: '#2F4F4F', 
              padding: 10 
          }
      );
      startButton.setOrigin(0.5);
      startButton.setInteractive();

      // Quit Button (Return to Main Menu)
      const quitButton = this.add.text(
          100, 
          0, 
          'QUIT', 
          { 
              fontFamily: 'Arial Black', 
              fontSize: '32px', 
              color: '#B0E0E6', 
              backgroundColor: '#2F4F4F', 
              padding: 10 
          }
      );
      quitButton.setOrigin(0.5);
      quitButton.setInteractive();

      // Button hover and click effects
      [startButton, quitButton].forEach(button => {
          button.on('pointerover', () => {
              this.tweens.add({
                  targets: button,
                  scaleX: 1.1,
                  scaleY: 1.1,
                  duration: 100,
                  ease: 'Power1'
              });
          });

          button.on('pointerout', () => {
              this.tweens.add({
                  targets: button,
                  scaleX: 1,
                  scaleY: 1,
                  duration: 100,
                  ease: 'Power1'
              });
          });
      });

      // Start game button
      startButton.on('pointerdown', () => {
          this.tweens.add({
              targets: startButton,
              scaleX: 0.9,
              scaleY: 0.9,
              duration: 50,
              yoyo: true,
              ease: 'Power1',
              onComplete: () => {
                  this.scene.start('GameScene', { playerColor: this.playerColor });
              }
          });
      });

      // Quit button
      quitButton.on('pointerdown', () => {
          this.tweens.add({
              targets: quitButton,
              scaleX: 0.9,
              scaleY: 0.9,
              duration: 50,
              yoyo: true,
              ease: 'Power1',
              onComplete: () => {
                window.location.href = 'billiardbash.html';
              }
          });
      });

      // Add buttons to container
      buttonsContainer.add([startButton, quitButton]);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  transparent: true,
  parent: "game-container",
  scene: [MainMenuScene, GameScene],
};

const game = new Phaser.Game(config);
