/*
  Brick Space NEO - Main Application Logic
  - Starfield background particle effect
  - Navigation handlers
  - UI control hooks for emulator
  - Screenshot gallery horizontal scrolling
  - Trailer video modal dialog toggle
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

    // 2. Starfield Warp Speed Particle Background
    const starfieldCanvas = document.getElementById('starfield');
    if (starfieldCanvas) {
        const ctx = starfieldCanvas.getContext('2d');
        let stars = [];
        const numStars = 150;
        let centerX, centerY;

        function resizeCanvas() {
            starfieldCanvas.width = window.innerWidth;
            starfieldCanvas.height = window.innerHeight;
            centerX = starfieldCanvas.width / 2;
            centerY = starfieldCanvas.height / 2;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Initialize stars with purple and cyan colors
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * starfieldCanvas.width - centerX,
                y: Math.random() * starfieldCanvas.height - centerY,
                z: Math.random() * starfieldCanvas.width,
                color: Math.random() > 0.5 ? '#ff007f' : '#00f3ff'
            });
        }

        function drawStars() {
            ctx.fillStyle = '#0b0f1a'; // Match the premium dark background
            ctx.fillRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);

            // Synthwave horizon glowing effect
            const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, starfieldCanvas.width / 2);
            gradient.addColorStop(0, 'rgba(157, 78, 221, 0.06)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);

            for (let i = 0; i < numStars; i++) {
                const star = stars[i];
                star.z -= 1.2; // Warp speed rate

                if (star.z <= 0) {
                    star.z = starfieldCanvas.width;
                    star.x = Math.random() * starfieldCanvas.width - centerX;
                    star.y = Math.random() * starfieldCanvas.height - centerY;
                }

                const px = (star.x / star.z) * 400 + centerX;
                const py = (star.y / star.z) * 400 + centerY;

                if (px < 0 || px > starfieldCanvas.width || py < 0 || py > starfieldCanvas.height) {
                    continue;
                }

                const size = (1 - star.z / starfieldCanvas.width) * 3;
                
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fillStyle = star.color;
                
                if (size > 1.5) {
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = star.color;
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.fill();
            }
            ctx.shadowBlur = 0; // Reset
            requestAnimationFrame(drawStars);
        }

        drawStars();
    }

    // 3. Horizontal Screenshot Gallery Controls
    const gallery = document.getElementById('screenshot-gallery');
    const prevBtn = document.getElementById('gallery-prev-btn');
    const nextBtn = document.getElementById('gallery-next-btn');

    if (gallery && prevBtn && nextBtn) {
        const scrollAmount = 350; // Scroll width of one slide + gap

        prevBtn.addEventListener('click', () => {
            gallery.scrollBy({
                left: -scrollAmount,
                behavior: 'smooth'
            });
        });

        nextBtn.addEventListener('click', () => {
            gallery.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        });
    }



    // 5. Handheld Emulator Input Hook bindings
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

    function sendKey(keyName, action = 'keydown') {
        if (window.retroGameInstance) {
            window.retroGameInstance.handleInput(keyName, action);
        }
    }

    // Bind event listeners to UI D-pad buttons
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
        btnRotate.addEventListener('mousedown', () => sendKey('KeyX', 'keydown'));
        btnRotate.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('KeyX', 'keydown'); });
    }
    if (btnDrop) {
        btnDrop.addEventListener('mousedown', () => sendKey('Space', 'keydown'));
        btnDrop.addEventListener('touchstart', (e) => { e.preventDefault(); sendKey('Space', 'keydown'); });
    }

    // Utility panel
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
                
                const pIcon = btnPause?.querySelector('i');
                if (pIcon) pIcon.className = 'fas fa-pause';
            }
        });
    }

    // Overlay triggers
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

    // Global keyboard keys binders
    window.addEventListener('keydown', (e) => {
        const keysToPrevent = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (keysToPrevent.includes(e.code)) {
            const playSection = document.getElementById('hero');
            if (playSection) {
                const rect = playSection.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    e.preventDefault();
                }
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
