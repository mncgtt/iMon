document.addEventListener('DOMContentLoaded', function() {
    const clickwheel = document.getElementById('clickwheel');
    let menuItems = document.querySelectorAll('.menu-item');
    let previewImage = document.getElementById('preview-image');
    const screenEl = document.getElementById('screen'); 
    
    let currentIndex = 0;
    let lastMainMenuIndex = 0; // NEW: Stores index before sub-menu/game
    let lastSector = -1; // NEW: For robust 8-sector navigation
    
    // State Flags (Kept from user's file for compatibility)
    let inSubMenu = false;
    let inSettingsMenu = false; 
    let inThemeMenu = false; 
    let inGamesMenu = false; 
    let gameMode = false; 
    let animationFrameId = null; 
    
    // Hammer.js instances
    let menuHammerManager = null; // ONLY ONE MANAGER USED NOW
    
    // Variables for circular paddle control
    let initialClickwheelAngle = 0; 
    let initialPaddleX = 0; 
    
    // Game-specific variables (kept from user's file for game logic)
    let paddleX = 0; 
    let paddleWidth = 0; 
    let canvasDisplayWidth = 0; 
    let running = false; 
    let paused = true; 
    let ballAttachedToPaddle = true; 
    let gameWon = false;
    let winAnimationStartTime = 0; 
    let winAnimationDuration = 1000; 
    let gameElementsVisible = true; 
    
    const keyState = {
        ArrowLeft: false,
        ArrowRight: false
    };
    
    const youWinImage = new Image();
    youWinImage.src = 'images/you_win.png'; 
    
    const links = {
        "LinkedIn": "https://www.linkedin.com/in/monicagottardi",
        "Behance": "https://www.behance.net/monicagottardi",
        "CV": "https://drive.google.com/drive/folders/1Lljhj2zPl8zjRdFb4QppszHeY8YD7SCH?usp=drive_link",
        "Mail": "mailto:monicagottardi@outlook.com"
    };
    
    // Initialize active menu item
    menuItems.forEach((item, index) => {
        if (item.classList.contains('active')) {
            currentIndex = index;
        }
    });

    // --- UTILITY FUNCTIONS ---
    
    // NEW: Robust angle calculation (0/360 is at 12 o'clock)
    function getAngle(element, x, y) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angleRad = Math.atan2(y - centerY, x - centerX);
        let angleDeg = angleRad * (180 / Math.PI);
        angleDeg = (angleDeg + 90 + 360) % 360; 
        return angleDeg;
    }
    
    // Function to update menu selection (unified)
    function updateSelection(newIndex) {
        // Re-check which menu items are currently displayed
        let currentMenuItems;
        if (inSettingsMenu || inThemeMenu || inGamesMenu) {
            currentMenuItems = Array.from(document.querySelectorAll('#menu-list .menu-item'));
        } else {
            currentMenuItems = Array.from(document.querySelectorAll('#menu-list .menu-item')); // Main menu
        }

        if (currentMenuItems.length === 0) return;
        
        let targetIndex = newIndex;
        
        // Handle wrapping around
        if (targetIndex < 0) {
            targetIndex = currentMenuItems.length - 1;
        } else if (targetIndex >= currentMenuItems.length) {
            targetIndex = 0;
        }
        
        currentMenuItems.forEach(item => item.classList.remove('active'));
        
        currentMenuItems[targetIndex].classList.add('active');
        currentMenuItems[targetIndex].scrollIntoView({ block: 'nearest' });
        
        currentIndex = targetIndex;

        // Update preview image only if relevant
        const activeItem = currentMenuItems[currentIndex];
        if (!gameMode && !inSettingsMenu && !inGamesMenu && activeItem.dataset.preview) {
            const previewSrc = activeItem.dataset.preview;
            if (previewSrc) {
                const imgEl = document.getElementById('preview-image');
                if (imgEl) imgEl.src = previewSrc;
            }
        }
    }
    
    // --- HAMMER.JS CENTRALIZED HANDLERS ---
    
    function onPanStart(e) {
        if (gameMode) { 
            // Game paddle control setup
            const rect = clickwheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            initialClickwheelAngle = Math.atan2(e.center.y - centerY, e.center.x - centerX);
            initialPaddleX = paddleX; 
        } else {
            // Menu/Settings/Theme control setup
            const startAngle = getAngle(clickwheel, e.center.x, e.center.y);
            lastSector = Math.floor(startAngle / 45); // 8 sectors (0 to 7)
        }
    }
    
    function onPanMove(e) { 
        if (gameMode) { 
            // --- GAME PADDLE LOGIC ---
            const rect = clickwheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const currentClickwheelAngle = Math.atan2(e.center.y - centerY, e.center.x - centerX);
            
            let angleDelta = currentClickwheelAngle - initialClickwheelAngle;
            
            if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
            if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
    
            const sensitivity = 200; 
            let newPaddleX = initialPaddleX + (angleDelta * sensitivity);
            
            const minPaddleX = 0;
            const maxPaddleX = canvasDisplayWidth - paddleWidth;
    
            if (newPaddleX < minPaddleX) {
                newPaddleX = minPaddleX;
            } else if (newPaddleX > maxPaddleX) {
                newPaddleX = maxPaddleX;
            }
            
            paddleX = newPaddleX;
            
            // Reset initial values more frequently for smoother control
            if (Math.abs(angleDelta) > Math.PI / 4) {
                initialClickwheelAngle = currentClickwheelAngle;
                initialPaddleX = paddleX;
            }
        } else {
            // --- MENU/SETTINGS/THEME SCROLLING (8-SECTOR LOGIC) ---
            const currentAngle = getAngle(clickwheel, e.center.x, e.center.y); 
            const currentSector = Math.floor(currentAngle / 45); // 0 to 7

            if (currentSector !== lastSector) {
                let rotation = currentSector - lastSector;
                
                // Normalize rotation for wrap-around
                if (rotation === 7) rotation = -1; // e.g., 7 -> 0 (Anticlockwise)
                if (rotation === -7) rotation = 1; // e.g., 0 -> 7 (Clockwise)

                // If rotation is clockwise (positive rotation)
                if (rotation > 0) {
                    updateSelection(currentIndex + 1);
                } 
                // If rotation is anti-clockwise (negative rotation)
                else if (rotation < 0) {
                    updateSelection(currentIndex - 1);
                }

                lastSector = currentSector; // Update the last sector
            }
        }
    }
    
    function onPanEnd(e) { 
        if (!gameMode) {
            // Reset sector for the next gesture
            const endAngle = getAngle(clickwheel, e.center.x, e.center.y);
            lastSector = Math.floor(endAngle / 45);
        }
    }
    
    // Initialize Hammer.js with the centralized handlers
    menuHammerManager = new Hammer.Manager(clickwheel);
    menuHammerManager.add(new Hammer.Pan({ threshold: 2 })); // Low threshold for high sensitivity
    menuHammerManager.on('panstart', onPanStart);
    menuHammerManager.on('panmove', onPanMove);
    menuHammerManager.on('panend', onPanEnd);
    console.log("Centralized Hammer.js manager initialized.");
    
    // --- MENU LOGIC FUNCTIONS (Simplified/Fixed) ---

    // Function to restore the main menu view without animation
    function restoreMenu() {
        console.log("Restoring menu...");
        
        // If we're in game mode, we need to clean up
        if (gameMode) {
            gameMode = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }
        
        // Reset flags immediately
        inSubMenu = false;
        inSettingsMenu = false;
        inThemeMenu = false;
        inGamesMenu = false;
        
        const currentPreviewPath = document.querySelector(`.menu-item[data-index="${lastMainMenuIndex}"]`)?.dataset.preview || 'images/linkedin-preview.png';
        
        const menuHTML = `
            <div id="display">
                <div id="menu-title">iMon</div>
                <div id="menu-container">
                    <ul id="menu-list">
                        <li class="menu-item" data-preview="images/linkedin-preview.png" data-index="0">LinkedIn</li>
                        <li class="menu-item" data-preview="images/behance-preview.png" data-index="1">Behance</li>
                        <li class="menu-item" data-preview="images/mail-preview.png" data-index="2">Mail</li>
                        <li class="menu-item" data-preview="images/games-preview.png" data-index="3">Games</li>
                        <li class="menu-item" data-preview="images/settings-preview.png" data-index="4">Settings</li>
                    </ul>
                </div>
            </div>
            <div id="right-display">
                <img src="${currentPreviewPath}" alt="Preview" class="display-icon" id="preview-image">
            </div>
        `;
        
        screenEl.innerHTML = menuHTML;
        
        // Reinitialize menu items and restore selection
        menuItems = document.querySelectorAll('#menu-list .menu-item');
        previewImage = document.getElementById('preview-image');
        updateSelection(lastMainMenuIndex); 
    }
    
    // Function to show the Settings menu without animation
    function showSettingsMenu() {
        // Save main menu index before navigating away
        if (!inSettingsMenu && !inThemeMenu && !inGamesMenu) {
            lastMainMenuIndex = currentIndex;
        }
        
        inSubMenu = true;
        inSettingsMenu = true;
        inThemeMenu = false;
        inGamesMenu = false;
        
        screenEl.innerHTML = `
            <div id="display" style="width:100%;">
                <div id="menu-title">Settings</div>
                <div id="menu-container">
                    <ul id="menu-list">
                        <li class="menu-item active" data-setting="theme">Device Theme</li>
                    </ul>
                </div>
            </div>
        `;
        updateSelection(0);
    }
    
    // Function to show the Theme menu without animation
    function showThemeMenu() {
        inSubMenu = true;
        inSettingsMenu = false;
        inThemeMenu = true;
        inGamesMenu = false;
        
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        
        const themePreviews = {
            light: "images/light-theme-preview.png",
            dark: "images/dark-theme-preview.png",
            mint: "images/mint-theme-preview.png"
        };
        
        screenEl.innerHTML = `
            <div id="display">
                <div id="menu-title">Device Theme</div>
                <div id="menu-container">
                    <ul id="menu-list">
                        <li class="menu-item ${currentTheme === 'light' ? 'active' : ''}" data-theme="light" data-preview="${themePreviews.light}">Light Theme</li>
                        <li class="menu-item ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark" data-preview="${themePreviews.dark}">Dark Theme</li>
                        <li class="menu-item ${currentTheme === 'mint' ? 'active' : ''}" data-theme="mint" data-preview="${themePreviews.mint}">Mint Theme</li>
                    </ul>
                </div>
            </div>
            <div id="right-display">
                <img src="${themePreviews[currentTheme]}" alt="Preview" class="display-icon" id="preview-image">
            </div>
        `;
        
        // Set currentIndex to the currently active item
        let activeIndex = Array.from(document.querySelectorAll('#menu-list .menu-item')).findIndex(item => item.classList.contains('active'));
        updateSelection(activeIndex !== -1 ? activeIndex : 0);
    }
    
    // Function to show the Games menu without animation
    function showGamesMenu() {
        // Save main menu index before navigating away
        if (!inSettingsMenu && !inThemeMenu && !inGamesMenu) {
            lastMainMenuIndex = currentIndex;
        }

        inSubMenu = true;
        inSettingsMenu = false;
        inThemeMenu = false;
        inGamesMenu = true;
        
        const gamePreview = "images/bricks-breaker-preview.png";
        
        screenEl.innerHTML = `
            <div id="display">
                <div id="menu-title">Games</div>
                <div id="menu-container">
                    <ul id="menu-list">
                        <li class="menu-item active" data-game="breakout" data-preview="${gamePreview}">Bricks Breaker</li>
                    </ul>
                </div>
            </div>
            <div id="right-display">
                <img src="${gamePreview}" alt="Preview" class="display-icon" id="preview-image">
            </div>
        `;
        updateSelection(0);
    }
    
    // Function to apply the selected theme
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-mint');
        document.body.setAttribute('data-theme', theme);
        document.body.classList.add('theme-' + theme);
        
        // Apply iPod container background logic (kept from user's file)
        const ipodContainer = document.querySelector('.ipod-container');
        ipodContainer.style.transition = 'background 0.5s ease';
        if (theme === 'light') {
            ipodContainer.style.background = 'linear-gradient(145deg, #e6e6e6, #cccccc)';
        } else if (theme === 'dark') {
            ipodContainer.style.background = 'linear-gradient(145deg, #333333, #222222)';
        } else if (theme === 'mint') {
            ipodContainer.style.background = 'linear-gradient(145deg, #98CFD1, #7ABFC1)';
        }
        
        // Brief flash effect
        const flashElement = document.createElement('div');
        flashElement.style.position = 'absolute';
        flashElement.style.top = '0';
        flashElement.style.left = '0';
        flashElement.style.width = '100%';
        flashElement.style.height = '100%';
        flashElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        flashElement.style.pointerEvents = 'none';
        flashElement.style.zIndex = '1000';
        flashElement.style.opacity = '0.5';
        flashElement.style.transition = 'opacity 0.3s ease-out';
        screenEl.appendChild(flashElement);
        
        setTimeout(() => {
            flashElement.style.opacity = '0';
            setTimeout(() => {
                flashElement.remove();
            }, 300);
        }, 100);
    }

    // --- BUTTON/ACTION HANDLERS (Simplified) ---

    function handleSettingsMenuAction(action) {
        const settingItems = Array.from(document.querySelectorAll('.menu-item[data-setting]'));
        let settingIndex = currentIndex; // Use currentIndex as the active index
        
        switch(action) {
            case 'select':
                const selectedSetting = settingItems[settingIndex].textContent.trim();
                if (selectedSetting === "Device Theme") {
                    showThemeMenu();
                }
                break;
            case 'menu':
                restoreMenu();
                break;
        }
    }
    
    function handleThemeMenuAction(action) {
        const themeItems = Array.from(document.querySelectorAll('.menu-item[data-theme]'));
        let themeIndex = currentIndex;
        
        switch(action) {
            case 'select':
                const selectedTheme = themeItems[themeIndex].dataset.theme;
                applyTheme(selectedTheme);
                break;
            case 'menu':
                showSettingsMenu(); // Go back to settings menu
                break;
        }
    }
    
    function handleGamesMenuAction(action) {
        const gameItems = Array.from(document.querySelectorAll('.menu-item[data-game]'));
        let gameIndex = currentIndex;
        
        switch(action) {
            case 'select':
                const selectedGame = gameItems[gameIndex].dataset.game;
                if (selectedGame === "breakout") {
                    // Create canvas and initialize game
                    screenEl.innerHTML = `<canvas id="breakout-game" style="background:black; display:block; margin:auto; width:100%; height:100%;"></canvas>`;
                    const screenRect = screenEl.getBoundingClientRect();
                    initBreakoutGame(screenRect.width, screenRect.height);
                    
                    gameMode = true;
                    inSubMenu = true;
                    inGamesMenu = false;
                }
                break;
            case 'menu':
                restoreMenu();
                break;
        }
    }
    
    // Main clickwheel button handler
    document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', function(event) {
            const action = this.dataset.action;
            
            if (gameMode) {
                if (action === 'menu') {
                    exitGame(); 
                } else if (action === 'select') {
                    if (typeof window.gameLaunchBall === 'function') window.gameLaunchBall();
                }
                return;
            }
            
            if (inThemeMenu) {
                handleThemeMenuAction(action);
                return;
            } else if (inSettingsMenu) {
                handleSettingsMenuAction(action);
                return;
            } else if (inGamesMenu) {
                handleGamesMenuAction(action);
                return;
            }
            
            // Main menu and general actions
            if (action === 'select') {
                const selectedText = menuItems[currentIndex].textContent.trim();
                if (links[selectedText]) {
                    window.open(links[selectedText], '_blank');
                } else if (selectedText === "Games") {
                    showGamesMenu();
                } else if (selectedText === "Settings") {
                    showSettingsMenu();
                } else {
                    screenEl.innerHTML = `<div style="text-align:center; padding-top:20px;"><h3>${selectedText}</h3><p>Opening...</p></div>`;
                    inSubMenu = true;
                }
            } else if (action === 'menu') {
                if (inSubMenu) restoreMenu();
            } else if (action === 'forward') {
                updateSelection(currentIndex + 1);
            } else if (action === 'back') {
                updateSelection(currentIndex - 1);
            }
        });
    });
    
    // --- GAME LOGIC (KEPT FROM USER'S FILE) ---

    function exitGame() {
        console.log("Exiting game...");
        gameMode = false; 
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); 
            animationFrameId = null;
        }
        restoreMenu(); 
    }
    
    // Helper for animation easing (kept from user's file)
    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    // BREAKOUT GAME FUNCTIONS (Defined locally inside initBreakoutGame in user's file, re-created here)
    // NOTE: Many variables for the game are defined inside initBreakoutGame in the user's provided file.
    // I am keeping the structure as in the user's file to ensure minimal breakages in their game logic.

    function initBreakoutGame(currentCanvasDisplayWidth, currentCanvasDisplayHeight) { 
        console.log("initBreakoutGame called.");
        const canvas = document.getElementById('breakout-game');
        const ctx = canvas.getContext('2d');
    
        canvasDisplayWidth = currentCanvasDisplayWidth; 
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasDisplayWidth * dpr;
        canvas.height = currentCanvasDisplayHeight * dpr; 
        ctx.scale(dpr, dpr);
    
        // Game constants
        paddleWidth = canvasDisplayWidth * 0.18; 
        let paddleHeight = currentCanvasDisplayHeight * 0.03; 
        paddleX = (canvasDisplayWidth - paddleWidth) / 2; 
        let ballRadius = canvasDisplayWidth * 0.02; 
        let ballX = paddleX + (paddleWidth / 2); 
        let ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5; 
        let ballSpeed = canvasDisplayWidth * 0.008; 
        let ballDX = 0;
        let ballDY = -ballSpeed; 
        running = false; 
        paused = true; 
        ballAttachedToPaddle = true;
        gameWon = false; 
        winAnimationStartTime = 0;
        gameElementsVisible = true;
        
        let lastFrameTime = 0;
    
        const brickRowCount = 3; 
        const maxBrickColumnCount = 6; 
        let brickHeight = currentCanvasDisplayHeight * 0.05; 
        const brickPadding = canvasDisplayWidth * 0.01; 
        const sideMargin = canvasDisplayWidth * 0.05; 
        const brickOffsetTop = currentCanvasDisplayHeight * 0.1; 
        
        let bricks = []; 
    
        const brickColors = {
            3: ['#003366', '#001133'], 
            2: ['#0077b6', '#005588'], 
            1: ['#00b4d8', '#0099cc']  
        };
    
        function initBricks() {
            bricks = []; 
            
            const totalWidthForWidestRowContent = canvasDisplayWidth - (2 * sideMargin);
            const totalPaddingInWidestRow = (maxBrickColumnCount - 1) * brickPadding;
            const uniformBrickWidth = (totalWidthForWidestRowContent - totalPaddingInWidestRow) / maxBrickColumnCount;
            
            if (uniformBrickWidth <= 0) {
                console.error("Calculated uniform brick width is non-positive. Adjust canvas size, margins, or padding.");
                return; 
            }
    
            for (let r = 0; r < brickRowCount; r++) {
                bricks[r] = [];
                const currentColumnCount = maxBrickColumnCount - r; 
                
                const totalRowWidth = (currentColumnCount * uniformBrickWidth) + ((currentColumnCount - 1) * brickPadding); 
                
                const rowOffsetLeft = (canvasDisplayWidth - totalRowWidth) / 2;
    
                for (let c = 0; c < currentColumnCount; c++) {
                    const hp = brickRowCount - r; 
                    bricks[r][c] = { 
                        x: rowOffsetLeft + (c * (uniformBrickWidth + brickPadding)),
                        y: (r * (brickHeight + brickPadding)) + brickOffsetTop,
                        width: uniformBrickWidth, 
                        height: brickHeight, 
                        status: 1, 
                        hp: hp 
                    }; 
                }
            }
        }
    
        function drawBricks() {
            for (let r = 0; r < brickRowCount; r++) { 
                for (let c = 0; c < bricks[r].length; c++) { 
                    let b = bricks[r][c];
                    if (b.status === 1) { 
                        const colors = brickColors[b.hp] || brickColors[1]; 
                        
                        const brickGradient = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.height);
                        brickGradient.addColorStop(0, colors[0]); 
                        brickGradient.addColorStop(1, colors[1]); 
                        
                        ctx.fillStyle = brickGradient; 
                        ctx.fillRect(b.x, b.y, b.width, b.height);
    
                        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; 
                        ctx.lineWidth = 1; 
                        ctx.beginPath();
                        ctx.moveTo(b.x + b.width, b.y);
                        ctx.lineTo(b.x + b.width, b.y + b.height);
                        ctx.lineTo(b.x, b.y + b.height);
                        ctx.stroke();
    
                        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; 
                        ctx.beginPath();
                        ctx.moveTo(b.x, b.y + b.height);
                        ctx.lineTo(b.x, b.y);
                        ctx.lineTo(b.x + b.width, b.y);
                        ctx.stroke();
                    }
                }
            }
        }
    
        function drawPaddle() {
            ctx.fillStyle = "white"; 
            ctx.fillRect(paddleX, currentCanvasDisplayHeight - paddleHeight - 2, paddleWidth, paddleHeight);
        }
    
        function drawBall() {
            ctx.beginPath();
            ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "white"; 
            ctx.fill();
            ctx.closePath();
        }
    
        function drawMessage(text, yOffset, fontSize, color, opacity = 1) {
            ctx.globalAlpha = opacity;
            ctx.font = `${fontSize}px Inter`; 
            ctx.fillStyle = color;
            ctx.textAlign = "center";
            ctx.fillText(text, canvasDisplayWidth / 2, currentCanvasDisplayHeight / 2 + yOffset);
            ctx.globalAlpha = 1;
        }
    
        function drawImageMessage(image, yOffset, width, height, opacity = 1) {
            if (image.complete && image.naturalWidth !== 0) {
                ctx.globalAlpha = opacity;
                const x = (canvasDisplayWidth - width) / 2;
                const y = currentCanvasDisplayHeight / 2 + yOffset;
                ctx.drawImage(image, x, y, width, height);
                ctx.globalAlpha = 1;
            }
        }
    
        // Helper function to normalize velocity to maintain constant speed
        function normalizeVelocity(dx, dy, speed) {
            const currentSpeed = Math.sqrt(dx * dx + dy * dy);
            if (currentSpeed === 0) return { dx: 0, dy: -speed }; // Default to moving up
            
            const ratio = speed / currentSpeed;
            return {
                dx: dx * ratio,
                dy: dy * ratio
            };
        }
    
        // Improved collision detection with more precise handling
        function collisionDetection() {
            if (ballAttachedToPaddle) return; 
            
            const nextBallX = ballX + ballDX;
            const nextBallY = ballY + ballDY;
            
            let collisionHappened = false;
            
            // Check for brick collisions
            for (let r = 0; r < brickRowCount && !collisionHappened; r++) { 
                for (let c = 0; c < bricks[r].length && !collisionHappened; c++) { 
                    let b = bricks[r][c];
                    if (b.status === 1) { 
                        // ... collision logic (kept from user's file) ...
                        const closestX = Math.max(b.x, Math.min(ballX, b.x + b.width));
                        const closestY = Math.max(b.y, Math.min(ballY, b.y + b.height));
                        
                        const nextClosestX = Math.max(b.x, Math.min(nextBallX, b.x + b.width));
                        const nextClosestY = Math.max(b.y, Math.min(nextBallY, b.y + b.height));
                        
                        const distanceNow = Math.sqrt((ballX - closestX) ** 2 + (ballY - closestY) ** 2);
                        const distanceNext = Math.sqrt((nextBallX - nextClosestX) ** 2 + (nextBallY - nextClosestY) ** 2);
                        
                        if (distanceNow <= ballRadius || distanceNext <= ballRadius) {
                            collisionHappened = true;
                            
                            const fromLeft = ballX < b.x;
                            const fromRight = ballX > b.x + b.width;
                            const fromTop = ballY < b.y;
                            const fromBottom = ballY > b.y + b.height;
                            
                            if ((fromLeft || fromRight) && ballY + ballRadius > b.y && ballY - ballRadius < b.y + b.height) {
                                ballDX = -ballDX;
                            } else if ((fromTop || fromBottom) && ballX + ballRadius > b.x && ballX - ballRadius < b.x + b.width) {
                                ballDY = -ballDY;
                            } else {
                                ballDX = -ballDX;
                                ballDY = -ballDY;
                            }
                            
                            const normalized = normalizeVelocity(ballDX, ballDY, ballSpeed);
                            ballDX = normalized.dx;
                            ballDY = normalized.dy;
                            
                            b.hp--; 
                            if (b.hp <= 0) {
                                b.status = 0; 
                            }
                            
                            let allBricksHit = true;
                            for(let checkR = 0; checkR < brickRowCount; checkR++) { 
                                for(let checkC = 0; checkC < bricks[checkR].length; checkC++) {
                                    if(bricks[checkR][checkC].status === 1) { 
                                        allBricksHit = false;
                                        break;
                                    }
                                }
                                if(!allBricksHit) break;
                            }
                            
                            if (allBricksHit) {
                                running = false;
                                paused = true; 
                                gameWon = true; 
                                winAnimationStartTime = performance.now(); 
                                gameElementsVisible = false;
                            }
                        }
                    }
                }
            }
        }
    
        function updateGameState(deltaTime) {
            if (paused || gameWon) return;
            
            const timeScale = deltaTime / (1000 / 60); 
            
            if (!ballAttachedToPaddle) {
                ballX += ballDX * timeScale;
                ballY += ballDY * timeScale;
                
                // Wall collisions
                if (ballX - ballRadius < 0) {
                    ballX = ballRadius; 
                    ballDX = -ballDX;
                } else if (ballX + ballRadius > canvasDisplayWidth) {
                    ballX = canvasDisplayWidth - ballRadius; 
                    ballDX = -ballDX;
                }
                
                if (ballY - ballRadius < 0) {
                    ballY = ballRadius; 
                    ballDY = -ballDY;
                }
                
                // Paddle collision
                if (ballY + ballRadius >= currentCanvasDisplayHeight - paddleHeight - 2 && 
                    ballY + ballRadius <= currentCanvasDisplayHeight - paddleHeight + 2 && 
                    ballX >= paddleX && 
                    ballX <= paddleX + paddleWidth) {
                    
                    let hitPoint = (ballX - paddleX) / paddleWidth; 
                    let angle = (hitPoint - 0.5) * Math.PI * 0.7; 
                    
                    ballDX = ballSpeed * Math.sin(angle);
                    ballDY = -ballSpeed * Math.cos(angle); 
                    
                    ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 2;
                }
                
                // Ball falls off the bottom
                if (ballY + ballRadius > currentCanvasDisplayHeight) {
                    ballAttachedToPaddle = true;
                    running = false;
                    paused = true;
                    ballDX = 0;
                    ballDY = -ballSpeed;
                }
                
                collisionDetection();
            }
        }
    
        function draw(timestamp) {
            if (!lastFrameTime) lastFrameTime = timestamp;
            const deltaTime = timestamp - lastFrameTime;
            lastFrameTime = timestamp;
            
            const gradient = ctx.createLinearGradient(0, 0, 0, currentCanvasDisplayHeight);
            gradient.addColorStop(0, '#e1e1e1'); 
            gradient.addColorStop(1, '#c7c7c7'); 
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasDisplayWidth, currentCanvasDisplayHeight); 
    
            updatePaddlePosition();
            
            if (ballAttachedToPaddle) {
                ballX = paddleX + (paddleWidth / 2);
                ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5;
            }
            
            if (!gameWon) {
                updateGameState(deltaTime);
            }
    
            if (gameWon) {
                const now = performance.now();
                const animationProgress = Math.min(1, (now - winAnimationStartTime) / winAnimationDuration);
                
                if (gameElementsVisible) {
                    drawBricks();
                    drawPaddle();
                    drawBall();
                }
                
                if (!gameElementsVisible) {
                    const easedProgress = easeOutBack(animationProgress);
                    const opacity = 1; 
                    const youWinWidth = canvasDisplayWidth * 0.8; 
                    const youWinHeight = youWinWidth * (youWinImage.height / youWinImage.width);
                    const scale = Math.min(1, easedProgress);
                    
                    ctx.save();
                    ctx.translate(canvasDisplayWidth / 2, currentCanvasDisplayHeight / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(-canvasDisplayWidth / 2, -currentCanvasDisplayHeight / 2);
                    
                    drawImageMessage(youWinImage, -youWinHeight / 2, youWinWidth, youWinHeight, opacity);
                    
                    ctx.restore();
                    
                    if (animationProgress > 0.7) {
                        const textOpacity = (animationProgress - 0.7) / 0.3;
                        drawMessage("Press SELECT to restart", youWinHeight / 2 + 20, 12, "white", textOpacity);
                    }
                }
            } else {
                drawBricks();
                drawPaddle();
                drawBall();
            }
            
            animationFrameId = requestAnimationFrame(draw); 
        }
    
        function startGame() {
            if (!running && paused) { 
                initBricks(); 
                ballAttachedToPaddle = true; 
                paddleX = (canvasDisplayWidth - paddleWidth) / 2; 
                ballX = paddleX + (paddleWidth / 2); 
                ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5; 
                ballDX = 0;
                ballDY = -ballSpeed;
                running = false; 
                paused = true; 
                gameWon = false; 
                gameElementsVisible = true;
                lastFrameTime = 0;
                
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(draw);
                }
            }
        }
    
        function launchBall() {
            console.log("launchBall called, gameWon:", gameWon, "ballAttachedToPaddle:", ballAttachedToPaddle, "paused:", paused);
            
            if (gameWon) { 
                startGame(); 
            } else if (ballAttachedToPaddle && paused) { 
                console.log("Launching ball from paddle");
                ballAttachedToPaddle = false; 
                running = true; 
                paused = false; 
                
                ballDX = 0;
                ballDY = -ballSpeed;
    
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(draw);
                }
            }
        }
    
        // Attach game specific event handlers
        document.getElementById('select-button').onclick = launchBall;
        window.gameLaunchBall = launchBall;
        window.startGame = startGame;
    
        initBricks();
        animationFrameId = requestAnimationFrame(draw); 
    }

    function updatePaddlePosition() {
        if (!gameMode || gameWon) return;
        
        const paddleMoveSpeed = 3; 
        
        if (keyState.ArrowLeft) {
            paddleX -= paddleMoveSpeed;
        }
        if (keyState.ArrowRight) {
            paddleX += paddleMoveSpeed;
        }
        
        if (paddleX < 0) paddleX = 0;
        if (paddleX + paddleWidth > canvasDisplayWidth) paddleX = canvasDisplayWidth - paddleWidth;
    }
    
    // --- KEYBOARD INPUT HANDLER (Simplified) ---

    function handleKeyboardInput(event) {
        if (event.type === 'keydown') {
            if (event.key === "Escape" || event.key === "m") { 
                document.getElementById('menu-button').click(); 
                return;
            } else if (gameMode && event.key === " ") { 
                if (typeof window.gameLaunchBall === 'function') window.gameLaunchBall();
                 return;
            }
            
            if (!gameMode) {
                if (event.key === "Enter") {
                    document.getElementById('select-button').click(); 
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    updateSelection(currentIndex - 1);
                } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    updateSelection(currentIndex + 1);
                }
            } else {
                if (event.key === "ArrowLeft") {
                    keyState.ArrowLeft = true;
                    // Move paddle immediately for better responsiveness
                    paddleX -= 8; 
                    if (paddleX < 0) paddleX = 0;
                } else if (event.key === "ArrowRight") {
                    keyState.ArrowRight = true;
                    paddleX += 8; 
                    if (paddleX + paddleWidth > canvasDisplayWidth) 
                        paddleX = canvasDisplayWidth - paddleWidth;
                } else if (event.key === "Enter") {
                    if (typeof window.gameLaunchBall === 'function') window.gameLaunchBall();
                }
            }
        } else if (event.type === 'keyup' && gameMode) {
             if (event.key === "ArrowLeft") {
                keyState.ArrowLeft = false;
            } else if (event.key === "ArrowRight") {
                keyState.ArrowRight = false;
            }
        }
    }
    
    document.addEventListener('keydown', handleKeyboardInput);
    document.addEventListener('keyup', handleKeyboardInput);
    
    // --- INITIALIZATION ---
    
    function loadTheme() {
        // Find the current theme from the body attribute or default to 'light'
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        applyTheme(currentTheme); 
    }
    
    loadTheme();
    
    // Initial state setup
    menuItems[currentIndex].classList.add('active');
    menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
    previewImage.src = menuItems[currentIndex].dataset.preview;
    
    // The main loop is only needed for the game, but a simple draw loop is kept for structure
    (function draw() {
        requestAnimationFrame(draw); 
    })(); 
});
