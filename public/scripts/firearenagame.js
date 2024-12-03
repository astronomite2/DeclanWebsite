import * as PIXI from '/scripts/pixi.js';

const app = new PIXI.Application;
app.renderer.resize(800, 600);
app.renderer.background.color = 0xffffff;

document.body.appendChild(app.view);
console.log("Fire arena game script running");
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

// Initialize arena view with event listeners
const arena = new ArenaView(app);
app.stage.addChild(arena);
