function createBackground() {
    const background = document.getElementById('background');
    const shapes = ['triangle', 'square', 'pentagon', 'hexagon', 'octagon'];
    
    // Clear existing shapes
    background.innerHTML = '';
    
    // Create a 5x3 grid of shapes
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            const shape = document.createElement('div');
            shape.className = 'shape';
            const size = 80; // Fixed size for consistency
            const shapeIndex = (row * 5 + col) % shapes.length;
            const points = shapes[shapeIndex];
            
            shape.style.width = `${size}px`;
            shape.style.height = `${size}px`;
            shape.style.animationDelay = `${(row * 5 + col) * 0.2}s`;
            
            if (points === 'triangle') {
                shape.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            } else if (points === 'square') {
                shape.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
            } else if (points === 'pentagon') {
                shape.style.clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
            } else if (points === 'hexagon') {
                shape.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
            } else if (points === 'octagon') {
                shape.style.clipPath = 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
            }
            
            background.appendChild(shape);
        }
    }
}

// Font families array remains the same

function rotateFonts() {
    const characters = document.querySelectorAll('.character');
    characters.forEach(char => {
        const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
        char.style.fontFamily = `'${randomFont}', sans-serif`;
        // Add a small random rotation for extra effect
        const rotation = Math.random() * 10 - 5;
        const scale = 0.9 + Math.random() * 0.2;
        char.style.transform = `rotate(${rotation}deg) scale(${scale})`;
    });
}

// Initialize background and start font rotation
createBackground();

const nameContainer = document.querySelector('.name-container');
let rotationInterval;

nameContainer.addEventListener('mouseenter', () => {
    rotationInterval = setInterval(rotateFonts, 300); // Faster rotation
});

nameContainer.addEventListener('mouseleave', () => {
    clearInterval(rotationInterval);
    // Reset character rotations
    document.querySelectorAll('.character').forEach(char => {
        char.style.transform = 'rotate(0deg)';
    });
});

function toggleDropdown(event) {
    const dropdownContent = document.getElementById("dropdownContent");
    dropdownContent.classList.toggle("show");
    
    // Prevent the click from being caught by the window click handler
    event && event.stopPropagation();
}

// Close the dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdownContent = document.getElementById("dropdownContent");
    const mainButton = event.target.closest('.main-button');
    
    if (!mainButton && dropdownContent.classList.contains('show')) {
        dropdownContent.classList.remove('show');
    }
});

// Stop propagation of clicks inside dropdown to prevent closing
document.getElementById("dropdownContent").addEventListener('click', function(event) {
    event.stopPropagation();
});