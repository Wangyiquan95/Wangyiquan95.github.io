// CUBB Tournament - Enhanced Gaming Experience

// Player data based on the table provided
const players = {
    ssr: [
        { name: "Liwei", rarity: "SSR", image: "images/players/liwei.jpg" },
        { name: "Lao Zhang", rarity: "SSR", image: "images/players/lao_zhang.jpg" },
        { name: "Ziyang Gong", rarity: "SSR", image: "images/players/ziyang_gong.jpg" },
        { name: "Mingwei", rarity: "SSR", image: "images/players/mingwei.jpg" }
    ],
    sr: [
        { name: "HOOK", rarity: "SR", image: "images/players/hook.jpg" },
        { name: "Huiyu", rarity: "SR", image: "images/players/huiyu.jpg" },
        { name: "Yiquan", rarity: "SR", image: "images/players/yiquan.jpg" },
        { name: "Sangrui", rarity: "SR", image: "images/players/sangrui.jpg" },
        { name: "Ziyang Chen", rarity: "SR", image: "images/players/ziyang_chen.jpg" },
        { name: "Jiamu", rarity: "SR", image: "images/players/jiamu.jpg" },
        { name: "Nuoyan", rarity: "SR", image: "images/players/nuoyan.jpg" },
        { name: "Lily", rarity: "SR", image: "images/players/lily.jpg" },
        { name: "Daniel", rarity: "SR", image: "images/players/daniel.jpg" },
        { name: "Menger", rarity: "SR", image: "images/players/menger.jpg" },
        { name: "Zhoulyu", rarity: "SR", image: "images/players/zhoulyu.jpg" },
        { name: "sky", rarity: "SR", image: "images/players/sky.jpg" }
    ],
    r: [
        { name: "yipei", rarity: "R", image: "images/players/yipei.jpg" },
        { name: "ximin", rarity: "R", image: "images/players/ximin.jpg" },
        { name: "yaya", rarity: "R", image: "images/players/yaya.jpg" },
        { name: "yanqing", rarity: "R", image: "images/players/yanqing.jpg" },
        { name: "Zoe", rarity: "R", image: "images/players/zoe.jpg" },
        { name: "Abrory", rarity: "R", image: "images/players/abrory.jpg" },
        { name: "Kangdi", rarity: "R", image: "images/players/kangdi.jpg" },
        { name: "Siyuan", rarity: "R", image: "images/players/siyuan.jpg" }
    ]
};

let currentDraw = [];
let selectedPlayers = [];
let isDrawn = false;
let hasRevealed = false; // ensure only one card is revealed per draw (click OR drag)
let particleSystem = null;

// Build a unique pool of all players and track remaining players (no duplicates)
const originalPool = [...players.ssr, ...players.sr, ...players.r];
let remainingPool = [...originalPool];

// Teams setup (exclude captains from pool)
const teams = [
    { id: 0, name: 'Team Sangrui', captain: 'Sangrui', members: [], hasSSR: false },
    { id: 1, name: 'Team HOOK', captain: 'HOOK', members: [], hasSSR: false },
    { id: 2, name: 'Team Yiquan', captain: 'Yiquan', members: [], hasSSR: false },
    { id: 3, name: 'Team Huiyu', captain: 'Huiyu', members: [], hasSSR: false }
];

// Remove captains from remaining pool if present
remainingPool = remainingPool.filter(p => !teams.some(t => t.captain === p.name));

let activeTeamIndex = 0; // whose turn to draw
let teamOrder = [0, 1, 2, 3]; // current team order
let roundNumber = 1; // current round (1-3 for SSR guarantee)

// Particle System Class
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticle(x, y, color = '#00ffff') {
        return {
            x: x || Math.random() * this.canvas.width,
            y: y || Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1,
            decay: Math.random() * 0.02 + 0.01,
            size: Math.random() * 3 + 1,
            color: color
        };
    }
    
    addBurst(x, y, count = 20, color = '#00ffff') {
        for (let i = 0; i < count; i++) {
            const particle = this.createParticle(x, y, color);
            particle.vx = (Math.random() - 0.5) * 8;
            particle.vy = (Math.random() - 0.5) * 8;
            particle.size = Math.random() * 5 + 2;
            this.particles.push(particle);
        }
    }
    
    update() {
        // Add ambient particles
        if (Math.random() < 0.1) {
            this.particles.push(this.createParticle());
        }
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.vy += 0.05; // gravity
            
            return particle.life > 0;
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    animate() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}

// Sound Effects
function playSound(soundId) {
    const audio = document.getElementById(soundId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {}); // Ignore autoplay restrictions
    }
}

// Enhanced card creation with animations
function createCard(player, index) {
    return `
        <div class="card ${player.rarity.toLowerCase()}" id="card-${index}" draggable="true" ondragstart="onDragStart(event, ${index})" onclick="onCardClick(${index})" data-rarity="${player.rarity}">
            <div class="card-face card-back">
                <div class="card-back-content">
                    <i class="fas fa-question"></i>
                    <p>Click to Reveal</p>
                </div>
            </div>
            <div class="card-face card-front ${player.rarity.toLowerCase()}">
                <img src="${player.image}" alt="${player.name}" class="card-image" onerror="this.src='images/favicon/android-chrome-192x192.png'">
                <div class="card-name">${player.name}</div>
                <div class="card-rarity ${player.rarity.toLowerCase()}">${player.rarity}</div>
            </div>
        </div>
    `;
}

// Enhanced random player selection with rarity weights
function getRandomPlayers() {
    // Draw unique players from the remaining pool (no duplicates)
    if (remainingPool.length === 0) return [];
    
    let availablePool = [...remainingPool];
    const currentTeam = teams[teamOrder[activeTeamIndex]];
    
    // SSR Guarantee Logic: First 3 rounds, ensure each team gets at least one SSR
    if (roundNumber <= 3) {
        const teamsWithoutSSR = teams.filter(team => !team.hasSSR);
        const remainingSSRPlayers = remainingPool.filter(player => player.rarity === 'SSR');
        
        // If current team doesn't have SSR and there are SSR players left, prioritize SSR
        if (!currentTeam.hasSSR && remainingSSRPlayers.length > 0) {
            // Force at least one SSR in the draw for teams without SSR
            const ssrPlayer = remainingSSRPlayers[Math.floor(Math.random() * remainingSSRPlayers.length)];
            const otherPlayers = remainingPool.filter(p => p.name !== ssrPlayer.name);
            
            // Shuffle other players and take 3 more
            const shuffledOthers = [...otherPlayers].sort(() => Math.random() - 0.5);
            const otherThree = shuffledOthers.slice(0, 3);
            
            // Show notification about SSR guarantee
            setTimeout(() => {
                showNotification(`SSR Guarantee: ${currentTeam.name} gets priority for legendary players!`, 'ssr');
            }, 500);
            
            return [ssrPlayer, ...otherThree];
        }
        // If team already has SSR, filter out SSR players (enforce one SSR per team rule)
        else if (currentTeam.hasSSR) {
            availablePool = remainingPool.filter(player => player.rarity !== 'SSR');
        }
        // If no SSR players left but team doesn't have SSR, use normal pool
        else if (!currentTeam.hasSSR && remainingSSRPlayers.length === 0) {
            // No SSR players left, use normal pool
            availablePool = [...remainingPool];
        }
    }
    // After round 3, normal logic applies
    else {
        // Filter out SSR players if current team already has one
        if (currentTeam.hasSSR) {
            availablePool = remainingPool.filter(player => player.rarity !== 'SSR');
        }
    }
    
    // If no players available after filtering, use original pool
    if (availablePool.length === 0) {
        availablePool = [...remainingPool];
    }
    
    const poolCopy = [...availablePool];
    // Shuffle pool copy
    for (let i = poolCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
    }
    const take = Math.min(4, poolCopy.length);
    return poolCopy.slice(0, take);
}

function removePlayerFromPool(player) {
    const idx = remainingPool.findIndex(p => p.name === player.name);
    if (idx !== -1) remainingPool.splice(idx, 1);
}

// Enhanced draw cards function
function drawCards() {
    if (isDrawn) return;
    
    // Create particle burst at button
    const button = document.getElementById('drawButton');
    const rect = button.getBoundingClientRect();
    if (particleSystem) {
        particleSystem.addBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 30, '#ff6b6b');
    }
    
    // Play sound effect
    playSound('cardDrawSound');
    
    currentDraw = getRandomPlayers();
    const container = document.getElementById('cardsContainer');
    
    // Clear container with fade out
    container.style.opacity = '0';
    
    setTimeout(() => {
        container.innerHTML = '';
        currentDraw.forEach((player, index) => {
            container.innerHTML += createCard(player, index);
        });
        
        // Animate cards appearing
        const cards = container.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(50px) rotateY(-90deg)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0) rotateY(0deg)';
            }, index * 200);
        });
        
        container.style.opacity = '1';
    }, 300);
    
    // Update button state
    const drawButton = document.getElementById('drawButton');
    drawButton.disabled = true;
    drawButton.innerHTML = `<i class="fas fa-hand-pointer"></i><span>${teams[teamOrder[activeTeamIndex]].name} PICK</span>`;
    isDrawn = true;
    hasRevealed = false;
}

// Enhanced card selection
function selectCard(cardIndex) {
    if (!isDrawn) return;
    const selectedPlayer = currentDraw[cardIndex];
    const card = document.getElementById(`card-${cardIndex}`);
    const rect = card.getBoundingClientRect();
    
    // Create particle burst based on rarity
    let particleColor = '#cd7f32'; // R
    let particleCount = 15;
    
    if (selectedPlayer.rarity === 'SR') {
        particleColor = '#c0c0c0';
        particleCount = 25;
    } else if (selectedPlayer.rarity === 'SSR') {
        particleColor = '#ffd700';
        particleCount = 40;
    }
    
    if (particleSystem) {
        particleSystem.addBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, particleCount, particleColor);
    }
    
    // Play sound effect
    playSound('cardFlipSound');
    
    // Flip ALL cards to reveal, and highlight the selected one
    const allCards = document.querySelectorAll('.card');
    allCards.forEach((c, idx) => {
        // flip every card face-up
        c.classList.add('flipped');
        c.style.transition = 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';

        if (idx === cardIndex) {
            // emphasize the chosen card
            c.style.transform = 'rotateY(180deg) scale(1.1)';
            c.style.zIndex = '10';
            c.style.boxShadow = `0 0 30px ${particleColor}`;
            c.style.opacity = '1';
        } else {
            // dim and slightly shrink others
            c.style.transform = 'rotateY(180deg) scale(0.9)';
            c.style.opacity = '0.5';
        }
    });
    
    // After reveal, enable drag-and-drop to any team panel
    setTimeout(() => {
        enableDropTargets(selectedPlayer);
    }, 700);

    // Add to selected team after animation if dropped (fallback auto-assign to active team after delay)
    setTimeout(() => {
        // If not assigned by drag within 1.4s, keep the state and wait for drop
    }, 1400);
}

// Enhanced team display
function updateSelectedTeam() {
    const teamsContainer = document.getElementById('teamsContainer');
    if (!teamsContainer) return;

    let html = '';
    teamOrder.forEach((teamIndex, displayOrder) => {
        const team = teams[teamIndex];
        const isActive = teamIndex === teamOrder[activeTeamIndex];
        const activeClass = isActive ? 'active' : '';
        html += `
            <div class="team-panel ${activeClass}" data-team="${teamIndex}" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDrop(event, ${teamIndex})">
                <div class="team-header">
                    <span class="captain-badge">Captain</span>
                    <span class="team-name">${team.name}</span>
                    <span class="team-order-badge">#${displayOrder + 1}</span>
                </div>
                <div class="team-slot-area">
                    ${team.members.map(m => `
                        <div class="selected-card ${m.rarity.toLowerCase()}">
                            <img src="${m.image}" class="card-image" onerror="this.src='images/favicon/android-chrome-192x192.png'">
                            <div class="card-name">${m.name}</div>
                            <div class="card-rarity ${m.rarity.toLowerCase()}">${m.rarity}</div>
                        </div>
                    `).join('')}
                    <div class="drop-target">Drop here</div>
                </div>
            </div>
        `;
    });

    teamsContainer.innerHTML = html;
}

// Update team display with animation only for new card
function updateSelectedTeamWithAnimation(teamIndex, newPlayer) {
    const teamsContainer = document.getElementById('teamsContainer');
    if (!teamsContainer) return;

    let html = '';
    teamOrder.forEach((teamIdx, displayOrder) => {
        const team = teams[teamIdx];
        const isActive = teamIdx === teamOrder[activeTeamIndex];
        const activeClass = isActive ? 'active' : '';
        html += `
            <div class="team-panel ${activeClass}" data-team="${teamIdx}" ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDrop(event, ${teamIdx})">
                <div class="team-header">
                    <span class="captain-badge">Captain</span>
                    <span class="team-name">${team.name}</span>
                    <span class="team-order-badge">#${displayOrder + 1}</span>
                </div>
                <div class="team-slot-area">
                    ${team.members.map(m => {
                        const isNewCard = (teamIdx === teamIndex && m.name === newPlayer.name);
                        const newCardClass = isNewCard ? 'new-card' : '';
                        return `
                            <div class="selected-card ${m.rarity.toLowerCase()} ${newCardClass}">
                                <img src="${m.image}" class="card-image" onerror="this.src='images/favicon/android-chrome-192x192.png'">
                                <div class="card-name">${m.name}</div>
                                <div class="card-rarity ${m.rarity.toLowerCase()}">${m.rarity}</div>
                            </div>
                        `;
                    }).join('')}
                    <div class="drop-target">Drop here</div>
                </div>
            </div>
        `;
    });

    teamsContainer.innerHTML = html;
    
    // Remove animation class after animation completes
    setTimeout(() => {
        const newCards = teamsContainer.querySelectorAll('.selected-card.new-card');
        newCards.forEach(card => {
            card.classList.remove('new-card');
        });
    }, 800);
}

// Update team counter in navigation
function updateTeamCounter() {
    const counter = document.getElementById('teamCount');
    counter.textContent = `Team: ${selectedPlayers.length}`;
}

// Update round counter in navigation
function updateRoundCounter() {
    const counter = document.getElementById('roundCount');
    counter.textContent = `Round: ${roundNumber}`;
}

// Enhanced reset function
function resetDraw() {
    currentDraw = [];
    isDrawn = false;
    
    const container = document.getElementById('cardsContainer');
    const cards = container.querySelectorAll('.card');
    
    // Animate cards disappearing
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateY(-50px) rotateY(90deg) scale(0.5)';
        }, index * 100);
    });
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 600);
    
    // Reset button
    const drawButton = document.getElementById('drawButton');
    drawButton.disabled = false;
    drawButton.innerHTML = '<i class="fas fa-magic"></i><span>SUMMON CARDS</span>';
}

// Show notification system
function showNotification(message, rarity = 'r') {
    const notification = document.createElement('div');
    notification.className = `notification ${rarity.toLowerCase()}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 2rem;
        background: linear-gradient(135deg, rgba(0, 255, 136, 0.9), rgba(0, 200, 100, 0.9));
        border: 2px solid #00ff88;
        border-radius: 25px;
        color: white;
        font-family: 'Orbitron', monospace;
        font-weight: 600;
        z-index: 10000;
        transform: translateX(400px);
        transition: all 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(0, 255, 136, 0.4);
    `;
    
    if (rarity === 'SSR') {
        notification.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 165, 0, 0.9))';
        notification.style.borderColor = '#ffd700';
        notification.style.boxShadow = '0 10px 30px rgba(255, 215, 0, 0.6)';
    } else if (rarity === 'SR') {
        notification.style.background = 'linear-gradient(135deg, rgba(192, 192, 192, 0.9), rgba(169, 169, 169, 0.9))';
        notification.style.borderColor = '#c0c0c0';
        notification.style.boxShadow = '0 10px 30px rgba(192, 192, 192, 0.4)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Reset all function
function resetAll() {
    resetDraw();
    selectedPlayers = [];
    remainingPool = [...originalPool];
    roundNumber = 1;
    activeTeamIndex = 0;
    
    // Reset all teams
    teams.forEach(team => {
        team.members = [];
        team.hasSSR = false;
    });
    
    updateSelectedTeam();
    updateTeamCounter();
    updateRoundCounter();
    
    if (particleSystem) {
        particleSystem.addBurst(window.innerWidth / 2, window.innerHeight / 2, 50, '#4ecdc4');
    }
    
    showNotification('Tournament reset! Ready for new adventure!', 'sr');
}

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    // Initialize particle system
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        particleSystem = new ParticleSystem(canvas);
        particleSystem.animate();
    }
    
    // Initialize UI
    updateSelectedTeam();
    updateTeamCounter();
    updateRoundCounter();
    
    // Add team order shortcuts
    addTeamOrderShortcuts();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!isDrawn) {
                drawCards();
            }
        } else if (e.key === 'r' || e.key === 'R') {
            resetDraw();
        } else if (e.key >= '1' && e.key <= '4' && isDrawn) {
            const cardIndex = parseInt(e.key) - 1;
            selectCard(cardIndex);
        }
    });
    
    // Add welcome particle burst
    setTimeout(() => {
        if (particleSystem) {
            particleSystem.addBurst(window.innerWidth / 2, 200, 30, '#ff6b6b');
        }
    }, 1000);
    
    console.log('🎮 CUBB Tournament initialized! Press SPACE to draw cards, R to reset, or 1-4 to select cards.');
});

// Drag and Drop Handlers
function onDragStart(evt, cardIndex) {
    // Ensure reveal once
    if (isDrawn && !hasRevealed) {
        hasRevealed = true;
        selectCard(cardIndex);
    }
    evt.dataTransfer.setData('text/plain', String(cardIndex));
}

function onDragOver(evt) {
    evt.preventDefault();
    const target = evt.currentTarget.querySelector('.drop-target');
    if (target) target.classList.add('over');
}

function onDragLeave(evt) {
    const target = evt.currentTarget.querySelector('.drop-target');
    if (target) target.classList.remove('over');
}

function onDrop(evt, teamIndex) {
    evt.preventDefault();
    const idxStr = evt.dataTransfer.getData('text/plain');
    if (!idxStr) return;
    const cardIndex = parseInt(idxStr);
    const player = currentDraw[cardIndex];
    if (!player) return;

    // Enforce SSR-per-team limit
    const team = teams[teamIndex];
    if (player.rarity === 'SSR' && team.hasSSR) {
        showNotification(`${team.name} already has an SSR!`, 'SR');
        return;
    }

    // Assign to team
    team.members.push(player);
    if (player.rarity === 'SSR') team.hasSSR = true;
    selectedPlayers.push(player);
    removePlayerFromPool(player);
    
    // Update team display with animation for new card only
    updateSelectedTeamWithAnimation(teamIndex, player);
    updateTeamCounter();

    // Advance to next team turn
    activeTeamIndex = (activeTeamIndex + 1) % teams.length;
    
    // Check if we've completed a full round (all teams have drawn)
    if (activeTeamIndex === 0) {
        roundNumber++;
        showNotification(`Round ${roundNumber} started!`, 'sr');
    }
    
    updateSelectedTeam();

    // Clear current draw and UI
    resetDraw();
}

function onCardClick(cardIndex) {
    if (!isDrawn || hasRevealed) return;
    hasRevealed = true;
    selectCard(cardIndex);
}

// Quick Team Order Change Functions
function setTeamOrder(order) {
    if (order.length !== 4) return;
    teamOrder = [...order];
    updateSelectedTeam();
    showNotification(`Team order changed!`, 'sr');
}

// Preset team orders
function setDefaultOrder() {
    setTeamOrder([0, 1, 2, 3]); // Sangrui, HOOK, Yiquan, Huiyu
}

function setReverseOrder() {
    setTeamOrder([3, 2, 1, 0]); // Huiyu, Yiquan, HOOK, Sangrui
}

function setRandomOrder() {
    const shuffled = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    setTeamOrder(shuffled);
}

function setCustomOrder() {
    const input = prompt('Enter team order (0,1,2,3):\n0=Sangrui, 1=HOOK, 2=Yiquan, 3=Huiyu\nExample: 2,0,3,1', teamOrder.join(','));
    if (input) {
        const order = input.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x) && x >= 0 && x <= 3);
        if (order.length === 4) {
            setTeamOrder(order);
        } else {
            showNotification('Invalid order! Use format: 0,1,2,3', 'r');
        }
    }
}

// Keyboard shortcuts for team order
function addTeamOrderShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1': e.preventDefault(); setDefaultOrder(); break;
                case '2': e.preventDefault(); setReverseOrder(); break;
                case '3': e.preventDefault(); setRandomOrder(); break;
                case '4': e.preventDefault(); setCustomOrder(); break;
            }
        }
    });
}