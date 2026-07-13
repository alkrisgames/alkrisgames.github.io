/*
  Brick Space NEO - Retro LCD Brick Game Emulation (Tetris Mode)
  Features:
  - Custom HTML5 Canvas rendering engine simulating vintage brick-LCD matrices
  - Synthesized retro audio feedback via Web Audio API (no assets required)
  - Full game mechanics: rotations, line clears, scores, speed leveling
*/

class RetroBrickGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // Dynamically scale logical canvas bounds to physical client layout bounds
        // This removes black margins on the sides and upsizes the board to fit completely!
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width || 240;
        this.canvas.height = rect.height || 400;
        
        // LCD screen dimensions (10 x 20 logical brick grid)
        this.cols = 10;
        this.rows = 20;
        this.blockSizeX = this.canvas.width / this.cols;
        this.blockSizeY = this.canvas.height / this.rows;
        
        // Colors for retro LCD look (Purple Synthwave theme)
        this.colorBg = '#070312';      // Screen dark bg
        this.colorGrid = '#1c0d3d';    // Very dim unlit pixel borders
        this.colorPixelOff = 'rgba(28, 13, 61, 0.25)'; // Semi-translucent unlit pixel core so comets show behind!
        this.colorPixelOn = '#a58fff';  // Glowing LCD active pixel color
        this.colorGhost = 'rgba(165, 143, 255, 0.2)'; // Dimmer glowing ghost block
        
        // Game state variables
        this.grid = [];
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.isGameActive = false;
        this.isPaused = false;
        this.isMuted = false;
        this.gameInterval = null;
        this.baseSpeed = 800; // ms
        
        // Active Tetromino variables
        this.activePiece = null;
        this.activeX = 0;
        this.activeY = 0;
        this.holdPiece = null;
        this.hasHeldThisTurn = false;
        
        // Web Audio API context for sound effects
        this.audioCtx = null;
        
        // Tetromino shapes (with specific color IDs)
        this.shapes = {
            'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
            'O': [[2,2], [2,2]],
            'T': [[0,3,0], [3,3,3], [0,0,0]],
            'S': [[0,4,4], [4,4,0], [0,0,0]],
            'Z': [[5,5,0], [0,5,5], [0,0,0]],
            'J': [[6,0,0], [6,6,6], [0,0,0]],
            'L': [[0,0,7], [7,7,7], [0,0,0]]
        };

        // Sphere radial gradient colors: main, light shine, and dark shadow
        this.sphereColors = {
            1: { main: '#00f3ff', light: '#80f9ff', dark: '#007b80' }, // Cyan
            2: { main: '#ffeb3b', light: '#fff79a', dark: '#b3a100' }, // Yellow
            3: { main: '#d946ef', light: '#f5d0fe', dark: '#86198f' }, // Purple/Magenta
            4: { main: '#39ff14', light: '#b3ff99', dark: '#1db300' }, // Green
            5: { main: '#ff007f', light: '#ff99cb', dark: '#99004c' }, // Pink
            6: { main: '#3b82f6', light: '#bfdbfe', dark: '#1d4ed8' }, // Blue
            7: { main: '#f97316', light: '#fed7aa', dark: '#c2410c' }  // Orange
        };
        
        this.initGrid();
        
        // Initialize background stars and comets
        this.backgroundOrbs = [];
        this.initBackgroundOrbs();
        
        this.drawEmptyGrid();
        
        // Register global handle
        window.retroGameInstance = this;
        
        // Start animation frame render loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }
    
    // Lazy initialize AudioContext on user interaction
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    // Audio synthesizer for retro beeps
    playBeep(type) {
        if (this.isMuted) return;
        this.initAudio();
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        const now = this.audioCtx.currentTime;
        
        if (type === 'rotate') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.05); // G5
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } 
        else if (type === 'move') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(261.63, now); // C4
            gainNode.gain.setValueAtTime(0.05, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.03);
        } 
        else if (type === 'drop') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(147.01, now); // D3
            osc.frequency.linearRampToValueAtTime(73.42, now + 0.08); // D2
            gainNode.gain.setValueAtTime(0.08, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        }
        else if (type === 'clear') {
            // Arpeggio sound
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
            osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
            osc.frequency.setValueAtTime(1046.50, now + 0.18); // C6
            gainNode.gain.setValueAtTime(0.06, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
        else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220.00, now); // A3
            osc.frequency.exponentialRampToValueAtTime(55.00, now + 0.6); // G1
            gainNode.gain.setValueAtTime(0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
        }
    }
    
    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = new Array(this.cols).fill(0);
        }
    }
    
    start() {
        if (this.isGameActive) return;
        this.initAudio();
        this.isGameActive = true;
        this.isPaused = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.holdPiece = null;
        this.hasHeldThisTurn = false;
        this.initGrid();
        this.spawnPiece();
        this.updateHUD();
        this.startLoop();
    }
    
    reset() {
        this.isGameActive = false;
        this.isPaused = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.holdPiece = null;
        this.hasHeldThisTurn = false;
        if (this.gameInterval) clearInterval(this.gameInterval);
        this.initGrid();
        this.updateHUD();
        this.draw();
        
        // Hide overlays
        document.getElementById('screen-overlay-gameover').classList.remove('active');
        document.getElementById('screen-overlay-start').classList.add('active');
    }
    
    startLoop() {
        if (this.gameInterval) clearInterval(this.gameInterval);
        const speed = Math.max(80, this.baseSpeed - (this.level - 1) * 80);
        this.gameInterval = setInterval(() => {
            if (!this.isPaused) {
                this.tick();
            }
        }, speed);
    }
    
    tick() {
        if (!this.moveDown()) {
            this.lockPiece();
        }
    }
    
    spawnPiece() {
        const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        this.activePiece = {
            type: randomType,
            matrix: JSON.parse(JSON.stringify(this.shapes[randomType]))
        };
        
        // Center position
        this.activeX = Math.floor((this.cols - this.activePiece.matrix[0].length) / 2);
        this.activeY = 0;
        
        // Game Over condition: immediate collision on spawn
        if (this.checkCollision(this.activeX, this.activeY, this.activePiece.matrix)) {
            this.gameOver();
        }
        
        this.hasHeldThisTurn = false;
        this.draw();
    }
    
    checkCollision(xOffset, yOffset, matrix) {
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    const nextX = xOffset + c;
                    const nextY = yOffset + r;
                    
                    // Out of grid bounds
                    if (nextX < 0 || nextX >= this.cols || nextY >= this.rows) {
                        return true;
                    }
                    
                    // Collision with static blocks
                    if (nextY >= 0 && this.grid[nextY][nextX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    moveLeft() {
        if (!this.isGameActive || this.isPaused) return;
        if (!this.checkCollision(this.activeX - 1, this.activeY, this.activePiece.matrix)) {
            this.activeX--;
            this.playBeep('move');
            this.draw();
            return true;
        }
        return false;
    }
    
    moveRight() {
        if (!this.isGameActive || this.isPaused) return;
        if (!this.checkCollision(this.activeX + 1, this.activeY, this.activePiece.matrix)) {
            this.activeX++;
            this.playBeep('move');
            this.draw();
            return true;
        }
        return false;
    }
    
    moveDown() {
        if (!this.isGameActive || this.isPaused) return false;
        if (!this.checkCollision(this.activeX, this.activeY + 1, this.activePiece.matrix)) {
            this.activeY++;
            this.draw();
            return true;
        }
        return false;
    }
    
    softDrop() {
        if (!this.isGameActive || this.isPaused) return;
        if (this.moveDown()) {
            this.score += 1;
            this.updateHUD();
        }
    }
    
    hardDrop() {
        if (!this.isGameActive || this.isPaused) return;
        let dropDistance = 0;
        while (!this.checkCollision(this.activeX, this.activeY + 1, this.activePiece.matrix)) {
            this.activeY++;
            dropDistance++;
        }
        this.score += dropDistance * 2;
        this.playBeep('drop');
        this.lockPiece();
    }
    
    rotate() {
        if (!this.isGameActive || this.isPaused) return;
        
        const matrix = this.activePiece.matrix;
        const N = matrix.length;
        
        // Transpose and reverse rows (clockwise rotation)
        const rotated = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                rotated[c][N - 1 - r] = matrix[r][c];
            }
        }
        
        // Wall kick attempt (test rotation, if fails, nudge left or right slightly)
        const kicks = [0, -1, 1, -2, 2];
        for (let i = 0; i < kicks.length; i++) {
            const dx = kicks[i];
            if (!this.checkCollision(this.activeX + dx, this.activeY, rotated)) {
                this.activePiece.matrix = rotated;
                this.activeX += dx;
                this.playBeep('rotate');
                this.draw();
                break;
            }
        }
    }
    
    hold() {
        if (!this.isGameActive || this.isPaused || this.hasHeldThisTurn) return;
        
        this.playBeep('rotate');
        const temp = this.holdPiece;
        this.holdPiece = this.activePiece.type;
        
        if (temp === null) {
            // Spawn next piece
            this.spawnPiece();
        } else {
            // Use held piece
            this.activePiece = {
                type: temp,
                matrix: JSON.parse(JSON.stringify(this.shapes[temp]))
            };
            this.activeX = Math.floor((this.cols - this.activePiece.matrix[0].length) / 2);
            this.activeY = 0;
        }
        
        this.hasHeldThisTurn = true;
        this.draw();
    }
    
    lockPiece() {
        const matrix = this.activePiece.matrix;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c] !== 0) {
                    const gridY = this.activeY + r;
                    const gridX = this.activeX + c;
                    
                    if (gridY >= 0) {
                        this.grid[gridY][gridX] = matrix[r][c]; // Locked pixel with its color ID
                    }
                }
            }
        }
        
        this.clearLines();
        this.spawnPiece();
    }
    
    clearLines() {
        let cleared = 0;
        
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.grid[r].every(val => val !== 0)) {
                this.grid.splice(r, 1);
                this.grid.unshift(new Array(this.cols).fill(0));
                cleared++;
                r++; // Re-check the same row index which now contains the row above
            }
        }
        
        if (cleared > 0) {
            this.lines += cleared;
            
            // Retro scoring model
            const lineRewards = [0, 100, 300, 500, 800];
            this.score += lineRewards[cleared] * this.level;
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel !== this.level) {
                this.level = newLevel;
                this.startLoop();
            }
            
            this.playBeep('clear');
            this.updateHUD();
        }
    }
    
    gameOver() {
        this.isGameActive = false;
        if (this.gameInterval) clearInterval(this.gameInterval);
        this.playBeep('gameover');
        
        // Show game over overlay
        const goOverlay = document.getElementById('screen-overlay-gameover');
        const finalScoreText = document.getElementById('gameover-final-score');
        if (goOverlay && finalScoreText) {
            finalScoreText.textContent = `FINAL SCORE: ${this.padNumber(this.score, 6)}`;
            goOverlay.classList.add('active');
        }
    }
    
    togglePause() {
        if (!this.isGameActive) return false;
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
    
    padNumber(num, size) {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }
    
    updateHUD() {
        const scoreHUD = document.getElementById('screen-score');
        const linesHUD = document.getElementById('screen-lines');
        if (scoreHUD) scoreHUD.textContent = `SCORE: ${this.padNumber(this.score, 6)}`;
        if (linesHUD) linesHUD.textContent = `LINES: ${this.padNumber(this.lines, 2)}`;
    }
    
    // Background space particles logic
    initBackgroundOrbs() {
        this.backgroundOrbs = [];
        // Spawn 20 stars
        for (let i = 0; i < 20; i++) {
            this.backgroundOrbs.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: 0.1 + Math.random() * 0.2,
                size: 1 + Math.random() * 1.5,
                type: 'star',
                color: Math.random() > 0.5 ? '#a58fff' : '#ffffff',
                opacity: 0.3 + Math.random() * 0.4
            });
        }
        // Spawn 5 comets
        for (let i = 0; i < 5; i++) {
            this.backgroundOrbs.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - 100, // Start above screen
                speed: 1.2 + Math.random() * 1.5,
                size: 2 + Math.random() * 1.5,
                type: 'comet',
                color: '#bef4ff', // Cyan-white head
                opacity: 0.88 // 88% transparency as requested!
            });
        }
    }

    updateBackgroundOrbs() {
        for (let i = 0; i < this.backgroundOrbs.length; i++) {
            const orb = this.backgroundOrbs[i];
            if (orb.type === 'star') {
                orb.y += orb.speed;
                if (orb.y > this.canvas.height) {
                    orb.y = 0;
                    orb.x = Math.random() * this.canvas.width;
                }
            } else { // comet
                // Fall diagonally (leftwards and downwards)
                orb.y += orb.speed;
                orb.x -= orb.speed * 0.7;
                
                // Reset if off bottom or left side
                if (orb.y > this.canvas.height || orb.x < -50) {
                    orb.y = -50 - Math.random() * 50;
                    orb.x = Math.random() * (this.canvas.width + 100);
                    orb.speed = 1.2 + Math.random() * 1.5;
                }
            }
        }
    }

    animate() {
        this.updateBackgroundOrbs();
        this.draw();
        requestAnimationFrame(this.animate);
    }

    // Draw functions - Draws cells as beautiful 3D spheres
    drawBlock(x, y, val, isGhost = false) {
        const pxX = x * this.blockSizeX;
        const pxY = y * this.blockSizeY;
        
        const centerX = pxX + this.blockSizeX / 2;
        const centerY = pxY + this.blockSizeY / 2;
        const radius = Math.min(this.blockSizeX, this.blockSizeY) / 2 - 1.5;
        
        // Default to LCD green if color index is missing
        const colorSet = this.sphereColors[val] || { main: '#8ca895', light: '#b8c7be', dark: '#506659' };
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        if (isGhost) {
            // Draw ghost piece outline
            this.ctx.fillStyle = 'rgba(43, 68, 51, 0.15)';
            this.ctx.fill();
            this.ctx.strokeStyle = colorSet.main;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
        } else {
            // High-contrast, shiny glass radial gradient sphere drawing
            const highlightX = centerX - radius * 0.32;
            const highlightY = centerY - radius * 0.32;
            
            const gradient = this.ctx.createRadialGradient(
                highlightX, highlightY, radius * 0.05,
                centerX, centerY, radius
            );
            
            gradient.addColorStop(0, '#ffffff');       // Glossy white highlight highlight peak
            gradient.addColorStop(0.18, '#ffffff');    // Strong reflection edge
            gradient.addColorStop(0.4, colorSet.light); // Light neon core color
            gradient.addColorStop(0.85, colorSet.main); // Saturated neon body
            gradient.addColorStop(1, colorSet.dark);    // Dark 3D bottom shading edge
            
            // 1. Draw glowing neon backdrop shadow first to avoid clipping the sphere itself
            this.ctx.save();
            this.ctx.shadowBlur = 12; // Intense neon glow shadow
            this.ctx.shadowColor = colorSet.main;
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            this.ctx.restore();
            
            // 2. Draw glossy overlay on top
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    }
    
    drawEmptyGrid() {
        // 1. Draw screen background color
        this.ctx.fillStyle = this.colorBg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 2. Draw background stars/comets
        for (let i = 0; i < this.backgroundOrbs.length; i++) {
            const orb = this.backgroundOrbs[i];
            this.ctx.save();
            
            if (orb.type === 'star') {
                this.ctx.globalAlpha = orb.opacity;
                this.ctx.fillStyle = orb.color;
                this.ctx.beginPath();
                this.ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else { // comet
                // Drawing a diagonal comet tail and head with 88% transparency
                this.ctx.globalAlpha = orb.opacity;
                
                const tailLength = orb.speed * 15;
                const endX = orb.x + tailLength * 0.58; // Opposing angle of -40 deg
                const endY = orb.y - tailLength * 0.8;
                
                // Linear gradient tail
                const grad = this.ctx.createLinearGradient(orb.x, orb.y, endX, endY);
                grad.addColorStop(0, orb.color);
                grad.addColorStop(1, 'rgba(190, 244, 255, 0.0)');
                
                this.ctx.strokeStyle = grad;
                this.ctx.lineWidth = orb.size;
                this.ctx.beginPath();
                this.ctx.moveTo(orb.x, orb.y);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
                
                // Comet core head
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(orb.x, orb.y, orb.size * 0.75, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }
        
        // 3. Draw unlit grid pixel spots as faint circles
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const centerX = c * this.blockSizeX + this.blockSizeX / 2;
                const centerY = r * this.blockSizeY + this.blockSizeY / 2;
                const radius = Math.min(this.blockSizeX, this.blockSizeY) / 2 - 1.5;
                
                // Soft unlit circle placeholder
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
                
                this.ctx.fillStyle = 'rgba(28, 13, 61, 0.15)'; 
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(165, 143, 255, 0.08)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
    }
    
    drawGhostPiece() {
        if (!this.activePiece) return;
        
        let ghostY = this.activeY;
        while (!this.checkCollision(this.activeX, ghostY + 1, this.activePiece.matrix)) {
            ghostY++;
        }
        
        // Draw ghost piece if it is below active position
        if (ghostY > this.activeY) {
            const matrix = this.activePiece.matrix;
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c] !== 0) {
                        const drawY = ghostY + r;
                        if (drawY >= 0) {
                            this.drawBlock(this.activeX + c, drawY, matrix[r][c], true);
                        }
                    }
                }
            }
        }
    }
    
    draw() {
        // Redraw unlit board background
        this.drawEmptyGrid();
        
        // Draw locked grid cells
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== 0) {
                    this.drawBlock(c, r, this.grid[r][c]);
                }
            }
        }
        
        // Draw falling active piece
        if (this.activePiece) {
            // First draw projection/ghost helper
            this.drawGhostPiece();
            
            const matrix = this.activePiece.matrix;
            for (let r = 0; r < matrix.length; r++) {
                for (let c = 0; c < matrix[r].length; c++) {
                    if (matrix[r][c] !== 0) {
                        const drawY = this.activeY + r;
                        if (drawY >= 0) {
                            this.drawBlock(this.activeX + c, drawY, matrix[r][c]);
                        }
                    }
                }
            }
        }
    }
    
    // Core input router sent by application controls
    handleInput(code, state = 'keydown') {
        if (!this.isGameActive || this.isPaused) return;
        
        if (state === 'keydown') {
            switch(code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.hardDrop(); // Down - drops instantly
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'KeyX':
                    this.rotate(); // Up - rotates
                    break;
                case 'KeyC':
                case 'ShiftLeft':
                    this.hold(); // Shift/C - hold piece
                    break;
                case 'Space':
                    this.hardDrop();
                    break;
            }
        } else if (state === 'keyup') {
            // Can be used for speed throttles on soft drops if needed
        }
    }
}

// Instantiate retro game logic once loaded
document.addEventListener('DOMContentLoaded', () => {
    new RetroBrickGame();
});
