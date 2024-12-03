const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: {
        create: createScene
    }
};

const game = new Phaser.Game(config);

function createScene() {
    // Create a black square
    this.add.rectangle(200, 300, 100, 100, 0x000000);
    
    // Create a red square
    this.add.rectangle(600, 300, 100, 100, 0xFF0000);
}