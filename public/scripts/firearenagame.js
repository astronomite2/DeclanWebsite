import * as PIXI from '/pixi.js';

const app = new PIXI.Application({ width: 800, height: 600 });
document.body.appendChild(app.view);

class PlayerStats {
    constructor() {
        this._energy = 100;
        this._speed = 0;
        this._health = 100;
    }

    // Getters
    get energy() { return this._energy; }
    get speed() { return this._speed; }
    get health() { return this._health; }

    // Setters
    setEnergy(value) { 
        this._energy = Math.max(0, Math.min(100, value)); 
        return this;
    }

    setSpeed(value) { 
        this._speed = value; 
        return this;
    }

    setHealth(value) { 
        this._health = Math.max(0, Math.min(100, value)); 
        return this;
    }
}

class PlayerController extends PIXI.Sprite {
    constructor(texture) {
        super(texture);
        this.stats = new PlayerStats();
        this.acceleration = 0;
        this.friction = 0.9;
        this.maxSpeed = 5;
        this.isOvercharged = false;
        
        // Enable interactive events
        this.interactive = true;
    }

    handleMovement(keyState) {
        const acceleration = 0.5;
        
        // WASD Movement Logic
        if (keyState.w) this.y -= this.stats.speed;
        if (keyState.s) this.y += this.stats.speed;
        if (keyState.a) this.x -= this.stats.speed;
        if (keyState.d) this.x += this.stats.speed;

        // Calculate speed based on movement
        this.stats.setSpeed(
            Math.min(
                Math.sqrt(
                    Math.pow(keyState.w || keyState.s ? acceleration : 0, 2) + 
                    Math.pow(keyState.a || keyState.d ? acceleration : 0, 2)
                ),
                this.maxSpeed
            )
        );
    }

    handlePhysics() {
        // Apply friction to slow down player
        this.stats.setSpeed(this.stats.speed * this.friction);
        
        // Update position based on speed
        this.x += this.stats.speed;
        this.y += this.stats.speed;
    }

    updateEnergy() {
        // Increase energy based on movement
        const energyGain = this.stats.speed * 0.1;
        const newEnergy = this.stats.energy + energyGain;
        
        this.stats.setEnergy(newEnergy);
        
        // Check for overcharge state
        this.isOvercharged = this.stats.energy >= 100;
    }

    checkDeath(enemies, lavaBorder) {
        // Collision detection with enemies
        const isDead = enemies.some(enemy => this.checkCollision(enemy)) || 
                       this.checkCollision(lavaBorder);
        
        return isDead;
    }

    handleCollision(collidedEntity) {
        const energyLoss = collidedEntity.damage || 10;
        this.stats.setEnergy(this.stats.energy - energyLoss);
        this.handleCollisionAnimation();
    }

    handleCollisionAnimation() {
        // Briefly change player's alpha for visual feedback
        this.alpha = 0.5;
        setTimeout(() => { this.alpha = 1; }, 200);
    }

    checkCollision(entity) {
        return this.getBounds().intersects(entity.getBounds());
    }
}

class ArenaView extends PIXI.Graphics {
    constructor(app, radius = 500, borderThickness = 20) {
        super();
        
        this.app = app;
        this.radius = radius;
        this.borderThickness = borderThickness;
        
        this.drawArena();
        this.setupBorderCollision();
    }

    drawArena() {
        // Clear previous drawings
        this.clear();

        // Draw main arena circle (playable area)
        this.beginFill(0x2c3e50); // Dark blue-gray background
        this.drawCircle(this.app.screen.width / 2, this.app.screen.height / 2, this.radius);
        this.endFill();

        // Draw lava border
        this.lineStyle(this.borderThickness, 0xe74c3c); // Red lava border
        this.drawCircle(this.app.screen.width / 2, this.app.screen.height / 2, this.radius + this.borderThickness / 2);
    }

    setupBorderCollision() {
        this.interactive = true;
        this.hitArea = new PIXI.Circle(
            this.app.screen.width / 2, 
            this.app.screen.height / 2, 
            this.radius
        );
    }

    checkBorderCollision(player) {
        const centerX = this.app.screen.width / 2;
        const centerY = this.app.screen.height / 2;
        
        const distanceFromCenter = Math.sqrt(
            Math.pow(player.x - centerX, 2) + 
            Math.pow(player.y - centerY, 2)
        );

        // Collision occurs when player crosses the playable area boundary
        return distanceFromCenter > this.radius;
    }
}

class GameManager {
    constructor(app, playerController, arena) {
        this.app = app;
        this.playerController = playerController;
        this.arena = arena;
        this.gameState = {
            isStarted: false,
            isGameOver: false,
            countdown: 3
        };
        this.setupGameOverUI();
    }

    setupGameOverUI() {
        this.gameOverContainer = new PIXI.Container();
        this.gameOverText = new PIXI.Text('Game Over', {
            fontFamily: 'Arial',
            fontSize: 48,
            fill: 0xff0000
        });
        this.playAgainButton = this.createButton('Play Again', this.resetGame.bind(this));
        this.exitButton = this.createButton('Exit', this.exitGame.bind(this));

        this.gameOverContainer.addChild(this.gameOverText);
        this.gameOverContainer.addChild(this.playAgainButton);
        this.gameOverContainer.addChild(this.exitButton);
        this.gameOverContainer.visible = false;
        this.app.stage.addChild(this.gameOverContainer);
    }

    createButton(text, onClick) {
        const button = new PIXI.Graphics();
        button.beginFill(0x3498db);
        button.drawRoundedRect(0, 0, 200, 50, 10);
        button.endFill();
        
        const buttonText = new PIXI.Text(text, {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff
        });
        buttonText.anchor.set(0.5);
        buttonText.x = 100;
        buttonText.y = 25;
        
        button.addChild(buttonText);
        button.interactive = true;
        button.on('pointerdown', onClick);
        
        return button;
    }

    startGame() {
        this.gameState.isStarted = true;
        this.startCountdown();
    }

    startCountdown() {
        const countdownText = new PIXI.Text(this.gameState.countdown, {
            fontFamily: 'Arial',
            fontSize: 72,
            fill: 0xffffff
        });
        countdownText.anchor.set(0.5);
        countdownText.x = this.app.screen.width / 2;
        countdownText.y = this.app.screen.height / 2;
        
        this.app.stage.addChild(countdownText);

        const countdownInterval = setInterval(() => {
            this.gameState.countdown--;
            countdownText.text = this.gameState.countdown;

            if (this.gameState.countdown <= 0) {
                clearInterval(countdownInterval);
                this.app.stage.removeChild(countdownText);
                this.enableGameplay();
            }
        }, 1000);
    }

    enableGameplay() {
        this.playerController.interactive = true;
        // Additional gameplay setup
    }

    gameOver() {
        this.gameState.isGameOver = true;
        this.playerController.interactive = false;
        
        this.gameOverContainer.x = this.app.screen.width / 2 - 100;
        this.gameOverContainer.y = this.app.screen.height / 2 - 100;
        this.gameOverContainer.visible = true;
    }

    resetGame() {
        this.gameState.isStarted = false;
        this.gameState.isGameOver = false;
        this.gameState.countdown = 3;
        
        this.gameOverContainer.visible = false;
        this.playerController.stats.setEnergy(100);
        this.startGame();
    }

    exitGame() {
        // Implement game exit logic
        console.log('Exiting game');
        // Potential implementation: window.close() or redirect
    }
}

// Game Initialization
function initializeGame() {
    const app = new PIXI.Application({
        width: 800,
        height: 600,
        backgroundColor: 0x1a1a2e,
        view: document.getElementById('game-container')
    });

    // Create player sprite
    const playerTexture = PIXI.Texture.from('player-sprite.png');
    const playerController = new PlayerController(playerTexture);
    playerController.x = app.screen.width / 2;
    playerController.y = app.screen.height / 2;
    app.stage.addChild(playerController);

    // Create arena
    const arena = new ArenaView(app);
    app.stage.addChild(arena);

    // Create game manager
    const gameManager = new GameManager(app, playerController, arena);
    
    // Key event handling
    const keyState = {
        w: false, a: false, s: false, d: false
    };

    window.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'w': keyState.w = true; break;
            case 'a': keyState.a = true; break;
            case 's': keyState.s = true; break;
            case 'd': keyState.d = true; break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch(e.key.toLowerCase()) {
            case 'w': keyState.w = false; break;
            case 'a': keyState.a = false; break;
            case 's': keyState.s = false; break;
            case 'd': keyState.d = false; break;
        }
    });

    // Game loop
    app.ticker.add(() => {
        if (gameManager.gameState.isStarted && !gameManager.gameState.isGameOver) {
            playerController.handleMovement(keyState);
            playerController.handlePhysics();
            playerController.updateEnergy();

            // Check arena border collision
            if (arena.checkBorderCollision(playerController)) {
                gameManager.gameOver();
            }
        }
    });

    // Start game
    gameManager.startGame();
}

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeGame);
