document.addEventListener('DOMContentLoaded', function() {
    const clickwheel = document.getElementById('clickwheel');
    let menuItems = document.querySelectorAll('.menu-item');
    let previewImage = document.getElementById('preview-image');
    const screenEl = document.getElementById('screen'); // Get the main screen element
    
    let currentIndex = 0;
    let inSubMenu = false;
    let inSettingsMenu = false; // Flag specifically for settings menu
    let inThemeMenu = false; // Flag for theme submenu
    let inGamesMenu = false; // Flag for games submenu
    let gameMode = false; // Flag to indicate if a game is active
    let animationFrameId = null; // To store the requestAnimationFrame ID for the game loop
    
    // --- START OF FIX: New variable to store the last selected main menu item ---
    let lastMainMenuIndex = 0; 
    // --- END OF FIX ---
    
    // Hammer.js instances
    let menuHammerManager = null; // For main menu navigation
    let settingsHammerManager = null; // For settings menu navigation
    let gameHammerManager = null; // For game paddle control
    
    // Variables for menu rotation with Hammer.js
    let lastMenuAngle = 0; // Stores the last angle of the pan gesture for menu navigation
    let lastSettingsAngle = 0; // For settings menu rotation
    
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
    
    /**
     * Helper function to convert menu item NodeList to Array for easier index handling.
     * @returns {Array<HTMLElement>} An array of menu items.
     */
    function getMenuItems() {
        return Array.from(document.querySelectorAll('.menu-item'));
    }
    
    /**
     * Updates the currently selected menu item based on a new index.
     * @param {number} newIndex The index of the item to select.
     */
    function updateSelection(newIndex) {
        menuItems = getMenuItems(); // Re-fetch in case menu structure changed
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
        
        // Update the preview image if on the main menu
        if (!inSubMenu && !gameMode) {
            previewImage.src = menuItems[targetIndex].dataset.preview;
        }
        
        currentIndex = targetIndex;
    }
    
    /**
     * Calculates the angle in degrees from the center of the element to a point (x, y).
     * @param {HTMLElement} element The reference element (e.g., clickwheel).
     * @param {number} x The x-coordinate of the point.
     * @param {number} y The y-coordinate of the point.
     * @returns {number} The angle in degrees (0 to 360).
     */
    function getAngle(element, x, y) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate the angle relative to the center
        const angleRad = Math.atan2(y - centerY, x - centerX);
        let angleDeg = angleRad * (180 / Math.PI);
        
        // Normalize the angle to 0-360, where 0 is right (x-axis)
        // We want 0/360 to be at the top (+y axis, or 90 degrees in standard polar)
        angleDeg = (angleDeg + 90 + 360) % 360; 
        
        return angleDeg;
    }
    
    // --- HAMMER.JS SETUP FOR CLICKWHEEL ---
    
    function initializeHammerManagers() {
        // Only initialize if not already done
        if (!menuHammerManager) {
            menuHammerManager = new Hammer.Manager(clickwheel);
            menuHammerManager.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 5 }));
            
            menuHammerManager.on('panstart', function(ev) {
                if (!gameMode && !inSettingsMenu) {
                    lastMenuAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                } else if (inSettingsMenu) {
                    lastSettingsAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                } else if (gameMode) {
                    // For game mode, we need to track the initial paddle position and angle
                    initialClickwheelAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    initialPaddleX = paddleX;
                }
            });
            
            menuHammerManager.on('panmove', function(ev) {
                if (gameMode) {
                    // Game paddle control via pan movement
                    const currentAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    let angleDiff = currentAngle - initialClickwheelAngle;
    
                    // Normalize angleDiff to be between -180 and 180 for shortest path
                    if (angleDiff > 180) {
                        angleDiff -= 360;
                    } else if (angleDiff < -180) {
                        angleDiff += 360;
                    }
    
                    // Map angle difference (e.g., -90 to +90 degrees) to paddle movement
                    // A full 360 rotation could correspond to a full paddle travel (0 to canvasWidth)
                    // Let's use a scale factor to make it feel responsive
                    const paddleMovementFactor = 1.5; // Adjust this for sensitivity
                    const newPaddleX = initialPaddleX + (angleDiff * paddleMovementFactor);
    
                    // Apply movement, constrained by canvas boundaries
                    if (gameCanvas) {
                        paddleX = Math.max(0, Math.min(newPaddleX, gameCanvas.width - paddleWidth));
                    }
    
                } else if (!inSubMenu && !inSettingsMenu) {
                    // Main menu navigation
                    const currentAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    let angleDiff = currentAngle - lastMenuAngle;
                    
                    if (Math.abs(angleDiff) >= 360 / menuItems.length) { 
                        if (angleDiff > 0) {
                            updateSelection(currentIndex + 1);
                        } else {
                            updateSelection(currentIndex - 1);
                        }
                        lastMenuAngle = currentAngle;
                    }
    
                } else if (inSettingsMenu) {
                    // Settings menu navigation
                    const currentAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                    let angleDiff = currentAngle - lastSettingsAngle;
    
                    // Check if the difference crosses the threshold for a new item
                    const settingsMenuItems = document.querySelectorAll('#settings-menu .menu-item');
                    if (Math.abs(angleDiff) >= 360 / settingsMenuItems.length) { 
                        const settingsCurrentIndex = Array.from(settingsMenuItems).findIndex(item => item.classList.contains('active'));
                        if (angleDiff > 0) {
                            updateSettingsSelection(settingsCurrentIndex + 1);
                        } else {
                            updateSettingsSelection(settingsCurrentIndex - 1);
                        }
                        lastSettingsAngle = currentAngle;
                    }
                }
            });
            
            menuHammerManager.on('panend', function(ev) {
                // Reset last angle on pan end
                lastMenuAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
                lastSettingsAngle = getAngle(clickwheel, ev.center.x, ev.center.y);
            });
        }
    }
    
    // --- THEME & SETTINGS FUNCTIONS (PLACEHOLDER) ---
    
    function showSettingsMenu() {
        inSettingsMenu = true;
        screenEl.classList.add('in-settings');
        // Hide main menu, show settings menu
        document.getElementById('main-menu').style.display = 'none';
        
        let settingsHtml = `
            <div class="header">Settings</div>
            <ul id="settings-menu">
                <li class="menu-item active" data-action="theme">Theme</li>
                <li class="menu-item" data-action="about">About</li>
                <li class="menu-item" data-action="reset">Reset</li>
            </ul>
        `;
        document.getElementById('display').innerHTML = settingsHtml;
        menuItems = document.querySelectorAll('#settings-menu .menu-item');
        currentIndex = 0; // Reset index for the new menu
        updateSettingsSelection(currentIndex); // Initial selection
    }
    
    function updateSettingsSelection(newIndex) {
        const settingsItems = document.querySelectorAll('#settings-menu .menu-item');
        if (settingsItems.length === 0) return;
        
        let targetIndex = newIndex;
        if (targetIndex < 0) {
            targetIndex = settingsItems.length - 1;
        } else if (targetIndex >= settingsItems.length) {
            targetIndex = 0;
        }
        
        settingsItems.forEach(item => item.classList.remove('active'));
        settingsItems[targetIndex].classList.add('active');
        settingsItems[targetIndex].scrollIntoView({ block: 'nearest' });
        currentIndex = targetIndex;
    }
    
    function showThemeMenu() {
        inThemeMenu = true;
        inSettingsMenu = false; // Exit settings view
        // Show theme menu
        let themeHtml = `
            <div class="header">Theme</div>
            <ul id="theme-menu">
                <li class="menu-item active" data-theme="default">Default</li>
                <li class="menu-item" data-theme="dark">Dark</li>
                <li class="menu-item" data-theme="mint">Mint</li>
            </ul>
        `;
        document.getElementById('display').innerHTML = themeHtml;
        menuItems = document.querySelectorAll('#theme-menu .menu-item');
        currentIndex = 0;
        updateSelection(currentIndex); // Use regular updateSelection for themes too
    }
    
    function applyTheme(themeName) {
        document.body.className = '';
        document.body.classList.add(`theme-${themeName}`);
        localStorage.setItem('ipodTheme', themeName); // Save preference
    }
    
    function loadTheme() {
        const savedTheme = localStorage.getItem('ipodTheme') || 'default';
        applyTheme(savedTheme);
    }
    
    // --- GAME FUNCTIONS (Breakout Game) ---
    
    function startBreakoutGame() {
        gameMode = true;
        screenEl.classList.add('in-game');
        document.getElementById('display').style.display = 'none'; // Hide menu
        document.getElementById('right-display').style.display = 'none'; // Hide preview
        
        // Setup canvas (create it if it doesn't exist)
        gameCanvas = document.getElementById('game-canvas');
        if (!gameCanvas) {
            gameCanvas = document.createElement('canvas');
            gameCanvas.id = 'game-canvas';
            screenEl.appendChild(gameCanvas);
        }
        
        gameContext = gameCanvas.getContext('2d');
        
        // Set up dimensions and initial state
        const screenRect = screenEl.getBoundingClientRect();
        // Set canvas to the screen dimensions (using full screen for game for simplicity)
        gameCanvas.width = screenRect.width * 0.9; 
        gameCanvas.height = screenRect.height * 0.9;
        canvasDisplayWidth = gameCanvas.width;
        
        // Game parameters
        paddleWidth = gameCanvas.width * 0.2;
        paddleX = (gameCanvas.width - paddleWidth) / 2;
        paddleSpeed = gameCanvas.width * 0.01; // 1% of canvas width per tick
        
        radius = gameCanvas.width * 0.02; // Ball radius
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
        
        // Initialize bricks
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
        
        // Start the game loop
        gameLoop(); 
    }
    
    function stopBreakoutGame() {
        // Stop the game loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        gameMode = false;
        running = false;
        paused = true;
        
        screenEl.classList.remove('in-game');
        
        // Remove canvas
        if (gameCanvas) {
            gameCanvas.remove();
            gameCanvas = null;
            gameContext = null;
        }
        
        // Restore menu elements
        document.getElementById('display').style.display = 'block';
        document.getElementById('right-display').style.display = 'block';
        
        // --- START OF FIX: Restore the selection after returning to main menu ---
        menuItems = getMenuItems();
        updateSelection(lastMainMenuIndex); 
        // --- END OF FIX ---
    }
    
    function gameLoop() {
        if (!running || paused || !gameContext) {
            animationFrameId = null;
            return;
        }
        
        drawGame();
        
        // Game logic updates
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        // Ball collision detection with walls
        if (ballX + ballSpeedX > gameCanvas.width - radius || ballX + ballSpeedX < radius) {
            ballSpeedX = -ballSpeedX;
        }
        if (ballY + ballSpeedY < radius) {
            ballSpeedY = -ballSpeedY;
        } else if (ballY + ballSpeedY > gameCanvas.height - radius - 10) { // Near paddle area
            // Paddle collision logic
            if (ballX > paddleX && ballX < paddleX + paddleWidth) {
                ballSpeedY = -ballSpeedY;
                // Add spin based on where it hit the paddle
                let hitPoint = (ballX - paddleX) / paddleWidth; // 0 to 1
                ballSpeedX = (hitPoint - 0.5) * 2 * (gameCanvas.width * 0.006); // More spin on edges
            } else if (ballY + ballSpeedY > gameCanvas.height - radius) {
                // Game Over
                alert("GAME OVER! Score: " + score);
                stopBreakoutGame();
                return;
            }
        }
        
        // Brick collision detection
        collisionDetection();
        
        // Win condition
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
                    // Calculate brick position
                    b.x = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                    b.y = (r * (brickHeight + brickPadding)) + brickOffsetTop;
    
                    if (ballX > b.x && ballX < b.x + brickWidth && ballY > b.y && ballY < b.y + brickHeight) {
                        ballSpeedY = -ballSpeedY; // Reverse vertical direction
                        b.status = 0; // Destroy the brick
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
    
    // Menu button (Top button on Clickwheel)
    document.getElementById('menu-button').addEventListener('click', function() {
        // Go back/Exit logic
        if (gameMode) {
            stopBreakoutGame();
            // Selection is restored inside stopBreakoutGame
        } else if (inThemeMenu) {
            inThemeMenu = false;
            // Revert to Settings menu
            showSettingsMenu();
            // Find the 'Theme' item index in the settings menu and select it
            const settingsItems = document.querySelectorAll('#settings-menu .menu-item');
            const themeIndex = Array.from(settingsItems).findIndex(item => item.textContent.trim() === 'Theme');
            updateSettingsSelection(themeIndex !== -1 ? themeIndex : 0);
        } else if (inSettingsMenu) {
            inSettingsMenu = false;
            screenEl.classList.remove('in-settings');
            // Restore main menu structure
            let mainHtml = `
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
            
            // --- START OF FIX: Restore the selection after returning to main menu ---
            updateSelection(lastMainMenuIndex); 
            // --- END OF FIX ---
        }
    });
    
    // Center button (Select)
    document.getElementById('center-button').addEventListener('click', function() {
        if (!gameMode) {
            menuItems = getMenuItems(); // Ensure we have the current list
            const selectedText = menuItems[currentIndex].textContent.trim();
            const selectedItem = menuItems[currentIndex];
            
            // --- START OF FIX: Save the current index before navigating away ---
            if (!inSettingsMenu && !inThemeMenu) {
                lastMainMenuIndex = currentIndex;
            }
            // --- END OF FIX ---
            
            if (inThemeMenu) {
                // Apply theme logic
                const themeName = selectedItem.dataset.theme;
                applyTheme(themeName);
                // After applying, stay in the theme menu or go back? (Staying is simpler)
            } else if (inSettingsMenu) {
                // Handle settings selection
                if (selectedText === "Theme") {
                    showThemeMenu();
                } else if (selectedText === "About") {
                    // Placeholder for about screen
                    alert("iMon - Created by Monica. Version 1.0");
                } else if (selectedText === "Reset") {
                    // Placeholder for reset/clear local storage
                    if (confirm("Are you sure you want to reset the theme?")) {
                        localStorage.removeItem('ipodTheme');
                        loadTheme(); // Load default
                        alert("Theme reset to Default.");
                    }
                }
            } else { 
                // Main menu selection
                const links = {
                    "LinkedIn": "https://www.linkedin.com/in/monica-gottardi/",
                    "CV": "CV_MonicaGottardi.pdf", // Assuming this is the CV file path
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
                gameLoop(); // Resume loop if unpaused
            }
            alert(paused ? "Game Paused" : "Game Resumed");
        }
    });
    
    // Play/Pause button (Bottom button on Clickwheel)
    document.getElementById('play-pause-button').addEventListener('click', function() {
        if (gameMode) {
            paused = !paused;
            if (running && !paused) {
                gameLoop(); // Resume loop if unpaused
            }
            alert(paused ? "Game Paused" : "Game Resumed");
        } else {
            // Non-game logic (e.g., music play/pause)
            // Placeholder: Could be used for 'About' or a quick action
        }
    });
    
    // Forward/Back buttons (Left/Right buttons on Clickwheel) - Used for game control
    document.getElementById('forward-button').addEventListener('click', function() {
        if (gameMode && !paused && gameCanvas) {
            // Move paddle right
            paddleX = Math.min(paddleX + paddleSpeed * 5, gameCanvas.width - paddleWidth);
        } else if (!gameMode) {
            // Menu navigation (Right)
            if (!inSubMenu && !inSettingsMenu) {
                updateSelection(currentIndex + 1);
            }
            // Add submenu navigation logic here if needed
        }
    });
    
    document.getElementById('back-button').addEventListener('click', function() {
        if (gameMode && !paused) {
            // Move paddle left
            paddleX = Math.max(0, paddleX - paddleSpeed * 5);
        } else if (!gameMode) {
            // Menu navigation (Left)
            if (!inSubMenu && !inSettingsMenu) {
                updateSelection(currentIndex - 1);
            }
            // Add submenu navigation logic here if needed
        }
    });
    
    // --- KEYBOARD INPUT HANDLER (For desktop/quick testing) ---
    
    function handleKeyboardInput(event) {
        if (event.type === 'keydown') {
            if (event.key === "Escape" || event.key === "m") { // 'm' for Menu
                document.getElementById('menu-button').click(); // Simulate menu button click
                return;
            } else if (gameMode && event.key === " ") { // Spacebar for Pause in game
                 document.getElementById('play-pause-button').click();
                 return;
            }
            
            if (!gameMode) {
                if (event.key === "Enter") {
                    // Handle selection
                    document.getElementById('center-button').click(); // Simulate center button click
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    // Navigate menu up
                    updateSelection(currentIndex - 1);
                } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    // Navigate menu down
                    updateSelection(currentIndex + 1);
                }
            } else {
                // Game controls via arrow keys
                if (event.key === "ArrowLeft") {
                    document.getElementById('back-button').click();
                } else if (event.key === "ArrowRight") {
                    document.getElementById('forward-button').click();
                }
            }
        }
    }
    
    // Attach keyboard listeners to the document
    document.addEventListener('keydown', handleKeyboardInput);
    
    // --- INITIALIZATION ---
    
    // Load saved theme preference
    loadTheme();
    
    // Initialize Hammer.js for clickwheel interaction
    initializeHammerManagers();
    
    // Initial state setup
    menuItems[currentIndex].classList.add('active');
    menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
    previewImage.src = menuItems[currentIndex].dataset.preview;
    
    // Initial call to draw, which will then self-loop if running/paused
    function draw() {
        // This is an empty function since we're not using it directly
        // The actual drawing happens in the game's draw function
    }
    
    animationFrameId = requestAnimationFrame(draw); 
});
