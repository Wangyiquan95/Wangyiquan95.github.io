const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game settings
const gridSize = 20;
canvas.width = 400;
canvas.height = 400;

// Define nucleotides and colors
const nucleotides = ['A', 'U', 'G', 'C'];
const nucleotideColors = {
    'A': '#ff4500', // Example color for 'A'
    'U': '#4682b4', // Example color for 'U'
    'G': '#32cd32', // Example color for 'G'
    'C': '#ffa07a'  // Example color for 'C'
};

const snake = [{ x: 100, y: 100, nucleotide: 'A' }]; // Start with one segment of 'A'
let direction = { x: gridSize, y: 0 };
let nucleotide = randomNucleotide();
let score = 0;

// Function to randomly generate a nucleotide on the grid
function randomNucleotide() {
    const x = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize;
    const y = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize;
    const value = nucleotides[Math.floor(Math.random() * nucleotides.length)];
    return { x, y, value };
}

// Draw the snake and nucleotide
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw snake
    snake.forEach(segment => {
        ctx.fillStyle = nucleotideColors[segment.nucleotide];
        ctx.font = "16px monospace";
        ctx.fillText(segment.nucleotide, segment.x + 5, segment.y + 15);
    });

    // Draw nucleotide
    ctx.fillStyle = nucleotideColors[nucleotide.value];
    ctx.font = "16px monospace";
    ctx.fillText(nucleotide.value, nucleotide.x + 5, nucleotide.y + 15);
}

// Move the snake
function update() {
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Game over conditions
    if (head.x < 0 || head.y < 0 || head.x >= canvas.width || head.y >= canvas.height || collision(head)) {
        alert('Game Over! Your RNA strand died.');
        document.location.reload();
        return;
    }

    // Add new head segment with the nucleotide it has just eaten
    snake.unshift({ ...head, nucleotide: nucleotide.value });

    // Check if snake eats nucleotide
    if (head.x === nucleotide.x && head.y === nucleotide.y) {
        nucleotide = randomNucleotide();
        score++;
    } else {
        snake.pop(); // Remove the last segment if not eating nucleotide
    }
}

// Check for self-collision
function collision(head) {
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
}

// Control snake movement
window.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp':
            if (direction.y === 0) direction = { x: 0, y: -gridSize };
            break;
        case 'ArrowDown':
            if (direction.y === 0) direction = { x: 0, y: gridSize };
            break;
        case 'ArrowLeft':
            if (direction.x === 0) direction = { x: -gridSize, y: 0 };
            break;
        case 'ArrowRight':
            if (direction.x === 0) direction = { x: gridSize, y: 0 };
            break;
    }
});

// Main game loop
function gameLoop() {
    update();
    draw();
    setTimeout(gameLoop, 100);
}

gameLoop();
