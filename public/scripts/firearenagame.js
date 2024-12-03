const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: {
        create: createScene
    }
};

config.scene.preload = preloadScene;
config.scene.create = createScene;

function preloadScene() {
    // Preload assets if needed
}

function createScene() {

    // Initialize and render the arena view
    const arenaView = new ArenaView(this, {
        centerX: this.game.config.width / 2,
        centerY: this.game.config.height / 2,
        arenaRadius: 300,
        lavaBorderWidth: 50,
        physics: {
            default: 'arcade',
            arcade: {
                debug: false
            }
        },
        scene: [GameScene]
      });
}

class ArenaView {
    /**
     * Create an Arena View
     * @param {Phaser.Scene} scene - The Phaser scene to render the arena in
     * @param {Object} config - Configuration for the arena
     * @param {number} config.centerX - X coordinate of arena center
     * @param {number} config.centerY - Y coordinate of arena center
     * @param {number} config.arenaRadius - Total radius of the arena
     * @param {number} config.lavaBorderWidth - Width of the lava border
     */
    constructor(scene, config) {
      this.scene = scene;
      this.centerX = config.centerX;
      this.centerY = config.centerY;
      this.arenaRadius = config.arenaRadius;
      this.lavaBorderWidth = config.lavaBorderWidth;
    }
  
    /**
     * Renders the circular arena with a lava border
     */
    renderArena() {
      // Create the lava border first (underneath)
      this.drawLavaBorder();
  
      // Create the main playable area (inner circle)
      this.drawPlayableArea();
    }
  
    /**
     * Draws the inner playable circle with concentric green gradients
     * @private
     */
    drawPlayableArea() {
        // Create the main green/ground area
        const playableRadius = this.arenaRadius - this.lavaBorderWidth;
        
        // Use graphics to draw the playable area
        const graphics = this.scene.add.graphics();
        
        // Define gray gradient colors
        const bluishGrayColors = [
            0x5F6A6A,   // Slate Gray (outer ring)
            0x85929E,   // Light Slate Gray (middle ring)
            0xAAB7B8    // Gainsboro Gray (inner ring)
        ];
        
        // Draw concentric circles with different green shades
        const ringCount = 3;
        const ringWidth = playableRadius / ringCount;
    
        for (let i = 0; i < ringCount; i++) {
          // Calculate radius for each ring
          const currentRadius = playableRadius - (i * ringWidth);
          const innerRadius = currentRadius - ringWidth;
          
          // Set fill color for the current ring
          graphics.fillStyle(bluishGrayColors[i], 1);
          
          // Draw the ring
          graphics.beginPath();
          graphics.arc(
            this.centerX, 
            this.centerY, 
            currentRadius, 
            0, 
            Math.PI * 2, 
            false
          );
          
          // If not the innermost ring, cut out the inner circle
        //   if (i < ringCount - 1) {
        //     graphics.beginPath();
        //     graphics.arc(
        //       this.centerX, 
        //       this.centerY, 
        //       innerRadius, 
        //       0, 
        //       Math.PI * 2, 
        //       true  // Note the reversed direction for the inner circle
        //     );
        //   }
          
          graphics.fillPath();
        }
    }
  
    /**
     * Draws the lava border around the arena
     * @private
     */
    drawLavaBorder() {
      const graphics = this.scene.add.graphics();
      
      // Set line style and fill for a complete lava border
      graphics.lineStyle(this.lavaBorderWidth, 0x8b0000, 1); // Dark red border
      graphics.fillStyle(0xff4500, 1); // Bright orange-red fill
      
      // Draw the complete outer circle (lava border)
      graphics.beginPath();
      graphics.arc(
        this.centerX, 
        this.centerY, 
        this.arenaRadius, 
        0, 
        Math.PI * 2, 
        false
      );
      
      // Ensure the circle is completely filled and stroked
      graphics.closePath();
      graphics.strokePath();
      graphics.fillPath();
    }
  
    /**
     * Gets the dimensions and boundaries of the arena
     * @returns {Object} Arena configuration object
     */
    getArenaDimensions() {
      return {
        centerX: this.centerX,
        centerY: this.centerY,
        totalRadius: this.arenaRadius,
        playableRadius: this.arenaRadius - this.lavaBorderWidth
      };
    }
}

class PlayerStats {
    constructor() {
        this._energy = 100;
        this._maxEnergy = 100;
        this._speed = 0;
        this._health = 100;
        this._isOvercharged = false;
    }

    // Energy methods
    get energy() {
        return this._energy;
    }

    set energy(value) {
        this._energy = Math.max(0, Math.min(value, this._maxEnergy));
        
        // Check for overcharge state
        this._isOvercharged = this._energy >= this._maxEnergy;
    }

    get isOvercharged() {
        return this._isOvercharged;
    }

    // Speed methods
    get speed() {
        return this._speed;
    }

    set speed(value) {
        this._speed = Math.max(0, value);
    }

    // Health methods
    get health() {
        return this._health;
    }

    set health(value) {
        this._health = Math.max(0, Math.min(value, 100));
    }

    // Method to increase energy based on movement
    increaseEnergyFromMovement(deltaSpeed) {
        // Increase energy proportionally to movement speed
        const energyGain = deltaSpeed * 0.1;
        this.energy += energyGain;
    }

    // Method to decrease energy
    decreaseEnergy(amount) {
        this.energy -= amount;
    }
}

class PlayerController {
    /**
     * Creates a player controller in a Phaser scene
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} config - Configuration for the player
     * @param {number} config.x - Initial x position
     * @param {number} config.y - Initial y position
     * @param {ArenaView} config.arenaView - Arena view to manage boundaries
     */
    constructor(scene, config) {
        this.scene = scene;
        this.arenaView = config.arenaView;
        this.stats = new PlayerStats();

        // Player sprite and physics
        this.player = scene.add.circle(config.x, config.y, 20, 0x00ff00);
        scene.physics.add.existing(this.player);

        // Movement configuration
        this.accelerationRate = 10;
        this.maxSpeed = 200;
        this.friction = 0.9;

        // Input handling
        this.cursors = scene.input.keyboard.createCursorKeys();
        
        // Collision configuration
        this.lastCollisionTime = 0;
        this.collisionCooldown = 500; // milliseconds
    }

    /**
     * Handles player movement based on WASD/Arrow key input
     */
    handleMovement() {
        const body = this.player.body;
        const arenaDimensions = this.arenaView.getArenaDimensions();

        // Keyboard input
        const left = this.cursors.left.isDown;
        const right = this.cursors.right.isDown;
        const up = this.cursors.up.isDown;
        const down = this.cursors.down.isDown;

        // Calculate acceleration
        let accelerationX = 0;
        let accelerationY = 0;

        if (left) accelerationX -= this.accelerationRate;
        if (right) accelerationX += this.accelerationRate;
        if (up) accelerationY -= this.accelerationRate;
        if (down) accelerationY += this.accelerationRate;

        // Apply acceleration
        body.setAcceleration(accelerationX, accelerationY);

        // Limit velocity
        const currentSpeed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        this.stats.speed = currentSpeed;

        // Increase energy based on movement
        if (currentSpeed > 0) {
            this.stats.increaseEnergyFromMovement(currentSpeed);
        }

        // Apply friction when no keys are pressed
        if (!left && !right && !up && !down) {
            body.setVelocity(
                body.velocity.x * this.friction, 
                body.velocity.y * this.friction
            );
        }

        // Arena boundary check
        this.checkArenaBoundaries(arenaDimensions);
    }

    /**
     * Checks and constrains player within arena boundaries
     * @param {Object} arenaDimensions - Dimensions of the arena
     */
    checkArenaBoundaries(arenaDimensions) {
        const distanceFromCenter = Phaser.Math.Distance.Between(
            this.player.x, 
            this.player.y, 
            arenaDimensions.centerX, 
            arenaDimensions.centerY
        );

        // If player is outside playable radius, push back
        if (distanceFromCenter > arenaDimensions.playableRadius - this.player.radius) {
            // Calculate push back vector
            const angle = Phaser.Math.Angle.Between(
                arenaDimensions.centerX, 
                arenaDimensions.centerY, 
                this.player.x, 
                this.player.y
            );

            // Slightly reduce player's velocity and move towards arena center
            this.player.body.setVelocity(
                -Math.cos(angle) * this.stats.speed,
                -Math.sin(angle) * this.stats.speed
            );

            // Optional: Add a small energy penalty for boundary collision
            this.stats.decreaseEnergy(5);
        }
    }

    /**
     * Handles collision with enemies
     * @param {Phaser.GameObjects.GameObject} enemy - Enemy object
     */
    handleCollision(enemy) {
        const currentTime = this.scene.time.now;

        // Collision cooldown to prevent rapid successive damage
        if (currentTime - this.lastCollisionTime > this.collisionCooldown) {
            // Reduce health and energy
            this.stats.health -= 10;
            this.stats.decreaseEnergy(15);

            // Trigger collision animation
            this.handleCollisionAnimation(enemy);

            // Update last collision time
            this.lastCollisionTime = currentTime;
        }

        // Check if player is dead
        this.checkDeath();
    }

    /**
     * Handles collision animation
     * @param {Phaser.GameObjects.GameObject} enemy - Enemy object
     */
    handleCollisionAnimation(enemy) {
        // Flash the player red briefly
        this.player.setFillStyle(0xff0000);
        this.scene.time.delayedCall(200, () => {
            this.player.setFillStyle(0x00ff00);
        });

        // Optional: Add a slight knockback effect
        const angle = Phaser.Math.Angle.Between(
            enemy.x, enemy.y, 
            this.player.x, this.player.y
        );

        this.player.body.setVelocity(
            -Math.cos(angle) * 100,
            -Math.sin(angle) * 100
        );
    }

    /**
     * Checks if player is dead and handles game over state
     */
    checkDeath() {
        if (this.stats.health <= 0) {
            // Game over logic
            this.scene.scene.restart(); // Simple restart, can be customized
        }
    }

    /**
     * Updates player state each frame
     */
    update() {
        this.handleMovement();
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Preload any assets if needed
    }

    create() {
        // Set up physics
        this.physics.world.setBounds(0, 0, this.game.config.width, this.game.config.height);

        // Create arena view
        const arenaConfig = {
            centerX: this.game.config.width / 2,
            centerY: this.game.config.height / 2,
            arenaRadius: Math.min(this.game.config.width, this.game.config.height) / 2 - 50,
            lavaBorderWidth: 20
        };
        this.arenaView = new ArenaView(this, arenaConfig);
        this.arenaView.renderArena();

        // Create player
        const playerConfig = {
            x: arenaConfig.centerX,
            y: arenaConfig.centerY,
            arenaView: this.arenaView
        };
        this.playerController = new PlayerController(this, playerConfig);

        // Create some dummy enemies (for demonstration)
        this.createEnemies();

        // Display player stats
        this.createStatsDisplay();
    }

    createEnemies() {
        this.enemies = this.physics.add.group();
        
        // Create a few enemies around the arena
        for (let i = 0; i < 3; i++) {
            const angle = Phaser.Math.PI2 * (i / 3);
            const arenaDimensions = this.arenaView.getArenaDimensions();
            const enemyRadius = 15;
            
            const enemy = this.add.circle(
                arenaDimensions.centerX + Math.cos(angle) * (arenaDimensions.playableRadius / 2), 
                arenaDimensions.centerY + Math.sin(angle) * (arenaDimensions.playableRadius / 2), 
                enemyRadius, 
                0xff0000
            );
            
            this.physics.add.existing(enemy);
            this.enemies.add(enemy);

            // Set up collision between player and enemies
            this.physics.add.overlap(
                this.playerController.player, 
                enemy, 
                () => this.playerController.handleCollision(enemy),
                null,
                this
            );
        }
    }

    createStatsDisplay() {
        // Create text to display player stats
        this.energyText = this.add.text(10, 10, '', { 
            fontSize: '18px', 
            fill: '#ffffff' 
        });
        this.healthText = this.add.text(10, 40, '', { 
            fontSize: '18px', 
            fill: '#ffffff' 
        });
    }

    update() {
        // Update player controller
        this.playerController.update();

        // Update stats display
        this.energyText.setText(`Energy: ${Math.round(this.playerController.stats.energy)}`);
        this.healthText.setText(`Health: ${Math.round(this.playerController.stats.health)}`);
    }
}

const game = new Phaser.Game(config);
const gameScene = new GameScene();
game.scene.add('GameScene', gameScene, true);