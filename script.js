document.addEventListener('DOMContentLoaded', function() {
    const clickwheel = document.getElementById('clickwheel');
    let menuItems = document.querySelectorAll('.menu-item');
    let previewImage = document.getElementById('preview-image');
    const screenEl = document.getElementById('screen'); // Get the main screen element
    
    let currentIndex = 0;
    let inSettingsMenu = false; 
    let inThemeMenu = false; 
    let gameMode = false; 
    let animationFrameId = null; 
    
    // --- FIX 1 & NUOVE VARIABILI PER LA CLICKWHEEL ---
    let lastMainMenuIndex = 0; // Per memorizzare l'indice all'uscita dal menu
    let lastQuadrant = -1;     // Per la nuova logica di navigazione (0, 1, 2, 3)
    let rotationSensitivity = 1; // Un flag per regolare la sensibilità se necessario (default 1)
    // --- FINE NUOVE VARIABILI ---
    
    // Hammer.js instances
    let menuHammerManager = null; 
    
    // Variables for circular paddle control
    let initialClickwheelAngle = 0; 
    let initialPaddleX = 0; 
    
    // Game-specific variables (omesse per brevità, sono nel codice)
    let paddleX = 0; 
    let paddleWidth = 0; 
    let canvasDisplayWidth = 0; 
    let running = false; 
    let paused = true; 
    let ballX = 0; 
    let ballY = 0; 
    let ballSpeedX = 0; 
    let ballSpeedY = 0; 
    let radius = 0; 
    let brickRowCount = 0;
    let brickColumnCount = 0;
    let brickWidth = 0;
    let brickHeight = 0;
    let brickPadding = 0;
    let brickOffsetTop = 0;
    let brickOffsetLeft = 0;
    let score = 0;
    let maxScore = 0;
    let bricks = [];
    let gameContext = null; 
    let gameCanvas = null; 
    let paddleSpeed = 0; 
    
    
    // --- UTILITY FUNCTIONS ---
    
    function getMenuItems() {
        return Array.from(document.querySelectorAll('.menu-item'));
    }
    
    /**
     * Updates the currently selected menu item based on a new index.
     * @param {number} newIndex The index of the item to select.
     */
    function updateSelection(newIndex) {
        menuItems = getMenuItems(); 
        if (menuItems.length === 0) return;
        
        let targetIndex = newIndex;
        
        // Handle wrapping around
        if (targetIndex < 0) {
            targetIndex = menuItems.length - 1;
        } else if (targetIndex >= menuItems.length) {
            targetIndex = 0;
        }
        
        menuItems.forEach(item => item.classList.remove('active'));
        
        menuItems[targetIndex].classList.add('active');
        
        menuItems[targetIndex].scrollIntoView({ block: 'nearest' });
        
        // Update the preview image ONLY if on the main menu
        if (!inSettingsMenu && !inThemeMenu && !gameMode) {
            previewImage.src = menuItems[targetIndex].dataset.preview;
        }
        
        currentIndex = targetIndex;
    }
    
    /**
     * Calculates the angle in degrees from the center of the element to a point (x, y).
     * 0/360 is at the top (12 o'clock).
     */
    function getAngle(element, x, y) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angleRad = Math.atan2(y - centerY, x - centerX);
        let angleDeg = angleRad * (180 / Math.PI);
        
        // Normalize the angle so 0/360 is at the top (90 degrees in standard polar)
        angleDeg = (angleDeg + 90 + 360) % 360; 
        
        return angleDeg;
    }
    
    // --- HAMMER.JS SETUP FOR CLICKWHEEL ---
    
    function initializeHammerManagers() {
        if (!menuHammerManager) {
            menuHammerManager = new Hammer.Manager(clickwheel);
            menuHammerManager.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 2 }));
            
            menuHammerManager.on('panstart', function(ev) {
                if (gameMode) {
                    initialClickwheelAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    initialPaddleX = paddleX;
                } else {
                    const startAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    // Memorizza il quadrante iniziale (0=Top/Right, 1=Bottom/Right, 2=Bottom/Left, 3=Top/Left)
                    lastQuadrant = Math.floor(startAngle / 90); 
                }
            });
            
            menuHammerManager.on('panmove', function(ev) {
                if (gameMode) {
                    // Logica di controllo della paddle (NON CAMBIA)
                    const currentAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    let angleDiff = currentAngle - initialClickwheelAngle;
    
                    if (angleDiff > 180) {
                        angleDiff -= 360;
                    } else if (angleDiff < -180) {
                        angleDiff += 360;
                    }
    
                    const paddleMovementFactor = 1.5; 
                    const newPaddleX = initialPaddleX + (angleDiff * paddleMovementFactor);
    
                    if (gameCanvas) {
                        paddleX = Math.max(0, Math.min(newPaddleX, gameCanvas.width - paddleWidth));
                    }
    
                } else {
                    // --- NUOVA LOGICA DI NAVIGAZIONE CON QUADRANTI ---
                    menuItems = getMenuItems(); 
                    if (menuItems.length === 0) return;
                    
                    const currentAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    const currentQuadrant = Math.floor(currentAngle / 90);

                    // Calcola la rotazione basata sul cambio di quadrante
                    let rotation = currentQuadrant - lastQuadrant;
                    
                    // Normalizza la rotazione: passaggio da 0 a 3 (o viceversa)
                    if (rotation === 3) rotation = -1; // 3 -> 0 (Antiorario)
                    if (rotation === -3) rotation = 1; // 0 -> 3 (Orario)
                    
                    // Applica la selezione SOLO al cambio di quadrante
                    if (rotation !== 0) {
                        // Lo scorrimento è orario
                        if (rotation > 0) {
                            updateSelection(currentIndex + rotationSensitivity);
                        } 
                        // Lo scorrimento è antiorario
                        else if (rotation < 0) {
                            updateSelection(currentIndex - rotationSensitivity);
                        }
                        
                        // Aggiorna il quadrante di riferimento
                        lastQuadrant = currentQuadrant;
                    }
                    // --- FINE NUOVA LOGICA ---
                }
            });
            
            menuHammerManager.on('panend', function(ev) {
                // Resetta il quadrante per prepararsi alla prossima interazione
                const endAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                lastQuadrant = Math.floor(endAngle / 90);
            });
        }
    }
    
    // --- ALTRE FUNZIONI (Settings, Theme, Game) ---

    // Funzione helper per ripristinare il codice HTML del menu principale
    function restoreMainMenuStructure() {
        const mainHtml = `
            <div class="header">iMon</div>
            <ul id="main-menu">
                <li class="menu-item" data-preview="images/linkedin-preview.png">LinkedIn</li>
                <li class="menu-item" data-preview="images/cv-preview.png">CV</li>
                <li class="menu-item" data-preview="images/mail-preview.png">Mail</li>
                <li class="menu-item" data-preview="images/games-preview.png">Games</li>
                <li class="menu-item" data-preview="images/settings-preview.png">Settings</li>
            </ul>
        `;
        document.getElementById('display').innerHTML = mainHtml;
        menuItems = document.querySelectorAll('#main-menu .menu-item');
    }

    function showSettingsMenu() {
        inSettingsMenu = true;
        inThemeMenu = false; 
        screenEl.classList.add('in-settings');
        document.getElementById('right-display').style.display = 'none'; 
        
        let settingsHtml = `
            <div class="header">Settings</div>
            <ul id="settings-menu">
                <li class="menu-item active" data-action="theme">Theme</li>
                <li class="menu-item" data-action="about">About</li>
                <li class="menu-item" data-action="reset">Reset</li>
            </ul>
        `;
        document.getElementById('display').innerHTML = settingsHtml;
        updateSelection(0); 
    }
    
    function showThemeMenu() {
        inThemeMenu = true;
        inSettingsMenu = false; 
        
        let themeHtml = `
            <div class="header">Theme</div>
            <ul id="theme-menu">
                <li class="menu-item active" data-theme="default">Default</li>
                <li class="menu-item" data-theme="dark">Dark</li>
                <li class="menu-item" data-theme="mint">Mint</li>
            </ul>
        `;
        document.getElementById('display').innerHTML = themeHtml;
        updateSelection(0); 
    }
    
    function startBreakoutGame() {
        // --- FIX 1: Salva l'indice del menu principale prima di uscire ---
        lastMainMenuIndex = currentIndex;
        // --- FINE FIX 1 ---
        
        gameMode = true;
        screenEl.classList.add('in-game');
        document.getElementById('display').style.display = 'none'; 
        document.getElementById('right-display').style.display = 'none'; 
        
        // ... Logica di inizializzazione del gioco (omessa per brevità) ...
        gameCanvas = document.getElementById('game-canvas');
        if (!gameCanvas) {
            gameCanvas = document.createElement('canvas');
            gameCanvas.id = 'game-canvas';
            screenEl.appendChild(gameCanvas);
        }
        
        gameContext = gameCanvas.getContext('2d');
        const screenRect = screenEl.getBoundingClientRect();
        gameCanvas.width = screenRect.width * 0.9; 
        gameCanvas.height = screenRect.height * 0.9;
        canvasDisplayWidth = gameCanvas.width;
        
        paddleWidth = gameCanvas.width * 0.2;
        paddleX = (gameCanvas.width - paddleWidth) / 2;
        paddleSpeed = gameCanvas.width * 0.01;
        
        radius = gameCanvas.width * 0.02; 
        ballX = gameCanvas.width / 2;
        ballY = gameCanvas.height - radius - 10;
        ballSpeedX = gameCanvas.width * 0.005; 
        ballSpeedY = -gameCanvas.width * 0.005; 
        
        brickRowCount = 3;
        brickColumnCount = 5;
        brickWidth = (gameCanvas.width / brickColumnCount) - 10;
        brickHeight = gameCanvas.height * 0.05;
        brickPadding = 5;
        brickOffsetTop = gameCanvas.height * 0.1;
        brickOffsetLeft = 5;
        score = 0;
        maxScore = brickRowCount * brickColumnCount;
        
        bricks = [];
        for(let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for(let r = 0; r < brickRowCount; r++) {
                bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
        
        running = true;
        paused = false;
        gameLoop(); 
    }
    
    function stopBreakoutGame() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        gameMode = false;
        running = false;
        paused = true;
        
        screenEl.classList.remove('in-game');
        
        if (gameCanvas) {
            gameCanvas.remove();
            gameCanvas = null;
            gameContext = null;
        }
        
        document.getElementById('display').style.display = 'block';
        document.getElementById('right-display').style.display = 'block';
        
        restoreMainMenuStructure();
        // --- FIX 1: Ripristina la selezione all'uscita ---
        updateSelection(lastMainMenuIndex); 
        // --- FINE FIX 1 ---
    }
    
    // ... Logica gameLoop, collisionDetection, drawGame (omessa per brevità) ...
    function gameLoop() {
        if (!running || paused || !gameContext) {
            animationFrameId = null;
            return;
        }
        drawGame();
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        // Collisioni con i muri
        if (ballX + ballSpeedX > gameCanvas.width - radius || ballX + ballSpeedX < radius) {
            ballSpeedX = -ballSpeedX;
        }
        if (ballY + ballSpeedY < radius) {
            ballSpeedY = -ballSpeedY;
        } else if (ballY + ballSpeedY > gameCanvas.height - radius - 10) { 
            // Collisione con la paddle
            if (ballX > paddleX && ballX < paddleX + paddleWidth) {
                ballSpeedY = -ballSpeedY;
                let hitPoint = (ballX - paddleX) / paddleWidth; 
                ballSpeedX = (hitPoint - 0.5) * 2 * (gameCanvas.width * 0.006); 
            } else if (ballY + ballSpeedY > gameCanvas.height - radius) {
                // Game Over
                alert("GAME OVER! Score: " + score);
                stopBreakoutGame();
                return;
            }
        }
        
        collisionDetection();
        
        if (score === maxScore) {
            alert("YOU WIN! Score: " + score);
            stopBreakoutGame();
            return;
        }
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function collisionDetection() {
        for(let c = 0; c < brickColumnCount; c++) {
            for(let r = 0; r < brickRowCount; r++) {
                const b = bricks[c][r];
                if (b.status === 1) {
                    b.x = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                    b.y = (r * (brickHeight + brickPadding)) + brickOffsetTop;
    
                    if (ballX > b.x && ballX < b.x + brickWidth && ballY > b.y && ballY < b.y + brickHeight) {
                        ballSpeedY = -ballSpeedY; 
                        b.status = 0; 
                        score++;
                    }
                }
            }
        }
    }
    
    function drawGame() {
        gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // Draw Bricks
        for(let c = 0; c < brickColumnCount; c++) {
            for(let r = 0; r < brickRowCount; r++) {
                if (bricks[c][r].status === 1) {
                    const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                    const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                    gameContext.beginPath();
                    gameContext.rect(brickX, brickY, brickWidth, brickHeight);
                    gameContext.fillStyle = "#A7A7A7"; 
                    gameContext.fill();
                    gameContext.closePath();
                }
            }
        }
        
        // Draw Paddle
        gameContext.beginPath();
        gameContext.rect(paddleX, gameCanvas.height - 10, paddleWidth, 10);
        gameContext.fillStyle = "#A7A7A7"; 
        gameContext.fill();
        gameContext.closePath();
        
        // Draw Ball
        gameContext.beginPath();
        gameContext.arc(ballX, ballY, radius, 0, Math.PI * 2);
        gameContext.fillStyle = "#A7A7A7"; 
        gameContext.fill();
        gameContext.closePath();
        
        // Draw Score
        gameContext.font = "16px Inter";
        gameContext.fillStyle = "#A7A7A7";
        gameContext.fillText("Score: " + score, 8, gameCanvas.height - 5);
    }

    // --- EVENT LISTENERS ---
    
    // Tasto MENU
    document.getElementById('menu-button').addEventListener('click', function() {
        if (gameMode) {
            stopBreakoutGame();
        } else if (inThemeMenu) {
            inThemeMenu = false;
            showSettingsMenu();
            updateSelection(0); 
        } else if (inSettingsMenu) {
            inSettingsMenu = false;
            screenEl.classList.remove('in-settings');
            
            restoreMainMenuStructure();
            // --- FIX 1: Ripristina la selezione all'uscita ---
            updateSelection(lastMainMenuIndex); 
            // --- FINE FIX 1 ---
        }
    });
    
    // Tasto CENTRALE (Select)
    document.getElementById('center-button').addEventListener('click', function() {
        if (!gameMode) {
            menuItems = getMenuItems(); 
            if (menuItems.length === 0) return;
            
            const selectedText = menuItems[currentIndex].textContent.trim();
            const selectedItem = menuItems[currentIndex];
            
            // --- FIX 1: Salva l'indice del menu principale prima di navigare via ---
            if (!inSettingsMenu && !inThemeMenu && (selectedText === "Settings" || selectedText === "Games")) {
                lastMainMenuIndex = currentIndex;
            }
            // --- FINE FIX 1 ---
            
            if (inThemeMenu) {
                const themeName = selectedItem.dataset.theme;
                applyTheme(themeName);
            } else if (inSettingsMenu) {
                if (selectedText === "Theme") {
                    showThemeMenu();
                } else if (selectedText === "About") {
                    alert("iMon - Created by Monica. Version 1.0");
                } else if (selectedText === "Reset") {
                    if (confirm("Are you sure you want to reset the theme?")) {
                        localStorage.removeItem('ipodTheme');
                        // Carica il tema di default dopo il reset
                        document.body.className = '';
                        document.body.classList.add('theme-default'); 
                        alert("Theme reset to Default.");
                    }
                }
            } else { 
                // Main menu selection
                const links = {
                    "LinkedIn": "https://www.linkedin.com/in/monica-gottardi/",
                    "CV": "CV_MonicaGottardi.pdf", 
                    "Mail": "mailto:monicagottardi@outlook.com"
                };
    
                if (links[selectedText]) {
                    if (selectedText === "Mail") {
                        window.location.href = links[selectedText];
                    } else {
                        window.open(links[selectedText], '_blank');
                    }
                } else if (selectedText === "Games") {
                    startBreakoutGame();
                } else if (selectedText === "Settings") {
                    showSettingsMenu();
                }
            }
        } else {
            // Tasto centrale in modalità gioco: Pausa/Riprendi
            paused = !paused;
            if (running && !paused) {
                gameLoop(); 
            }
            alert(paused ? "Game Paused" : "Game Resumed");
        }
    });
    
    // Tasto Play/Pause (in basso)
    document.getElementById('play-pause-button').addEventListener('click', function() {
        if (gameMode) {
            // Stessa funzione del tasto centrale in modalità gioco
            paused = !paused;
            if (running && !paused) {
                gameLoop(); 
            }
            alert(paused ? "Game Paused" : "Game Resumed");
        }
    });
    
    // Tasti Forward/Back (Game controls, solo per tastiera/pulsante)
    document.getElementById('forward-button').addEventListener('click', function() {
        if (gameMode && !paused && gameCanvas) {
            paddleX = Math.min(paddleX + paddleSpeed * 5, gameCanvas.width - paddleWidth);
        } else if (!gameMode) {
            // Navigazione Menu (per debug)
            updateSelection(currentIndex + 1);
        }
    });
    
    document.getElementById('back-button').addEventListener('click', function() {
        if (gameMode && !paused) {
            paddleX = Math.max(0, paddleX - paddleSpeed * 5);
        } else if (!gameMode) {
            // Navigazione Menu (per debug)
            updateSelection(currentIndex - 1);
        }
    });
    
    // --- KEYBOARD INPUT HANDLER ---
    
    function handleKeyboardInput(event) {
        if (event.type === 'keydown') {
            if (event.key === "Escape" || event.key === "m") { 
                document.getElementById('menu-button').click(); 
                return;
            } else if (gameMode && event.key === " ") { 
                 document.getElementById('play-pause-button').click();
                 return;
            }
            
            if (!gameMode) {
                if (event.key === "Enter") {
                    document.getElementById('center-button').click(); 
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    updateSelection(currentIndex - 1);
                } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    updateSelection(currentIndex + 1);
                }
            } else {
                if (event.key === "ArrowLeft") {
                    document.getElementById('back-button').click();
                } else if (event.key === "ArrowRight") {
                    document.getElementById('forward-button').click();
                }
            }
        }
    }
    
    document.addEventListener('keydown', handleKeyboardInput);
    
    // --- INITIALIZATION ---
    
    function applyTheme(themeName) {
        document.body.className = '';
        document.body.classList.add(`theme-${themeName}`);
        localStorage.setItem('ipodTheme', themeName); 
    }
    
    function loadTheme() {
        const savedTheme = localStorage.getItem('ipodTheme') || 'default';
        applyTheme(savedTheme);
    }
    
    loadTheme();
    initializeHammerManagers();
    
    // Initial state setup
    menuItems = getMenuItems();
    if (menuItems.length > 0) {
        updateSelection(0); 
    }
    
    // Avvia l'animation frame loop (necessario anche se non in game per l'init)
    (function draw() {
        animationFrameId = requestAnimationFrame(draw); 
    })(); 
});
