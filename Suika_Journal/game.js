// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    // Set up Matter.js
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Body = Matter.Body,
          Events = Matter.Events,
          World = Matter.World;

    // Load sound effects
    const dropSound = new Audio('sounds/drop.mp3');
    const mergeSound = new Audio('sounds/merge.mp3');
    const gameOverSound = new Audio('sounds/gameover.mp3');
    
    // Preload sounds
    dropSound.load();
    mergeSound.load();
    gameOverSound.load();

    // Responsive canvas sizing
    const gameContainer = document.querySelector('.game-area');
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;
    
    // Set game dimensions based on device
    const isMobile = window.innerWidth <= 768;
    const gameWidth = isMobile ? Math.min(containerWidth, 350) : 400;
    const gameHeight = isMobile ? Math.min(containerHeight, 500) : 600;
    const scaleFactor = gameWidth / 400; // Use 400 as base width

    // Create engine
    const engine = Engine.create({
        gravity: { x: 0, y: 1, scale: 0.001 }
    });
    const world = engine.world;

    // Create renderer
    const canvas = document.getElementById('game-canvas');
    const render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: gameWidth,
            height: gameHeight,
            wireframes: false,
            background: '#fff'
        }
    });

    // Create walls
    const wallOptions = {
        isStatic: true,
        render: {
            fillStyle: '#333'
        }
    };

    // Bottom wall
    const ground = Bodies.rectangle(gameWidth/2, gameHeight, gameWidth, 20, wallOptions);
    // Left wall
    const leftWall = Bodies.rectangle(0, gameHeight/2, 20, gameHeight, wallOptions);
    // Right wall
    const rightWall = Bodies.rectangle(gameWidth, gameHeight/2, 20, gameHeight, wallOptions);

    World.add(world, [ground, leftWall, rightWall]);

    // Load fruit images
    const fruitImages = {};
    
    // Define fruit types with image paths
    const fruitTypes = [
        { name: 'cherry', radius: 15, color: '#FF0000', points: 1, nextSize: 'strawberry', imagePath: 'images/plos_one.png' },
        { name: 'strawberry', radius: 25, color: '#FF3366', points: 3, nextSize: 'grape', imagePath: 'images/scientific_reports.png' },
        { name: 'grape', radius: 35, color: '#9400D3', points: 6, nextSize: 'orange', imagePath: 'images/pnas.png' },
        { name: 'orange', radius: 45, color: '#FFA500', points: 10, nextSize: 'apple', imagePath: 'images/science_advances.png' },
        { name: 'apple', radius: 55, color: '#32CD32', points: 15, nextSize: 'pear', imagePath: 'images/nature_communications.png' },
        { name: 'pear', radius: 65, color: '#AAFF00', points: 21, nextSize: 'peach', imagePath: 'images/science.png' },
        { name: 'peach', radius: 75, color: '#FFCC99', points: 28, nextSize: 'pineapple', imagePath: 'images/nature.png' },
        { name: 'pineapple', radius: 85, color: '#FFFF00', points: 36, nextSize: 'melon', imagePath: 'images/cell.png' },
        { name: 'melon', radius: 95, color: '#00FF00', points: 45, nextSize: 'watermelon', imagePath: 'images/nobel_prize.png' },
        { name: 'watermelon', radius: 105, color: '#00AA00', points: 55, nextSize: 'superstar', imagePath: 'images/money.png' },
        { name: 'superstar', radius: 25, color: '#FFD700', points: 100, nextSize: null, imagePath: 'images/superstar.png' }
    ];
    
    // Preload all fruit images
    function preloadImages() {
        return new Promise((resolve, reject) => {
            let loadedCount = 0;
            
            fruitTypes.forEach(fruit => {
                const img = new Image();
                img.onload = () => {
                    fruitImages[fruit.name] = img;
                    loadedCount++;
                    if (loadedCount === fruitTypes.length) {
                        resolve();
                    }
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${fruit.imagePath}`);
                    // Use fallback color if image fails to load
                    loadedCount++;
                    if (loadedCount === fruitTypes.length) {
                        resolve();
                    }
                };
                img.src = fruit.imagePath;
            });
        });
    }

    // Game state
    let score = 0;
    let currentFruit = null;
    let nextFruit = getRandomFruit();
    let canDropFruit = true;
    let gameOver = false;
    let highScore = localStorage.getItem('suikaHighScore') || 0; // Load high score from localStorage
    
    // Global top scores (you can define these)
    const globalTopScores = [
        { name: "Jennif", score: 1999 },
        { name: "Lucia", score: 1944 },
        { name: "Tong", score: 1901 }
    ];
    
    // Update high score display if it exists
    if (document.getElementById('high-score')) {
        document.getElementById('high-score').textContent = highScore;
    }

    // Get random fruit (only from the first 5 types)
    function getRandomFruit() {
        const randomIndex = Math.floor(Math.random() * 5);
        return fruitTypes[randomIndex];
    }

    // Create a fruit body
    function createFruit(x, y, fruitType) {
        // Calculate the proper scaling to make the image fit in a circle
        // while maintaining aspect ratio and maximizing resolution
        const img = fruitImages[fruitType.name];
        let xScale, yScale;
        
        if (img) {
            // Determine which dimension needs more scaling (to fit a circle)
            const diameter = fruitType.radius * 2;
            
            // Use the larger scaling factor to ensure the image fills the circle completely
            if (img.width > img.height) {
                yScale = diameter / img.height;
                xScale = yScale; // Keep aspect ratio
            } else {
                xScale = diameter / img.width;
                yScale = xScale; // Keep aspect ratio
            }
        }
        
        // Create a composite body with an outline
        const fruit = Bodies.circle(x, y, fruitType.radius, {
            restitution: 0.3,
            friction: 0.01,
            frictionAir: 0.005,
            density: 0.001,
            render: {
                sprite: {
                    texture: fruitType.imagePath,
                    xScale: xScale,
                    yScale: yScale
                },
                // Add outline properties
                lineWidth: 2,
                strokeStyle: '#333333',
                fillStyle: 'transparent'
            },
            collisionFilter: {
                group: 0,
                category: 0x0001,
                mask: 0xFFFFFFFF
            },
            fruitType: fruitType
        });
        
        return fruit;
    }

    // Update score display
    function updateScore(points) {
        score += points;
        document.getElementById('score').textContent = score;
    }

    // Draw next fruit preview
    function drawNextFruit() {
        const nextCanvas = document.getElementById('next-fruit-canvas');
        const ctx = nextCanvas.getContext('2d');
        
        // Increase canvas resolution for higher quality rendering
        const pixelRatio = window.devicePixelRatio || 1;
        const width = 80;
        const height = 80;
        
        // Set display size
        nextCanvas.style.width = width + 'px';
        nextCanvas.style.height = height + 'px';
        
        // Set actual size in memory (scaled for higher resolution)
        nextCanvas.width = width * pixelRatio;
        nextCanvas.height = height * pixelRatio;
        
        // Scale context to ensure correct drawing operations
        ctx.scale(pixelRatio, pixelRatio);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw fruit image
        if (fruitImages[nextFruit.name]) {
            const img = fruitImages[nextFruit.name];
            
            // Calculate the scaling factor to fit the image properly
            const scaleFactor = 0.75;
            const maxDimension = Math.min(width, height) * scaleFactor;
            
            let drawWidth, drawHeight;
            
            // Calculate dimensions while maintaining aspect ratio
            if (img.width > img.height) {
                drawWidth = maxDimension;
                drawHeight = (img.height / img.width) * drawWidth;
            } else {
                drawHeight = maxDimension;
                drawWidth = (img.width / img.height) * drawHeight;
            }
            
            // Center the image
            const x = (width - drawWidth) / 2;
            const y = (height - drawHeight) / 2;
            
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw a subtle background circle
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, maxDimension / 2, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
            
            // Draw the image with crisp rendering
            ctx.drawImage(fruitImages[nextFruit.name], x, y, drawWidth, drawHeight);
            
            // Add a subtle shadow/glow effect
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            // Fallback to circle if image not loaded
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, width * 0.35, 0, 2 * Math.PI);
            ctx.fillStyle = nextFruit.color;
            ctx.fill();
        }
    }

    // Handle mouse/touch move
    function handlePointerMove(event) {
        if (currentFruit && canDropFruit && !gameOver) {
            const rect = canvas.getBoundingClientRect();
            // Handle both mouse and touch events
            const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : null);

            if (clientX !== null) {
                const x = clientX - rect.left;

                // Constrain x position to keep fruit within walls
                constrainedX = Math.max(
                    currentFruit.fruitType.radius + 10,
                    Math.min(gameWidth - currentFruit.fruitType.radius - 10, x)
                );

                Body.setPosition(currentFruit, { x: constrainedX, y: 50 });
            }
        }
    }

    // Handle mouse click to drop fruit (desktop only)
    function handleMouseClick() {
        if (currentFruit && canDropFruit && !gameOver) {
            dropCurrentFruit();
        }
    }

    // Handle touch start (mobile only)
    function handleTouchStart(event) {
        event.preventDefault(); // Prevent double tap to zoom

        if (currentFruit && canDropFruit && !gameOver) {
            // Start tracking touch position
            const rect = canvas.getBoundingClientRect();
            const clientX = event.touches[0].clientX;
            const x = clientX - rect.left;

            // Constrain x position
            constrainedX = Math.max(
                currentFruit.fruitType.radius + 10,
                Math.min(gameWidth - currentFruit.fruitType.radius - 10, x)
            );

            Body.setPosition(currentFruit, { x: constrainedX, y: 50 });
        }
    }

    // Handle touch move with improved responsiveness
    function handleTouchMove(event) {
        event.preventDefault(); // Prevent scrolling

        if (currentFruit && canDropFruit && !gameOver) {
            const rect = canvas.getBoundingClientRect();
            const clientX = event.touches[0].clientX;
            const x = clientX - rect.left;

            // Constrain x position with smoother movement
            constrainedX = Math.max(
                currentFruit.fruitType.radius + 10,
                Math.min(gameWidth - currentFruit.fruitType.radius - 10, x)
            );

            Body.setPosition(currentFruit, { x: constrainedX, y: 50 });
        }
    }

    // Handle touch end (mobile only)
    function handleTouchEnd(event) {
        event.preventDefault();

        if (currentFruit && canDropFruit && !gameOver) {
            dropCurrentFruit();
        }
    }

    // Common function to drop the current fruit
    function dropCurrentFruit() {
        // Enable gravity for the current fruit
        Body.setStatic(currentFruit, false);

        // Play drop sound
        dropSound.currentTime = 0;
        dropSound.play().catch(e => console.log("Audio play error:", e));

        // Prevent dropping another fruit until this one settles
        canDropFruit = false;

        // Set a timeout to create a new fruit
        setTimeout(function() {
            if (!gameOver) {
                currentFruit = createFruit(gameWidth/2, 50, nextFruit);
                Body.setStatic(currentFruit, true);
                World.add(world, currentFruit);

                nextFruit = getRandomFruit();
                drawNextFruit();

                canDropFruit = true;
            }
        }, 500);
    }

    // Detect if device supports touch
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Add appropriate event listeners based on device type
    if (isTouchDevice) {
        // Touch device - use touch events
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Add visual indicator for mobile users
        const dropIndicator = document.createElement('div');
        dropIndicator.className = 'mobile-indicator';
        dropIndicator.textContent = 'Touch & drag to position, release to drop';
        dropIndicator.style.position = 'absolute';
        dropIndicator.style.bottom = '10px';
        dropIndicator.style.left = '0';
        dropIndicator.style.right = '0';
        dropIndicator.style.textAlign = 'center';
        dropIndicator.style.color = 'rgba(0,0,0,0.5)';
        dropIndicator.style.fontSize = '12px';
        dropIndicator.style.padding = '5px';
        dropIndicator.style.pointerEvents = 'none';
        gameContainer.appendChild(dropIndicator);

        // Hide indicator after 5 seconds
        setTimeout(() => {
            dropIndicator.style.opacity = '0';
            dropIndicator.style.transition = 'opacity 1s';
        }, 5000);
    } else {
        // Desktop device - use mouse events
        canvas.addEventListener('mousemove', handlePointerMove);
        canvas.addEventListener('click', handleMouseClick);
    }

    // Remove the old event listeners that we're replacing
    // canvas.addEventListener('click', handlePointerDown);
    // canvas.addEventListener('touchstart', function(e) {
    //     e.preventDefault();
    //     handlePointerDown(e);
    // });

    // Check for collisions between fruits
    Events.on(engine, 'collisionStart', function(event) {
        const pairs = event.pairs;
        // Track which bodies have been processed in this collision cycle
        const processedBodies = new Set();

        for (let i = 0; i < pairs.length; i++) {
            const bodyA = pairs[i].bodyA;
            const bodyB = pairs[i].bodyB;

            // Skip if either body has already been processed in this cycle
            if (processedBodies.has(bodyA.id) || processedBodies.has(bodyB.id)) {
                continue;
            }

            // Check if both bodies are fruits and of the same type
            if (bodyA.fruitType && bodyB.fruitType &&
                bodyA.fruitType.name === bodyB.fruitType.name &&
                bodyA.fruitType.nextSize) {

                // Calculate the midpoint between the two fruits
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;

                // Find the next fruit type
                const nextFruitType = fruitTypes.find(f => f.name === bodyA.fruitType.nextSize);

                if (nextFruitType) {
                    // Mark these bodies as processed
                    processedBodies.add(bodyA.id);
                    processedBodies.add(bodyB.id);
                    
                    // Remove the two colliding fruits
                    World.remove(world, [bodyA, bodyB]);

                    // Create a new, larger fruit
                    const newFruit = createFruit(midX, midY, nextFruitType);
                    World.add(world, newFruit);

                    // Play merge sound
                    mergeSound.currentTime = 0;
                    mergeSound.play().catch(e => console.log("Audio play error:", e));

                    // Update score
                    updateScore(nextFruitType.points);
                }
            }
        }
    });

    // Check for game over condition
    Events.on(engine, 'afterUpdate', function() {
        if (gameOver) return;

        // Check if any fruit is above the top boundary
        const bodies = Matter.Composite.allBodies(world);
        const topBoundary = isMobile ? 80 : 100; // Adjust boundary for mobile

        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];

            if (body.fruitType && !body.isStatic && body.position.y < topBoundary) {
                // Check if the body has been static for a while
                if (!body.timeAboveBoundary) {
                    body.timeAboveBoundary = Date.now();
                } else if (Date.now() - body.timeAboveBoundary > 3000) {
                    // Game over if a fruit has been above the boundary for 3 seconds
                    gameOver = true;

                    // Play game over sound
                    gameOverSound.currentTime = 0;
                    gameOverSound.play().catch(e => console.log("Audio play error:", e));

                    // Check for high score
                    let isNewHighScore = false;
                    if (score > highScore) {
                        highScore = score;
                        localStorage.setItem('suikaHighScore', highScore);
                        isNewHighScore = true;
                    }
                    
                    // Show game over dialog with share option
                    showGameOverDialog(score, isNewHighScore);
                    break;
                }
            } else if (body.timeAboveBoundary) {
                // Reset the timer if the body moves below the boundary
                body.timeAboveBoundary = null;
            }
        }
    });
    
    // Function to show game over dialog with share option
    function showGameOverDialog(finalScore, isNewHighScore) {
        // Create modal container
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        // Create modal content
        const content = document.createElement('div');
        content.style.backgroundColor = 'white';
        content.style.padding = '20px';
        content.style.borderRadius = '10px';
        content.style.maxWidth = '80%';
        content.style.textAlign = 'center';
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Game Over!';
        title.style.marginTop = '0';
        content.appendChild(title);
        
        // Add score
        const scoreText = document.createElement('p');
        scoreText.textContent = `Your score: ${finalScore}`;
        scoreText.style.fontSize = '1.2em';
        content.appendChild(scoreText);
        
        // Add high score message
        const highScoreText = document.createElement('p');
        highScoreText.textContent = `Your high score: ${highScore}`;
        content.appendChild(highScoreText);
        
        // Add congratulations for new high score
        if (isNewHighScore) {
            const congrats = document.createElement('p');
            congrats.textContent = '🎉 Congratulations! New high score! 🎉';
            congrats.style.color = '#FF9900';
            congrats.style.fontWeight = 'bold';
            congrats.style.fontSize = '1.2em';
            content.appendChild(congrats);
        }
        
        // Add global rankings section
        const rankingsTitle = document.createElement('h3');
        rankingsTitle.textContent = 'Global Top 3';
        rankingsTitle.style.marginTop = '20px';
        rankingsTitle.style.marginBottom = '10px';
        content.appendChild(rankingsTitle);
        
        // Create rankings table
        const rankingsTable = document.createElement('table');
        rankingsTable.style.width = '100%';
        rankingsTable.style.marginBottom = '20px';
        rankingsTable.style.borderCollapse = 'collapse';
        
        // Add table header
        const tableHeader = document.createElement('tr');
        
        const rankHeader = document.createElement('th');
        rankHeader.textContent = 'Rank';
        rankHeader.style.padding = '5px';
        rankHeader.style.borderBottom = '1px solid #ddd';
        tableHeader.appendChild(rankHeader);
        
        const nameHeader = document.createElement('th');
        nameHeader.textContent = 'Name';
        nameHeader.style.padding = '5px';
        nameHeader.style.borderBottom = '1px solid #ddd';
        tableHeader.appendChild(nameHeader);
        
        const scoreHeader = document.createElement('th');
        scoreHeader.textContent = 'Score';
        scoreHeader.style.padding = '5px';
        scoreHeader.style.borderBottom = '1px solid #ddd';
        tableHeader.appendChild(scoreHeader);
        
        rankingsTable.appendChild(tableHeader);
        
        // Add top 3 scores
        globalTopScores.forEach((topScore, index) => {
            const row = document.createElement('tr');
            
            // Highlight row if player's score is higher
            if (finalScore > topScore.score) {
                row.style.opacity = '0.5';
            }
            
            const rankCell = document.createElement('td');
            rankCell.textContent = `#${index + 1}`;
            rankCell.style.padding = '5px';
            row.appendChild(rankCell);
            
            const nameCell = document.createElement('td');
            nameCell.textContent = topScore.name;
            nameCell.style.padding = '5px';
            row.appendChild(nameCell);
            
            const scoreCell = document.createElement('td');
            scoreCell.textContent = topScore.score;
            scoreCell.style.padding = '5px';
            row.appendChild(scoreCell);
            
            rankingsTable.appendChild(row);
        });
        
        content.appendChild(rankingsTable);
        
        // Add player's rank message if they beat any global scores
        let playerRank = globalTopScores.length + 1;
        for (let i = 0; i < globalTopScores.length; i++) {
            if (finalScore > globalTopScores[i].score) {
                playerRank = i + 1;
                break;
            }
        }
        
        if (playerRank <= globalTopScores.length) {
            const playerRankMsg = document.createElement('p');
            playerRankMsg.textContent = `Your score would rank #${playerRank} globally!`;
            playerRankMsg.style.fontWeight = 'bold';
            playerRankMsg.style.color = '#4CAF50';
            content.appendChild(playerRankMsg);
        }
        
        // Add share button
        const shareButton = document.createElement('button');
        shareButton.textContent = 'Share Score';
        shareButton.style.padding = '10px 15px';
        shareButton.style.margin = '10px';
        shareButton.style.backgroundColor = '#4267B2';
        shareButton.style.color = 'white';
        shareButton.style.border = 'none';
        shareButton.style.borderRadius = '5px';
        shareButton.style.cursor = 'pointer';
        
        shareButton.addEventListener('click', function() {
            const shareText = `I scored ${finalScore} points in Suika Journal! Can you beat my score?`;
            const shareUrl = window.location.href;
            
            // Check if Web Share API is available
            if (navigator.share) {
                navigator.share({
                    title: 'My Suika Journal Score',
                    text: shareText,
                    url: shareUrl
                })
                .then(() => console.log('Successfully shared'))
                .catch(error => {
                    console.log('Error sharing:', error);
                    // Fallback if sharing fails
                    copyToClipboard(shareText + ' ' + shareUrl);
                });
            } else {
                // Fallback for browsers that don't support Web Share API
                copyToClipboard(shareText + ' ' + shareUrl);
            }
        });
        content.appendChild(shareButton);
        
        // Helper function to copy text to clipboard
        function copyToClipboard(text) {
            // Create temporary element
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            let successful = false;
            try {
                successful = document.execCommand('copy');
                const msg = successful ? 'Score copied to clipboard! Share it with your friends.' : 'Unable to copy';
                alert(msg);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy. Please manually copy your score: ' + text);
            }
            
            document.body.removeChild(textArea);
            return successful;
        }
        
        // Add play again button
        const playAgainButton = document.createElement('button');
        playAgainButton.textContent = 'Play Again';
        playAgainButton.style.padding = '10px 15px';
        playAgainButton.style.margin = '10px';
        playAgainButton.style.backgroundColor = '#4CAF50';
        playAgainButton.style.color = 'white';
        playAgainButton.style.border = 'none';
        playAgainButton.style.borderRadius = '5px';
        playAgainButton.style.cursor = 'pointer';
        
        playAgainButton.addEventListener('click', function() {
            location.reload();
        });
        content.appendChild(playAgainButton);
        
        // Add modal to page
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // Improve renderer settings for better resolution
    Render.setPixelRatio(render, window.devicePixelRatio || 1);

    // Start the game after images are loaded
    preloadImages().then(() => {
        Render.run(render);
        const runner = Runner.create();
        Runner.run(runner, engine);

        // Create the first fruit
        currentFruit = createFruit(200, 50, nextFruit);
        Body.setStatic(currentFruit, true);
        World.add(world, currentFruit);

        nextFruit = getRandomFruit();
        drawNextFruit();
    }).catch(error => {
        console.error("Error loading images:", error);
    });

    // Add restart functionality
    document.getElementById('restart-button').addEventListener('click', function() {
        if (confirm('Are you sure you want to restart the game?')) {
            location.reload();
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        // Update mobile status
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== isMobile) {
            // Reload the page if mobile status changed
            location.reload();
        }
    });
});

// Remove this code that was outside the DOMContentLoaded handler
// window.addEventListener('resize', function() {
//     // Update mobile status
//     const newIsMobile = window.innerWidth <= 768;
//     if (newIsMobile !== isMobile) {
//         // Reload the page if mobile status changed
//         location.reload();
//     }
// });