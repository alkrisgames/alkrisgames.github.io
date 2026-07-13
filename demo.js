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
        
        // LCD screen dimensions (10 x 20 logical brick grid)
        this.cols = 10;
        this.rows = 20;
        this.blockSizeX = this.canvas.width / this.cols; // 240 / 10 = 24
        this.blockSizeY = this.canvas.height / this.rows; // 400 / 20 = 20
        
        // Colors for retro LCD look
        this.colorBg = '#0a140d';      // Screen dark bg
        this.colorGrid = '#122417';    // Very dim unlit pixel borders
        this.colorPixelOff = '#112215'; // Unlit pixel core
        this.colorPixelOn = '#8ca895';  // Glowing LCD active pixel color
        this.colorGhost = '#2b4433';    // Dimmer glowing ghost block
        
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
        
        // Tetromino shapes
        this.shapes = {
            'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
            'O': [[1,1], [1,1]],
            'T': [[0,1,0], [1,1,1], [0,0,0]],
            'S': [[0,1,1], [1,1,0], [0,0,0]],
            'Z': [[1,1,0], [0,1,1], [0,0,0]],
            'J': [[1,0,0], [1,1,1], [0,0,0]],
            'L': [[0,0,1], [1,1,1], [0,0,0]]
        };
        
        this.initGrid();
        this.drawEmptyGrid();
        
        // Register global handle
        window.retroGameInstance = this;
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
                        this.grid[gridY][gridX] = 1; // Locked pixel
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
    
    // Draw functions
    drawBlock(x, y, isGhost = false) {
        const pxX = x * this.blockSizeX;
        const pxY = y * this.blockSizeY;
        
        // Outer box border
        this.ctx.fillStyle = isGhost ? this.colorGhost : this.colorPixelOn;
        this.ctx.fillRect(pxX, pxY, this.blockSizeX, this.blockSizeY);
        
        // Inner spacing (LCD grid lines separation)
        this.ctx.fillStyle = this.colorBg;
        this.ctx.fillRect(pxX + 2, pxY + 2, this.blockSizeX - 4, this.blockSizeY - 4);
        
        // Inner pixel dot (Classic Gameboy style brick design)
        this.ctx.fillStyle = isGhost ? this.colorGhost : this.colorPixelOn;
        this.ctx.fillRect(pxX + 4, pxY + 4, this.blockSizeX - 8, this.blockSizeY - 8);
    }
    
    drawEmptyGrid() {
        this.ctx.fillStyle = this.colorBg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const pxX = c * this.blockSizeX;
                const pxY = r * this.blockSizeY;
                
                // Draw unlit grid pixel spots
                this.ctx.strokeStyle = this.colorGrid;
                this.ctx.strokeRect(pxX, pxY, this.blockSizeX, this.blockSizeY);
                
                this.ctx.fillStyle = this.colorPixelOff;
                this.ctx.fillRect(pxX + 2, pxY + 2, this.blockSizeX - 4, this.blockSizeY - 4);
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
                            this.drawBlock(this.activeX + c, drawY, true);
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
                    this.drawBlock(c, r);
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
                            this.drawBlock(this.activeX + c, drawY);
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
                    this.softDrop();
                    break;
                case 'ArrowUp':
                case 'KeyW':
                    this.hold(); // Use Up to hold piece in console D-Pad
                    break;
                case 'KeyX':
                    this.rotate();
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
