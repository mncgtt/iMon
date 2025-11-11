document.addEventListener('DOMContentLoaded', function() {
    const clickwheel = document.getElementById('clickwheel');
    let menuItems = document.querySelectorAll('.menu-item');
    let previewImage = document.getElementById('preview-image');
    const screenEl = document.getElementById('screen'); // Get the main screen element
    
    let currentIndex = 0;
    // Rimosso inSubMenu, usiamo i flag specifici
    let inSettingsMenu = false; // Flag specifically for settings menu
    let inThemeMenu = false; // Flag for theme submenu
    let gameMode = false; // Flag to indicate if a game is active
    let animationFrameId = null; // To store the requestAnimationFrame ID for the game loop
    
    // --- FIX 1: Variabile per l'elemento selezionato al ritorno al menu principale ---
    let lastMainMenuIndex = 0; 
    // --- END FIX 1 ---
    
    // Hammer.js instances
    let menuHammerManager = null; 
    
    // Variables for menu rotation with Hammer.js
    let lastMenuAngle = 0; // Usata per Main Menu, Settings Menu, e Theme Menu
    
    // Variables for circular paddle control
    let initialClickwheelAngle = 0; 
    let initialPaddleX = 0; 
    
    // Game-specific variables (need to be accessible globally or passed)
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
    let gameContext = null; // Context for the game canvas
    let gameCanvas = null; // The game canvas element
    let paddleSpeed = 0; // Speed of the paddle movement
    
    
    // --- UTILITY FUNCTIONS ---
    
    function getMenuItems() {
        return Array.from(document.querySelectorAll('.menu-item'));
    }
    
    /**
     * Updates the currently selected menu item based on a new index.
     * @param {number} newIndex The index of the item to select.
     */
    function updateSelection(newIndex) {
        // Aggiorna sempre la lista prima di procedere
        menuItems = getMenuItems(); 
        if (menuItems.length === 0) return;
        
        let targetIndex = newIndex;
        
        // Handle wrapping around
        if (targetIndex < 0) {
            targetIndex = menuItems.length - 1;
        } else if (targetIndex >= menuItems.length) {
            targetIndex = 0;
        }
        
        // Remove active class from all items
        menuItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to the new item
        menuItems[targetIndex].classList.add('active');
        
        // Scroll the new item into view if necessary
        menuItems[targetIndex].scrollIntoView({ block: 'nearest' });
        
        // Update the preview image ONLY if on the main menu
        if (!inSettingsMenu && !inThemeMenu && !gameMode) {
            previewImage.src = menuItems[targetIndex].dataset.preview;
        }
        
        // IMPORTANT: Update the global index tracker
        currentIndex = targetIndex;
    }
    
    function getAngle(element, x, y) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angleRad = Math.atan2(y - centerY, x - centerX);
        let angleDeg = angleRad * (180 / Math.PI);
        
        angleDeg = (angleDeg + 90 + 360) % 360; 
        
        return angleDeg;
    }
    
    // --- HAMMER.JS SETUP FOR CLICKWHEEL ---
    
    function initializeHammerManagers() {
        if (!menuHammerManager) {
            menuHammerManager = new Hammer.Manager(clickwheel);
            // Abbassiamo la soglia di Pan, l'iPod è molto sensibile
            menuHammerManager.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 2 }));
            
            menuHammerManager.on('panstart', function(ev) {
                if (gameMode) {
                    initialClickwheelAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    initialPaddleX = paddleX;
                } else {
                    // Usiamo lastMenuAngle per TUTTI i menu non-game
                    lastMenuAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                }
            });
            
            menuHammerManager.on('panmove', function(ev) {
                if (gameMode) {
                    // Logica di controllo della paddle per il gioco
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
                    // Logica di navigazione per tutti i menu (Main, Settings, Theme)
                    menuItems = getMenuItems(); // Aggiorna la lista
                    if (menuItems.length === 0) return;
                    
                    const currentAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    let angleDiff = currentAngle - lastMenuAngle;
                    
                    // --- FIX 2: Aumento la sensibilità (divido per 2 anziché 4) ---
                    // Se la rotazione supera un certo angolo (es. 360 / (5 elementi * 2) = 36 gradi)
                    if (Math.abs(angleDiff) >= 360 / (menuItems.length * 2)) { 
                        if (angleDiff > 0) {
                            updateSelection(currentIndex + 1);
                        } else {
                            updateSelection(currentIndex - 1);
                        }
                        lastMenuAngle = currentAngle; // Reset dell'angolo di riferimento
                    }
                }
            });
            
            menuHammerManager.on('panend', function(ev) {
                // Reset dell'angolo di riferimento
                lastMenuAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
            });
        }
    }
    
    // --- THEME & SETTINGS FUNCTIONS ---
    
    function showSettingsMenu() {
        inSettingsMenu = true;
        inThemeMenu = false; // Solo per sicurezza
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
        // La chiamata a updateSelection(0) è implicita, ma esplicito per chiarezza
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
    
    function applyTheme(themeName) {
        document.body.className = '';
        document.body.classList.add(`theme-${themeName}`);
        localStorage.setItem('ipodTheme', themeName); 
    }
    
    function loadTheme() {
        const savedTheme = localStorage.getItem('ipodTheme') || 'default';
        applyTheme(savedTheme);
    }
    
    // --- GAME FUNCTIONS (Breakout Game) ---
    
    function startBreakoutGame() {
        // --- FIX 3: Salva l'indice del menu principale prima di uscire ---
        lastMainMenuIndex = currentIndex;
        // --- END FIX 3 ---
        
        gameMode = true;
        screenEl.classList.add('in-game');
        document.getElementById('display').style.display = 'none'; 
        document.getElementById('right-display').style.display = 'none'; 
        
        // Setup canvas (omesso per brevità, assumiamo che la logica del canvas sia ok)
        gameCanvas = document.getElementById('game-canvas');
        if (!gameCanvas) {
            gameCanvas = document.createElement('canvas');
            gameCanvas.id = 'game-canvas';
            screenEl.appendChild(gameCanvas);
        }
        
        gameContext = gameCanvas.getContext('2d');
        
        // ... Logica di inizializzazione del gioco ...
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
        
        bricks = [];
        for(let c = 0; c < brickColumnCount; c++) {
            bricks[c] = [];
            for(let r = 0; r < brickRowCount; r++) {
                bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
        maxScore = brickRowCount * brickColumnCount;
        
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
        
        // Ripristina la struttura del menu e poi la selezione
        restoreMainMenuStructure();
        // --- FIX 1: Ripristina la selezione all'uscita ---
        updateSelection(lastMainMenuIndex); 
        // --- END FIX 1 ---
    }

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
    
    function gameLoop() {
        if (!running || paused || !gameContext) {
            animationFrameId = null;
            return;
        }
        
        drawGame();
        
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        // Logica di collisione (omessa per brevità, è corretta nel tuo codice)
        if (ballX + ballSpeedX > gameCanvas.width - radius || ballX + ballSpeedX < radius) {
            ballSpeedX = -ballSpeedX;
        }
        if (ballY + ballSpeedY < radius) {
            ballSpeedY = -ballSpeedY;
        } else if (ballY + ballSpeedY > gameCanvas.height - radius - 10) { 
            if (ballX > paddleX && ballX < paddleX + paddleWidth) {
                ballSpeedY = -ballSpeedY;
                let hitPoint = (ballX - paddleX) / paddleWidth; 
                ballSpeedX = (hitPoint - 0.5) * 2 * (gameCanvas.width * 0.006); 
            } else if (ballY + ballSpeedY > gameCanvas.height - radius) {
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
        // Logica di disegno (omessa per brevità, è corretta nel tuo codice)
        gameContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        
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
        
        gameContext.beginPath();
        gameContext.rect(paddleX, gameCanvas.height - 10, paddleWidth, 10);
        gameContext.fillStyle = "#A7A7A7"; 
        gameContext.fill();
        gameContext.closePath();
        
        gameContext.beginPath();
        gameContext.arc(ballX, ballY, radius, 0, Math.PI * 2);
        gameContext.fillStyle = "#A7A7A7"; 
        gameContext.fill();
        gameContext.closePath();
        
        gameContext.font = "16px Inter";
        gameContext.fillStyle = "#A7A7A7";
        gameContext.fillText("Score: " + score, 8, gameCanvas.height - 5);
    }
    
    // --- EVENT LISTENERS ---
    
    document.getElementById('menu-button').addEventListener('click', function() {
        if (gameMode) {
            stopBreakoutGame();
            // lastMainMenuIndex viene ripristinato in stopBreakoutGame()
        } else if (inThemeMenu) {
            inThemeMenu = false;
            // Torna al menu Settings
            showSettingsMenu();
            // L'indice del Theme item è sempre 0 nel menu Settings in questo codice
            updateSelection(0); 
        } else if (inSettingsMenu) {
            inSettingsMenu = false;
            screenEl.classList.remove('in-settings');
            
            // Ripristina la struttura del menu principale e la selezione
            restoreMainMenuStructure();
            // --- FIX 1: Ripristina la selezione all'uscita ---
            updateSelection(lastMainMenuIndex); 
            // --- END FIX 1 ---
        }
    });
    
    document.getElementById('center-button').addEventListener('click', function() {
        if (!gameMode) {
            menuItems = getMenuItems(); 
            if (menuItems.length === 0) return;
            
            const selectedText = menuItems[currentIndex].textContent.trim();
            const selectedItem = menuItems[currentIndex];
            
            // --- FIX 3: Salva l'indice del menu principale prima di navigare via ---
            if (!inSettingsMenu && !inThemeMenu && selectedText !== "Settings" && selectedText !== "Games") {
                // Non salviamo l'indice se stiamo per uscire, perché è già stato salvato
            } else if (!inSettingsMenu && !inThemeMenu && (selectedText === "Settings" || selectedText === "Games")) {
                // Salviamo l'indice SOLO quando entriamo in un sottomenu che ci farà usare Menu per tornare
                lastMainMenuIndex = currentIndex;
            }
            // --- END FIX 3 ---
            
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
                        loadTheme(); 
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
            // In game mode, Center Button can be used to pause/unpause
            paused = !paused;
            if (running && !paused) {
                gameLoop(); 
            }
            alert(paused ? "Game Paused" : "Game Resumed");
        }
    });
    
    document.getElementById('play-pause-button').addEventListener('click', function() {
        if (gameMode) {
            paused = !paused;
            if (running && !paused) {
                gameLoop(); 
            }
            alert(paused ? "Game Paused" : "Game Resumed");
        }
    });
    
    document.getElementById('forward-button').addEventListener('click', function() {
        if (gameMode && !paused && gameCanvas) {
            paddleX = Math.min(paddleX + paddleSpeed * 5, gameCanvas.width - paddleWidth);
        } else if (!gameMode) {
            // In un vero iPod, i pulsanti laterali NON scorrono i menu.
            // Li ho lasciati per il debug, ma meglio affidarsi a Hammer.js
            updateSelection(currentIndex + 1);
        }
    });
    
    document.getElementById('back-button').addEventListener('click', function() {
        if (gameMode && !paused) {
            paddleX = Math.max(0, paddleX - paddleSpeed * 5);
        } else if (!gameMode) {
            // Vedi nota sopra
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
    
    loadTheme();
    initializeHammerManagers();
    
    // Initial state setup
    menuItems = getMenuItems();
    if (menuItems.length > 0) {
        // La selezione iniziale è gestita da updateSelection(0) che è implicita o dalla classe 'active' in HTML
        updateSelection(0); 
    }
    
    function draw() {
        animationFrameId = requestAnimationFrame(draw); 
    }
    
    animationFrameId = requestAnimationFrame(draw); 
});
