const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game variables
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 30,
    height: 30,
    velocityY: 0,
    velocityX: 0,
    speed: 5,
    jumpForce: -15,
    gravity: 0.5,
    color: '#4CAF50',
    isOnPlatform: false
};

let platforms = [];
let score = 0;
let gameOver = false;
const platformWidth = 100;
const platformHeight = 20;
const platformCount = 7;

//Firebase Variables
import { app } from "firebaseAPI.js";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
const db = getFirestore(app);

// Leaderboard functionality
async function getLeaderboardData() {
    const leaderboardRef = collection(db, 'leaderboard');
    const q = query(leaderboardRef, orderBy('score', 'desc'), limit(100));
    
    try {
        const querySnapshot = await getDocs(q);
        const leaderboardData = [];
        querySnapshot.forEach((doc, index) => {
            const data = doc.data();
            leaderboardData.push({
                rank: index + 1,
                name: data.name,
                score: data.score
            });
        });
        return leaderboardData;
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        return [];
    }
}

// Function to add new score to leaderboard
async function addScoreToLeaderboard(playerName, score) {
    try {
        const leaderboardRef = collection(db, 'leaderboard');
        await addDoc(leaderboardRef, {
            name: playerName,
            score: score,
            timestamp: serverTimestamp()
        });
        updateLeaderboardDisplay();
    } catch (error) {
        console.error("Error adding score:", error);
    }
}

// Update leaderboard display
async function updateLeaderboardDisplay() {
    const leaderboardData = await getLeaderboardData();
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    leaderboardData.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'leaderboard-entry';
        entryElement.innerHTML = `
            <span class="rank">#${entry.rank}</span>
            <span class="name">${entry.name}</span>
            <span class="score">${entry.score}</span>
        `;
        leaderboardList.appendChild(entryElement);
    });
}

// Generate initial platforms
function generatePlatforms() {
    platforms = [];
    // Add starting platform directly under the player
    platforms.push({
        x: player.x - platformWidth / 2,
        y: player.y + player.height,
        width: platformWidth,
        height: platformHeight
    });
    
    // Generate remaining platforms
    for (let i = 1; i < platformCount; i++) {
        platforms.push({
            x: Math.random() * (canvas.width - platformWidth),
            y: (canvas.height / platformCount) * i,
            width: platformWidth,
            height: platformHeight
        });
    }
}

// Customization functions
function toggleCustomization() {
    const menu = document.getElementById('customizationMenu');
    menu.classList.toggle('show');
}

function updatePlayerColor() {
    const colorInput = document.getElementById('playerColor').value;
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(colorInput)) {
        player.color = colorInput;
    } else {
        alert('Please enter a valid hex color (e.g., #FF0000)');
    }
}

// Handle keyboard input
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function checkWallCollision() {
    // Check if player touches the walls
    if (player.x <= 0 || player.x + player.width >= canvas.width) {
        gameOver = true;
        gameOverElement.style.display = 'block';
        finalScoreElement.textContent = score;
    }
}

function submitScore() {
    const playerName = document.getElementById('playerName').value.trim();
    if (playerName) {
        addScoreToLeaderboard(playerName, score);
        // Disable submit button to prevent multiple submissions
        document.querySelector('.submit-score button').disabled = true;
    } else {
        alert('Please enter your name');
    }
}

function movePlayer() {
    // Horizontal movement
    if (keys['ArrowLeft']) {
        player.velocityX = -player.speed;
    } else if (keys['ArrowRight']) {
        player.velocityX = player.speed;
    } else {
        player.velocityX = 0;
    }

    // Jump only when on platform
    if (keys['Space'] && player.isOnPlatform) {
        player.velocityY = player.jumpForce;
        player.isOnPlatform = false;
    }

    // Apply gravity
    player.velocityY += player.gravity;

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Check wall collision
    checkWallCollision();

    // Reset isOnPlatform
    player.isOnPlatform = false;

    // Platform collision
    platforms.forEach(platform => {
        if (player.velocityY > 0 && // Moving downward
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width) {
            player.velocityY = 0;
            player.y = platform.y - player.height;
            player.isOnPlatform = true;
        }
    });

    // Game over condition for falling
    if (player.y > canvas.height) {
        gameOver = true;
        gameOverElement.style.display = 'block';
        finalScoreElement.textContent = score;
    }
}

function updatePlatforms() {
    // Move platforms down when player reaches upper half
    if (player.y < canvas.height / 2) {
        player.y = canvas.height / 2;
        platforms.forEach(platform => {
            platform.y += Math.abs(player.velocityY);
            if (platform.y > canvas.height) {
                platform.y = 0;
                platform.x = Math.random() * (canvas.width - platformWidth);
                score++;
                scoreElement.textContent = score;
            }
        });
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#333';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw player with custom color
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function gameLoop() {
    if (!gameOver) {
        movePlayer();
        updatePlatforms();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

function resetGame() {
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.velocityY = 0;
    player.velocityX = 0;
    player.isOnPlatform = false;
    score = 0;
    scoreElement.textContent = '0';
    gameOver = false;
    gameOverElement.style.display = 'none';
    document.getElementById('playerName').value = ''; // Clear player name input
    document.querySelector('.submit-score button').disabled = false; // Re-enable submit button
    generatePlatforms();
    gameLoop();
}

function initGame() {
    generatePlatforms();
    updateLeaderboardDisplay(); // Initial leaderboard load
    gameLoop();
}

setInterval(updateLeaderboardDisplay, 30000);

initGame();