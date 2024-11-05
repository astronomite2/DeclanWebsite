class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }

    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        return mag > 0 ? this.multiply(1 / mag) : new Vector2D();
    }
}

class GameObject {
    constructor(position, radius, mass) {
        this.position = position;
        this.velocity = new Vector2D();
        this.radius = radius;
        this.mass = mass;
    }

    update(deltaTime) {
        this.position = this.position.add(this.velocity.multiply(deltaTime));
    }

    collidesWith(other) {
        const distance = Math.sqrt(
            Math.pow(this.position.x - other.position.x, 2) +
            Math.pow(this.position.y - other.position.y, 2)
        );
        return distance < (this.radius + other.radius);
    }
}

class Player extends GameObject {
    constructor(position) {
        super(position, 15, 1);
        this.energy = 100;
        this.maxEnergy = 100;
        this.acceleration = 500;
        this.drag = 0.97;
        this.isOvercharged = false;
    }

    update(deltaTime, keys, arena) {
        // Handle input
        if (keys.w) this.velocity.y -= this.acceleration * deltaTime;
        if (keys.s) this.velocity.y += this.acceleration * deltaTime;
        if (keys.a) this.velocity.x -= this.acceleration * deltaTime;
        if (keys.d) this.velocity.x += this.acceleration * deltaTime;

        // Apply drag
        this.velocity = this.velocity.multiply(this.drag);

        // Update position
        super.update(deltaTime);

        // Calculate energy gain based on speed and ring position
        const speed = this.velocity.magnitude();
        const distanceFromCenter = Math.sqrt(
            Math.pow(this.position.x - arena.center.x, 2) +
            Math.pow(this.position.y - arena.center.y, 2)
        );
        
        let multiplier = 1;
        if (distanceFromCenter > arena.radius * 0.66) multiplier = 2;
        else if (distanceFromCenter > arena.radius * 0.33) multiplier = 1.5;

        this.energy = Math.min(this.maxEnergy, 
            this.energy + (speed * 0.01 * multiplier * deltaTime));
        
        this.isOvercharged = this.energy >= this.maxEnergy;

        // Keep player in arena
        const distToCenter = Math.sqrt(
            Math.pow(this.position.x - arena.center.x, 2) +
            Math.pow(this.position.y - arena.center.y, 2)
        );
        
        if (distToCenter + this.radius > arena.radius) {
            return false; // Game over - touched lava
        }

        return true;
    }

    explode() {
        if (this.isOvercharged) {
            this.energy = this.maxEnergy / 2;
            this.isOvercharged = false;
            return true;
        }
        return false;
    }
}

class Enemy extends GameObject {
    constructor(position) {
        super(position, 12, 0.8);
        this.speed = 200;
    }

    update(deltaTime, playerPos) {
        const direction = new Vector2D(
            playerPos.x - this.position.x,
            playerPos.y - this.position.y
        ).normalize();

        this.velocity = direction.multiply(this.speed);
        super.update(deltaTime);
    }
}

class Arena {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.radius = Math.min(width, height) * 0.45;
        this.center = new Vector2D(width / 2, height / 2);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        this.arena = new Arena(this.canvas.width, this.canvas.height);
        this.player = new Player(new Vector2D(this.arena.center.x, this.arena.center.y));
        this.enemies = [];
        this.keys = { w: false, a: false, s: false, d: false, f: false };
        
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.isGameOver = false;
        
        this.setupEventListeners();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() in this.keys) {
                this.keys[e.key.toLowerCase()] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() in this.keys) {
                this.keys[e.key.toLowerCase()] = false;
            }
        });

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    spawnEnemy() {
        const angle = Math.random() * Math.PI * 2;
        const position = new Vector2D(
            this.arena.center.x + Math.cos(angle) * this.arena.radius,
            this.arena.center.y + Math.sin(angle) * this.arena.radius
        );
        this.enemies.push(new Enemy(position));
    }

    update(timestamp) {
        if (this.isGameOver) return;

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Update player
        if (!this.player.update(deltaTime, this.keys, this.arena)) {
            this.gameOver();
            return;
        }

        // Handle explosion
        if (this.keys.f && this.player.explode()) {
            this.enemies = this.enemies.filter(enemy => {
                const dist = Math.sqrt(
                    Math.pow(enemy.position.x - this.player.position.x, 2) +
                    Math.pow(enemy.position.y - this.player.position.y, 2)
                );
                return dist > this.arena.radius / 3;
            });
        }

        // Update enemies
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime, this.player.position);
            
            if (enemy.collidesWith(this.player)) {
                const speed = this.player.velocity.magnitude();
                const energyCost = speed * 10;
                
                if (this.player.energy >= energyCost) {
                    this.player.energy -= energyCost;
                    this.enemies = this.enemies.filter(e => e !== enemy);
                } else {
                    this.gameOver();
                }
            }
        });

        // Spawn enemies
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer > 2) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        this.updateEnergyBar();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw arena background (lava)
        this.ctx.fillStyle = '#300';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw safe zone
        this.ctx.beginPath();
        this.ctx.arc(this.arena.center.x, this.arena.center.y, this.arena.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#000';
        this.ctx.fill();

        // Draw arena rings
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 2;
        // Inner ring
        this.ctx.beginPath();
        this.ctx.arc(this.arena.center.x, this.arena.center.y, this.arena.radius * 0.33, 0, Math.PI * 2);
        this.ctx.stroke();
        // Middle ring
        this.ctx.beginPath();
        this.ctx.arc(this.arena.center.x, this.arena.center.y, this.arena.radius * 0.66, 0, Math.PI * 2);
        this.ctx.stroke();

        // Draw enemies
        this.enemies.forEach(enemy => {
            // Enemy body
            this.ctx.beginPath();
            this.ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#f63';
            this.ctx.fill();

            // Fiery particle effect
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i / 8) + (performance.now() / 1000);
                const distance = enemy.radius * 0.5;
                const x = enemy.position.x + Math.cos(angle) * distance;
                const y = enemy.position.y + Math.sin(angle) * distance;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                this.ctx.fillStyle = '#fa3';
                this.ctx.fill();
            }
        });

        // Draw player
        this.ctx.beginPath();
        this.ctx.arc(this.player.position.x, this.player.position.y, this.player.radius, 0, Math.PI * 2);
        
        // Player color based on energy state
        if (this.player.isOvercharged) {
            this.ctx.fillStyle = '#0ff';
            
            // Electric effect when overcharged
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i / 12) + (performance.now() / 500);
                const distance = this.player.radius * 1.2;
                const x = this.player.position.x + Math.cos(angle) * distance;
                const y = this.player.position.y + Math.sin(angle) * distance;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                this.ctx.fillStyle = '#0ff';
                this.ctx.fill();
            }
        } else {
            this.ctx.fillStyle = '#fff';
        }
        
        this.ctx.fill();
    }

    updateEnergyBar() {
        const energyFill = document.getElementById('energy-fill');
        const percentage = (this.player.energy / this.player.maxEnergy) * 100;
        energyFill.style.width = `${percentage}%`;
        
        // Change color based on energy level
        if (this.player.isOvercharged) {
            energyFill.style.backgroundColor = '#0ff';
        } else if (percentage > 66) {
            energyFill.style.backgroundColor = '#4CAF50';
        } else if (percentage > 33) {
            energyFill.style.backgroundColor = '#FFC107';
        } else {
            energyFill.style.backgroundColor = '#f44336';
        }
    }

    gameOver() {
        this.isGameOver = true;
        
        // Hide game screen and show game over screen
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.remove('hidden');
        
        // Update final score
        const finalScore = Math.floor(this.player.energy);
        document.getElementById('final-score').textContent = finalScore;
        
        // Update leaderboard (simplified version - could be expanded with server integration)
        this.updateLeaderboard(finalScore);
    }

    updateLeaderboard(score) {
        // In a full implementation, this would communicate with a server
        // For now, we'll use localStorage to persist scores
        let leaderboard = JSON.parse(localStorage.getItem('fireArenaLeaderboard') || '[]');
        const playerID = 'Player' + Math.floor(Math.random() * 1000);
        
        leaderboard.push({ id: playerID, score: score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10); // Keep top 10
        
        localStorage.setItem('fireArenaLeaderboard', JSON.stringify(leaderboard));
        
        // Update leaderboard display
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';
        
        leaderboard.forEach((entry, index) => {
            const entryElement = document.createElement('div');
            entryElement.className = 'leaderboard-entry';
            entryElement.innerHTML = `
                <span>${index + 1}. ${entry.id}</span>
                <span>${entry.score}</span>
            `;
            leaderboardList.appendChild(entryElement);
        });
    }

    start() {
        // Reset game state
        this.isGameOver = false;
        this.player = new Player(new Vector2D(this.arena.center.x, this.arena.center.y));
        this.enemies = [];
        this.enemySpawnTimer = 0;
        
        // Show countdown
        const countdown = document.getElementById('countdown');
        countdown.classList.remove('hidden');
        
        let count = 3;
        countdown.textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdown.textContent = count;
            } else {
                clearInterval(countdownInterval);
                countdown.classList.add('hidden');
                
                // Start game loop
                this.gameLoop();
                
                // Show game screen
                document.getElementById('opening-screen').classList.add('hidden');
                document.getElementById('game-screen').classList.remove('hidden');
            }
        }, 1000);
    }

    gameLoop(timestamp) {
        this.update(timestamp);
        this.draw();
        
        if (!this.isGameOver) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new Game();
    
    // Set up button event listeners
    document.getElementById('start-button').addEventListener('click', () => {
        game.start();
    });
    
    document.getElementById('play-again-button').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        game.start();
    });
    
    document.getElementById('main-menu-button').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('opening-screen').classList.remove('hidden');
    });
    
    document.getElementById('exit-button').addEventListener('click', () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('opening-screen').classList.remove('hidden');
    });
});