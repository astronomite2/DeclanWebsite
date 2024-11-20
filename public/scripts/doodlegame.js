// Import Firebase
import { db } from "./firebaseAPI.js";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const finalScoreElement = document.getElementById('finalScore');

// Canvas setup
canvas.width = 800;
canvas.height = 600;

// Game variables
let player = {
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

// Keyboard controls
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Game functions
function generatePlatforms() {
    platforms = [];
    platforms.push({
        x: player.x - platformWidth / 2,
        y: player.y + player.height,
        width: platformWidth,
        height: platformHeight
    });
    
    for (let i = 1; i < platformCount; i++) {
        platforms.push({
            x: Math.random() * (canvas.width - platformWidth),
            y: (canvas.height / platformCount) * i,
            width: platformWidth,
            height: platformHeight
        });
    }
}

function movePlayer() {
    if (keys['ArrowLeft']) {
        player.velocityX = -player.speed;
    } else if (keys['ArrowRight']) {
        player.velocityX = player.speed;
    } else {
        player.velocityX = 0;
    }

    if (keys['Space'] && player.isOnPlatform) {
        player.velocityY = player.jumpForce;
        player.isOnPlatform = false;
    }

    player.velocityY += player.gravity;
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Wall collision
    if (player.x <= 0 || player.x + player.width >= canvas.width) {
        gameOver = true;
        showGameOver();
        finalScoreElement.textContent = score;
    }

    player.isOnPlatform = false;

    // Platform collision
    platforms.forEach(platform => {
        if (player.velocityY > 0 &&
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width) {
            player.velocityY = 0;
            player.y = platform.y - player.height;
            player.isOnPlatform = true;
        }
    });

    if (player.y > canvas.height) {
        gameOver = true;
        showGameOver();
        finalScoreElement.textContent = score;
    }
}

// Function to show game over screen
function showGameOver() {
    const overlay = document.querySelector('.game-over-overlay');
    overlay.classList.add('active');
}

// Function to hide game over screen
function hideGameOver() {
    const overlay = document.querySelector('.game-over-overlay');
    overlay.classList.remove('active');
}


function updatePlatforms() {
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#333';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

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

// UI Functions
function toggleCustomization() {
    const menu = document.getElementById('customizationMenu');
    menu.classList.toggle('show');
}

function updatePlayerColor() {
    const colorInput = document.getElementById('playerColor').value;
    if (/^#[0-9A-F]{6}$/i.test(colorInput)) {
        player.color = colorInput;
    } else {
        alert('Please enter a valid hex color (e.g., #FF0000)');
    }
}

async function submitScore() {
    const playerNameInput = document.getElementById('playerName');
    const playerName = playerNameInput.value.trim();
    const submitButton = document.querySelector('.submit-score button');
    
    if (playerName) {
        try {
            submitButton.disabled = true;
            await addDoc(collection(db, 'leaderboard'), {
                name: playerName,
                score: score,
                timestamp: serverTimestamp()
            });
            await updateLeaderboardDisplay();
            playerNameInput.value = '';
            setTimeout(() => {
                resetGame();
                submitButton.disabled = false;
            }, 1500);
        } catch (error) {
            console.error("Error submitting score:", error);
            alert('Error submitting score. Please try again.');
            submitButton.disabled = false;
        }
    } else {
        alert('Please enter your name');
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
    hideGameOver();
    generatePlatforms();
    gameLoop();
}

// Leaderboard functions
async function updateLeaderboardDisplay() {
    const leaderboardData = await getLeaderboardData();
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    // Always show top 3 positions
    for (let i = 0; i < 3; i++) {
        const entry = leaderboardData[i] || { name: 'N/A', score: '---' };
        const entryElement = document.createElement('div');
        entryElement.className = 'leaderboard-entry';
        entryElement.innerHTML = `
            <span class="rank">#${i + 1}</span>
            <span class="name">${entry.name}</span>
            <span class="score">${entry.score}</span>
        `;
        leaderboardList.appendChild(entryElement);
    }

    // Add remaining entries
    for (let i = 3; i < leaderboardData.length; i++) {
        const entry = leaderboardData[i];
        const entryElement = document.createElement('div');
        entryElement.className = 'leaderboard-entry';
        entryElement.innerHTML = `
            <span class="rank">#${i + 1}</span>
            <span class="name">${entry.name}</span>
            <span class="score">${entry.score}</span>
        `;
        leaderboardList.appendChild(entryElement);
    }
}

async function getLeaderboardData() {
    const leaderboardRef = collection(db, 'leaderboard');
    const q = query(leaderboardRef, orderBy('score', 'desc'), limit(10));
    
    try {
        const querySnapshot = await getDocs(q);
        const leaderboardData = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            leaderboardData.push({
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

function initGame() {
    generatePlatforms();
    updateLeaderboardDisplay();
    gameLoop();
}

// Export necessary functions for HTML
export { 
    initGame,
    submitScore,
    resetGame,
    toggleCustomization,
    updatePlayerColor
};