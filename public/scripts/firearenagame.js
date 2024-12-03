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
        lavaBorderWidth: 50
      });

    arenaView.renderArena();
}
const game = new Phaser.Game(config);

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
        
        // Define green gradient colors
        const greenColors = [
          0x228B22,   // Forest Green (outer ring)
          0x2E8B57,   // Sea Green (middle ring)
          0x3CB371,   // Medium Sea Green (inner ring)
        ];
        
        // Draw concentric circles with different green shades
        const ringCount = 3;
        const ringWidth = playableRadius / ringCount;
    
        for (let i = 0; i < ringCount; i++) {
          // Calculate radius for each ring
          const currentRadius = playableRadius - (i * ringWidth);
          const innerRadius = currentRadius - ringWidth;
          
          // Set fill color for the current ring
          graphics.fillStyle(greenColors[i], 1);
          
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