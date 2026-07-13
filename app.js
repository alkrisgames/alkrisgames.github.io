/*
  Brick Space NEO - Main Application Logic
  - Starfield background particle effect
  - Navigation handlers
  - UI control hooks for emulator
*/

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (mobileMenuToggle && nav) {
        mobileMenuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (nav.classList.contains('active')) {
                icon.className = 'fas fa-times';
            } else {
                icon.className = 'fas fa-bars';
            }
        });
        
        // Close menu when link is clicked
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            });
        });
    }

    // 2. Starfield Particle Effect (Outward flight warp)
    const starfieldCanvas = document.getElementById('starfield');
    if (starfieldCanvas) {
        const ctx = starfieldCanvas.getContext('2d');
        let stars = [];
        const numStars = 150;
        let centerX, centerY;
        let animationFrameId;

        function resizeCanvas() {
            starfieldCanvas.width = window.innerWidth;
            starfieldCanvas.height = window.innerHeight;
            centerX = starfieldCanvas.width / 2;
            centerY = starfieldCanvas.height / 2;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Initialize stars
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * starfieldCanvas.width - centerX,
                y: Math.random() * starfieldCanvas.height - centerY,
                z: Math.random() * starfieldCanvas.width,
                color: Math.random() > 0.5 ? '#ff007f' : '#00f3ff'
            });
        }

        function drawStars() {
            ctx.fillStyle = '#080511';
            ctx.fillRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);

            // Draw a subtle horizontal glow in the center for synthwave sunset look
            const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, starfieldCanvas.width / 2);
            gradient.addColorStop(0, 'rgba(157, 78, 221, 0.08)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);

            for (let i = 0; i < numStars; i++) {
                const star = stars[i];
                star.z -= 1.5; // speed of warp

                if (star.z <= 0) {
                    star.z = starfieldCanvas.width;
                    star.x = Math.random() * starfieldCanvas.width - centerX;
                    star.y = Math.random() * starfieldCanvas.height - centerY;
                }

                // Project 3D coordinates onto 2D screen
                const px = (star.x / star.z) * 400 + centerX;
                const py = (star.y / star.z) * 400 + centerY;

                if (px < 0 || px > starfieldCanvas.width || py < 0 || py > starfieldCanvas.height) {
                    continue; // Out of bounds
                }

                // Size depends on depth (closer stars are larger)
                const size = (1 - star.z / starfieldCanvas.width) * 3;
                
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fillStyle = star.color;
                // Add a subtle glowing effect to closer stars
                if (size > 1.5) {
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = star.color;
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.fill();
            }
            ctx.shadowBlur = 0; // reset
            animationFrameId = requestAnimationFrame(drawStars);
        }

        drawStars();
    }

    // 3. UI Controls Hook for the Handheld Console
    // The emulator instances will define global handles `window.retroGameInstance`
    const btnLeft = document.getElementById('ctrl-left');
    const btnRight = document.getElementById('ctrl-right');
    const btnDown = document.getElementById('ctrl-down');
    const btnUp = document.getElementById('ctrl-up');
    const btnRotate = document.getElementById('ctrl-rotate');
    const btnDrop = document.getElementById('ctrl-drop');
    
    const btnPause = document.getElementById('ctrl-pause');
    const btnSound = document.getElementById('ctrl-sound');
    const btnReset = document.getElementById('ctrl-reset');
    
    const overlayStartBtn = document.getElementById('start-game-overlay-btn');
    const overlayRestartBtn = document.getElementById('restart-game-overlay-btn');
    const overlayStart = document.getElementById('screen-overlay-start');
    const overlayGameOver = document.getElementById('screen-overlay-gameover');

    // Trigger helper
    function sendKey(keyName, action = 'keydown') {
        if (window.retroGameInstance) {
            window.retroGameInstance.handleInput(keyName, action);
        }
    }

    // Touch D-Pad Controls
    if (btnLeft) {
        btnLeft.addEventListener('mousedown', () => sendKey('ArrowLeft', 'keydown'));
        btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('ArrowLeft', 'keydown'); });
    }
    if (btnRight) {
        btnRight.addEventListener('mousedown', () => sendKey('ArrowRight', 'keydown'));
        btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('ArrowRight', 'keydown'); });
    }
    if (btnDown) {
        btnDown.addEventListener('mousedown', () => sendKey('ArrowDown', 'keydown'));
        btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('ArrowDown', 'keydown'); });
        
        btnDown.addEventListener('mouseup', () => sendKey('ArrowDown', 'keyup'));
        btnDown.addEventListener('touchend', (e) => { e.preventDefault(); sendKey('ArrowDown', 'keyup'); });
    }
    if (btnUp) {
        btnUp.addEventListener('mousedown', () => sendKey('ArrowUp', 'keydown'));
        btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('ArrowUp', 'keydown'); });
    }
    if (btnRotate) {
        btnRotate.addEventListener('mousedown', () => sendKey('KeyX', 'keydown')); // X or ArrowUp for rotate
        btnRotate.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('KeyX', 'keydown'); });
    }
    if (btnDrop) {
        btnDrop.addEventListener('mousedown', () => sendKey('Space', 'keydown'));
        btnDrop.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('Space', 'keydown'); });
    }

    // Utility Panel
    if (btnPause) {
        btnPause.addEventListener('click', () => {
            if (window.retroGameInstance) {
                const isPaused = window.retroGameInstance.togglePause();
                const icon = btnPause.querySelector('i');
                icon.className = isPaused ? 'fas fa-play' : 'fas fa-pause';
            }
        });
    }
    if (btnSound) {
        btnSound.addEventListener('click', () => {
            if (window.retroGameInstance) {
                const isMuted = window.retroGameInstance.toggleMute();
                const icon = btnSound.querySelector('i');
                icon.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-high';
            }
        });
    }
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (window.retroGameInstance) {
                window.retroGameInstance.reset();
                overlayGameOver.classList.remove('active');
                overlayStart.classList.remove('active');
                
                // reset pause button display
                const pIcon = btnPause?.querySelector('i');
                if (pIcon) pIcon.className = 'fas fa-pause';
            }
        });
    }

    // Overlay Buttons
    if (overlayStartBtn) {
        overlayStartBtn.addEventListener('click', () => {
            overlayStart.classList.remove('active');
            if (window.retroGameInstance) {
                window.retroGameInstance.start();
            }
        });
    }
    if (overlayRestartBtn) {
        overlayRestartBtn.addEventListener('click', () => {
            overlayGameOver.classList.remove('active');
            if (window.retroGameInstance) {
                window.retroGameInstance.reset();
                window.retroGameInstance.start();
                
                const pIcon = btnPause?.querySelector('i');
                if (pIcon) pIcon.className = 'fas fa-pause';
            }
        });
    }

    // Keyboard handlers
    window.addEventListener('keydown', (e) => {
        // Prevent scrolling with arrows/space while playing inside the emulator area
        const keysToPrevent = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (keysToPrevent.includes(e.code)) {
            // Check if user is scrolled near the play section or in focus
            const playRect = document.getElementById('play')?.getBoundingClientRect();
            if (playRect && playRect.top < window.innerHeight && playRect.bottom > 0) {
                e.preventDefault();
            }
        }
        
        if (window.retroGameInstance && window.retroGameInstance.isGameActive) {
            window.retroGameInstance.handleInput(e.code, 'keydown');
        }
    });

    window.addEventListener('keyup', (e) => {
        if (window.retroGameInstance && window.retroGameInstance.isGameActive) {
            window.retroGameInstance.handleInput(e.code, 'keyup');
        }
    });
});
