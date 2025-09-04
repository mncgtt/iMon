document.addEventListener('DOMContentLoaded', function() {
    const clickwheel = document.getElementById('clickwheel');
    let menuItems = document.querySelectorAll('.menu-item');
    let previewImage = document.getElementById('preview-image');
    const screenEl = document.getElementById('screen'); // Get the main screen element
    
    let currentIndex = 0;
    let inSubMenu = false;
    let inSettingsMenu = false; // Flag specifically for settings menu
    let inThemeMenu = false; // Flag for theme submenu
    let gameMode = false; // Flag to indicate if a game is active
    let animationFrameId = null; // To store the requestAnimationFrame ID for the game loop
    
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
    let ballAttachedToPaddle = true; 
    
    // Game state flags for win/lose
    let gameWon = false;
    let winAnimationStartTime = 0; // For win animation timing
    let winAnimationDuration = 1000; // Animation duration in milliseconds (adjusted to be slower)
    let gameElementsVisible = true; // Flag to control game elements visibility
    
    // Track key states for smoother movement
    const keyState = {
        ArrowLeft: false,
        ArrowRight: false
    };
    
    // Image object for "YOU WIN" message (PNG)
    const youWinImage = new Image();
    youWinImage.src = 'images/you_win.png'; 
    
    // Optional: Preload images (good practice, especially for larger images)
    let imagesLoadedCount = 0;
    const totalImagesToLoad = 1; 
    const onImageLoad = () => {
        imagesLoadedCount++;
        if (imagesLoadedCount === totalImagesToLoad) {
            console.log("All win message images loaded.");
        }
    };
    youWinImage.onload = onImageLoad;
    
    const links = {
        "LinkedIn": "https://www.linkedin.com/in/monicagottardi",
        "Behance": "https://www.behance.net/monicagottardi",
        "Mail": "mailto:monicagottardi@outlook.com"
    };
    
    // Initialize active menu item
    menuItems.forEach((item, index) => {
        if (item.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    // Function to update menu selection without animation
    function updateSelection(newIndex) {
        if (newIndex < 0 || newIndex >= menuItems.length) return;
        
        menuItems[currentIndex].classList.remove('active');
        currentIndex = newIndex;
        menuItems[currentIndex].classList.add('active');
        menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
        
        // Update preview image immediately without animation
        const previewSrc = menuItems[currentIndex].dataset.preview;
        if (previewSrc) {
            previewImage.src = previewSrc;
        }
    }
    
    // --- Main Menu Hammer.js Navigation Functions ---
    function onMenuPanStart(e) {
        if (gameMode || inSubMenu) return; // Disable if in game or sub-menu
        lastMenuAngle = e.angle; // Store initial angle of the pan gesture
        console.log("Menu Pan Start. Initial Angle:", lastMenuAngle);
    }
    
    function onMenuPanMove(e) {
        if (gameMode || inSubMenu) return; // Disable if in game or sub-menu
    
        const currentPanAngle = e.angle;
        let angleDiff = currentPanAngle - lastMenuAngle;
    
        // Normalize angleDiff to handle 360-degree wrap-around
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
    
        const rotationThreshold = 15; // Reduced from 30 to 15 degrees for faster response
    
        if (angleDiff > rotationThreshold) {
            updateSelection(currentIndex + 1);
            lastMenuAngle = currentPanAngle; // Reset last angle after selection change
            console.log("Menu moved right. New Index:", currentIndex);
        } else if (angleDiff < -rotationThreshold) {
            updateSelection(currentIndex - 1);
            lastMenuAngle = currentPanAngle; // Reset last angle after selection change
            console.log("Menu moved left. New Index:", currentIndex);
        }
    }
    
    function onMenuPanEnd(e) {
        // No specific action needed on pan end for menu
        console.log("Menu Pan End.");
    }
    
    // --- Settings Menu Hammer.js Navigation Functions ---
    function onSettingsPanStart(e) {
        if (!inSettingsMenu && !inThemeMenu) return; // Only active in settings or theme menu
        lastSettingsAngle = e.angle;
        console.log("Settings Pan Start. Initial Angle:", lastSettingsAngle);
    }
    
    function onSettingsPanMove(e) {
        if (!inSettingsMenu && !inThemeMenu) return; // Only active in settings or theme menu
        
        const currentPanAngle = e.angle;
        let angleDiff = currentPanAngle - lastSettingsAngle;
        
        // Normalize angleDiff to handle 360-degree wrap-around
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        
        const rotationThreshold = 15; // Same threshold as main menu for consistency
        
        const themeItems = document.querySelectorAll('.menu-item[data-theme], .menu-item[data-setting]');
        if (themeItems.length === 0) return;
        
        // Find current active theme index
        let themeIndex = 0;
        themeItems.forEach((item, index) => {
            if (item.classList.contains('active')) {
                themeIndex = index;
            }
        });
        
        if (angleDiff > rotationThreshold) {
            // Move down in the list (next theme)
            if (themeIndex < themeItems.length - 1) {
                themeItems[themeIndex].classList.remove('active');
                themeIndex++;
                themeItems[themeIndex].classList.add('active');
                themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
                
                // Update preview image if in theme menu
                if (inThemeMenu) {
                    const previewImage = document.getElementById('preview-image');
                    if (previewImage && themeItems[themeIndex].dataset.preview) {
                        previewImage.src = themeItems[themeIndex].dataset.preview;
                    }
                }
                
                lastSettingsAngle = currentPanAngle;
                console.log("Settings moved right. New Index:", themeIndex);
            }
        } else if (angleDiff < -rotationThreshold) {
            // Move up in the list (previous theme)
            if (themeIndex > 0) {
                themeItems[themeIndex].classList.remove('active');
                themeIndex--;
                themeItems[themeIndex].classList.add('active');
                themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
                
                // Update preview image if in theme menu
                if (inThemeMenu) {
                    const previewImage = document.getElementById('preview-image');
                    if (previewImage && themeItems[themeIndex].dataset.preview) {
                        previewImage.src = themeItems[themeIndex].dataset.preview;
                    }
                }
                
                lastSettingsAngle = currentPanAngle;
                console.log("Settings moved left. New Index:", themeIndex);
            }
        }
    }
    
    function onSettingsPanEnd(e) {
        // No specific action needed on pan end for settings
        console.log("Settings Pan End.");
    }
    
    // --- Game Paddle Hammer.js Functions ---
    function onPanStart(e) { // This is for game paddle
        if (gameMode) { 
            const rect = clickwheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            initialClickwheelAngle = Math.atan2(e.center.y - centerY, e.center.x - centerX);
            initialPaddleX = paddleX; 
        }
    }
    
    function onPanMove(e) { // This is for game paddle
        if (gameMode) { 
            const rect = clickwheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const currentClickwheelAngle = Math.atan2(e.center.y - centerY, e.center.x - centerX);
            
            let angleDelta = currentClickwheelAngle - initialClickwheelAngle;
            
            if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
            if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
    
            // Increase sensitivity for better control
            const sensitivity = 200; // Increased from 150
            let newPaddleX = initialPaddleX + (angleDelta * sensitivity);
            
            const minPaddleX = 0;
            const maxPaddleX = canvasDisplayWidth - paddleWidth;
    
            if (newPaddleX < minPaddleX) {
                newPaddleX = minPaddleX;
            } else if (newPaddleX > maxPaddleX) {
                newPaddleX = maxPaddleX;
            }
            
            // Update paddle position immediately
            paddleX = newPaddleX;
            
            // Reset initial values more frequently for smoother control
            if (Math.abs(angleDelta) > Math.PI / 4) {
                initialClickwheelAngle = currentClickwheelAngle;
                initialPaddleX = paddleX;
            }
        }
    }
    
    function onPanEnd(e) { // This is for game paddle
        // No specific action needed on pan end
    }
    
    // Initialize Hammer.js for main menu navigation
    menuHammerManager = new Hammer.Manager(clickwheel);
    menuHammerManager.add(new Hammer.Pan({ threshold: 10 })); // Small threshold to start pan
    menuHammerManager.on('panstart', onMenuPanStart);
    menuHammerManager.on('panmove', onMenuPanMove);
    menuHammerManager.on('panend', onMenuPanEnd);
    console.log("Menu Hammer.js manager initialized.");
    
    // Initialize Hammer.js for settings menu navigation
    settingsHammerManager = new Hammer.Manager(clickwheel);
    settingsHammerManager.add(new Hammer.Pan({ threshold: 10 }));
    settingsHammerManager.on('panstart', onSettingsPanStart);
    settingsHammerManager.on('panmove', onSettingsPanMove);
    settingsHammerManager.on('panend', onSettingsPanEnd);
    settingsHammerManager.set({ enable: false }); // Disabled by default
    console.log("Settings Hammer.js manager initialized.");
    
    // Main clickwheel button handler
    clickwheel.addEventListener('click', function(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
    
        // Handle settings menu separately
        if (inSettingsMenu) {
            handleSettingsMenuAction(action);
            return;
        }
        
        // Handle theme menu separately
        if (inThemeMenu) {
            handleThemeMenuAction(action);
            return;
        }
    
        // NEW: Unified handling for 'select' action
        if (action === 'select') {
            if (gameMode) {
                launchBall(); // In game mode, select launches ball/restarts game
            } else {
                // In menu mode, select performs menu action
                const selectedText = menuItems[currentIndex].textContent.trim();
                if (links[selectedText]) {
                    if (selectedText === "Mail") {
                        window.location.href = links[selectedText];
                    } else {
                        window.open(links[selectedText], '_blank');
                    }
                } else {
                    if (selectedText === "Games") {
                        // Create a canvas element without animation
                        screenEl.innerHTML = `<canvas id="breakout-game" style="background:black; display:block; margin:auto; width:100%; height:100%;"></canvas>`;
                        
                        // Initialize game immediately
                        const screenRect = screenEl.getBoundingClientRect();
                        initBreakoutGame(screenRect.width, screenRect.height);
                        
                        gameMode = true;
                        inSubMenu = true;
                        console.log("gameMode set to true.");
                        
                        // Initialize Hammer.js for game paddle control
                        if (!gameHammerManager) {
                            console.log("Initializing Hammer.js manager for circular pan (game)..");
                            gameHammerManager = new Hammer.Manager(clickwheel);
                            gameHammerManager.add(new Hammer.Pan({ threshold: 0 })); 
                            gameHammerManager.on('panstart', onPanStart);
                            gameHammerManager.on('panmove', onPanMove);
                            gameHammerManager.on('panend', onPanEnd);
                            console.log("Game Hammer.js manager initialized and listeners added.");
                        } else {
                            console.log("Game Hammer.js manager already initialized.");
                        }
                        // Disable menu Hammer.js when game starts
                        menuHammerManager.set({ enable: false });
                        // Enable game Hammer.js
                        gameHammerManager.set({ enable: true });
                    } else if (selectedText === "Settings") {
                        showSettingsMenu();
                    } else {
                        // For other menu items, create the "Opening..." screen without animation
                        screenEl.innerHTML = `
                            <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; background:white;">
                                <div style="text-align:center; width:100%; color:#000;">
                                    <h3 style="font-size:3mm;">${selectedText}</h3>
                                    <p style="font-size:2mm;">Opening...</p>
                                </div>
                            </div>
                        `;
                        
                        inSubMenu = true;
                    }
                }
            }
            return; // Handled select action, exit
        }
    
        // Handle other buttons (menu, forward, back, play/pause)
        if (gameMode) { // If in game mode, only 'menu' is handled here
            if (action === 'menu') {
                exitGame(); 
            }
            return; // All other buttons are ignored in game mode
        }
    
        // Normal menu navigation for non-select buttons
        switch(action) {
            case 'menu':
                if (inSubMenu) {
                    restoreMenu(); 
                }
                break;
            case 'forward':
                updateSelection(currentIndex + 1);
                break;
            case 'back':
                updateSelection(currentIndex - 1);
                break;
            case 'playpause':
                console.log('Play/Pause button clicked');
                break;
        }
    });
    
    // Function to handle settings menu actions
    function handleSettingsMenuAction(action) {
        const settingItems = document.querySelectorAll('.menu-item[data-setting]');
        let settingIndex = 0;
        
        // Find current active setting
        settingItems.forEach((item, index) => {
            if (item.classList.contains('active')) {
                settingIndex = index;
            }
        });
        
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
            case 'forward':
                if (settingIndex < settingItems.length - 1) {
                    settingItems[settingIndex].classList.remove('active');
                    settingIndex++;
                    settingItems[settingIndex].classList.add('active');
                    settingItems[settingIndex].scrollIntoView({ block: 'nearest' });
                }
                break;
            case 'back':
                if (settingIndex > 0) {
                    settingItems[settingIndex].classList.remove('active');
                    settingIndex--;
                    settingItems[settingIndex].classList.add('active');
                    settingItems[settingIndex].scrollIntoView({ block: 'nearest' });
                }
                break;
        }
    }
    
    function handleThemeMenuAction(action) {
        const themeItems = document.querySelectorAll('.menu-item[data-theme]');
        let themeIndex = Array.from(themeItems).findIndex(item => item.classList.contains('active'));
        const previewImage = document.getElementById('preview-image');
        
        switch(action) {
            case 'select':
                const selectedTheme = themeItems[themeIndex].dataset.theme;
                applyTheme(selectedTheme);
                break;
            case 'menu':
                showSettingsMenu(); // Go back to settings menu
                break;
            case 'forward':
                if (themeIndex < themeItems.length - 1) {
                    themeItems[themeIndex].classList.remove('active');
                    themeIndex++;
                    themeItems[themeIndex].classList.add('active');
                    themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
                    
                    // Update the preview image immediately
                    if (previewImage && themeItems[themeIndex].dataset.preview) {
                        previewImage.src = themeItems[themeIndex].dataset.preview;
                    }
                }
                break;
            case 'back':
                if (themeIndex > 0) {
                    themeItems[themeIndex].classList.remove('active');
                    themeIndex--;
                    themeItems[themeIndex].classList.add('active');
                    themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
                    
                    // Update the preview image immediately
                    if (previewImage && themeItems[themeIndex].dataset.preview) {
                        previewImage.src = themeItems[themeIndex].dataset.preview;
                    }
                }
                break;
        }
    }
    
    // Initial state setup
    menuItems[currentIndex].classList.add('active');
    menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
    previewImage.src = menuItems[currentIndex].dataset.preview;
    
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
        
        // Manage Hammer.js managers
        menuHammerManager.set({ enable: true });
        settingsHammerManager.set({ enable: false });
        if (gameHammerManager) {
            gameHammerManager.set({ enable: false });
        }
        
        // Reset flags immediately
        inSubMenu = false;
        inSettingsMenu = false;
        inThemeMenu = false;
        
        // Store the current preview image path before rebuilding the menu
        const currentPreviewPath = menuItems[currentIndex].dataset.preview;
        
        // Create menu HTML without animation class
        const menuHTML = `
            <div id="display">
                <div id="menu-title">iPod</div>
                <div id="menu-container">
                    <ul id="menu-list">
                        <li class="menu-item ${currentIndex === 0 ? 'active' : ''}" data-preview="images/linkedin-preview.png">LinkedIn</li>
                        <li class="menu-item ${currentIndex === 1 ? 'active' : ''}" data-preview="images/behance-preview.png">Behance</li>
                        <li class="menu-item ${currentIndex === 2 ? 'active' : ''}" data-preview="images/mail-preview.png">Mail</li>
                        <li class="menu-item ${currentIndex === 3 ? 'active' : ''}" data-preview="images/games-preview.png">Games</li>
                        <li class="menu-item ${currentIndex === 4 ? 'active' : ''}" data-preview="images/settings-preview.png">Settings</li>
                    </ul>
                </div>
            </div>
            <div id="right-display">
                <img src="${currentPreviewPath}" alt="Preview" class="display-icon" id="preview-image">
            </div>
        `;
        
        // Replace screen content immediately
        screenEl.innerHTML = menuHTML;
        
        // Reinitialize menu items and event listeners
        menuItems = document.querySelectorAll('.menu-item');
        previewImage = document.getElementById('preview-image');
        
        // Make sure the active item is visible
        menuItems[currentIndex].classList.add('active');
        menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
    }
    
    // Function to show the Settings menu without animation
    function showSettingsMenu() {
        inSubMenu = true;
        inSettingsMenu = true;
        inThemeMenu = false;
        
        // Disable main menu Hammer.js and enable settings Hammer.js
        menuHammerManager.set({ enable: false });
        settingsHammerManager.set({ enable: true });
        
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
    }
    
    // Function to show the Theme menu without animation
    function showThemeMenu() {
        inSubMenu = true;
        inSettingsMenu = false;
        inThemeMenu = true;
        
        // Keep settings Hammer.js enabled for theme navigation
        
        // Find current theme
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        
        // Define preview images for each theme
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
        
        // Update preview image when selection changes
        const themeItems = document.querySelectorAll('.menu-item[data-theme]');
        let themeIndex = Array.from(themeItems).findIndex(item => item.classList.contains('active'));
        const previewImage = document.getElementById('preview-image');
        
        function updateThemeSelection(newIndex) {
            if (newIndex < 0 || newIndex >= themeItems.length) return;
            themeItems[themeIndex].classList.remove('active');
            themeIndex = newIndex;
            themeItems[themeIndex].classList.add('active');
            themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
            
            // Update preview image immediately
            const previewSrc = themeItems[themeIndex].dataset.preview;
            if (previewSrc && previewImage) {
                previewImage.src = previewSrc;
            }
        }
        
        // Store for use in clickwheel navigation
        window.updateThemeSelection = updateThemeSelection;
    }
    
    // Function to apply the selected theme with animation
    function applyTheme(theme) {
        // Remove any existing theme
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-mint');
        
        // Store the selected theme
        document.body.setAttribute('data-theme', theme);
        
        // Apply the new theme class
        document.body.classList.add('theme-' + theme);
        
        // Update iPod appearance based on theme with animation
        const ipodContainer = document.querySelector('.ipod-container');
        ipodContainer.style.transition = 'background 0.5s ease';
        
        if (theme === 'light') {
            ipodContainer.style.background = 'linear-gradient(145deg, #e6e6e6, #cccccc)';
        } else if (theme === 'dark') {
            ipodContainer.style.background = 'linear-gradient(145deg, #333333, #222222)';
        } else if (theme === 'mint') {
            ipodContainer.style.background = 'linear-gradient(145deg, #98CFD1, #7ABFC1)';
        }
        
        // Show a brief flash effect to indicate theme change
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
        
        // Fade out the flash effect
        setTimeout(() => {
            flashElement.style.opacity = '0';
            setTimeout(() => {
                flashElement.remove();
            }, 300);
        }, 100);
        
        // No need to change flags or return to main menu
        // We stay in the theme menu
    }
    
    // Function to start the Breakout game (initial setup when 'Games' is selected)
    function startBreakoutGame() {
        console.log("Starting Breakout Game...");
        // Use a Promise to ensure images are loaded before proceeding
        allGameImagesLoadedPromise = new Promise((resolve) => {
            let loadedCount = 0;
            const imagesToLoad = [youWinImage]; 
    
            if (imagesToLoad.length === 0) {
                resolve();
                return;
            }
    
            imagesToLoad.forEach(img => {
                if (img.complete && img.naturalWidth !== 0) {
                    loadedCount++;
                } else {
                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === imagesToLoad.length) {
                            resolve();
                        }
                    };
                    img.onerror = () => {
                        console.error("Failed to load image:", img.src);
                        loadedCount++; 
                        if (loadedCount === imagesToLoad.length) {
                            resolve();
                        }
                    };
                }
            });
    
            if (loadedCount === imagesToLoad.length) { 
                resolve();
            }
        });
    
        allGameImagesLoadedPromise.then(() => {
            console.log("All game images confirmed loaded. Proceeding with game setup.");
            
            screenEl.innerHTML = `
                <canvas id="breakout-game" style="background:black; display:block; margin:auto; width:100%; height:100%;"></canvas>
            `;
            const screenRect = screenEl.getBoundingClientRect();
            initBreakoutGame(screenRect.width, screenRect.height);
            gameMode = true; 
            console.log("gameMode set to true.");
    
            // Initialize Hammer.js for game paddle control
            if (!gameHammerManager) {
                console.log("Initializing Hammer.js manager for circular pan (game)..");
                gameHammerManager = new Hammer.Manager(clickwheel);
                gameHammerManager.add(new Hammer.Pan({ threshold: 0 })); 
                gameHammerManager.on('panstart', onPanStart);
                gameHammerManager.on('panmove', onPanMove);
                gameHammerManager.on('panend', onPanEnd);
                console.log("Game Hammer.js manager initialized and listeners added.");
            } else {
                console.log("Game Hammer.js manager already initialized.");
            }
            // Disable menu Hammer.js when game starts
            menuHammerManager.set({ enable: false });
            // Enable game Hammer.js
            gameHammerManager.set({ enable: true });
        });
    }
    
    // Function to exit the game without animation
    function exitGame() {
        console.log("Exiting game...");
        gameMode = false; 
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); 
            animationFrameId = null;
        }
        // Enable menu Hammer.js when exiting game
        if (menuHammerManager) {
            menuHammerManager.set({ enable: true });
        }
        // Disable game Hammer.js
        if (gameHammerManager) {
            gameHammerManager.set({ enable: false });
        }
        restoreMenu(); 
    }
    
    // Function to update paddle position based on key states
    function updatePaddlePosition() {
        if (!gameMode || gameWon) return;
        
        const paddleMoveSpeed = 3; // Increased speed for better control
        
        if (keyState.ArrowLeft) {
            paddleX -= paddleMoveSpeed;
        }
        if (keyState.ArrowRight) {
            paddleX += paddleMoveSpeed;
        }
        
        // Clamp paddle within canvas bounds
        if (paddleX < 0) paddleX = 0;
        if (paddleX + paddleWidth > canvasDisplayWidth) paddleX = canvasDisplayWidth - paddleWidth;
    }
    
    // Helper function for animation easing
    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
    // Breakout Game Logic
    function initBreakoutGame(currentCanvasDisplayWidth, currentCanvasDisplayHeight) { 
        console.log("initBreakoutGame called.");
        const canvas = document.getElementById('breakout-game');
        const ctx = canvas.getContext('2d');
    
        canvasDisplayWidth = currentCanvasDisplayWidth; 
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasDisplayWidth * dpr;
        canvas.height = currentCanvasDisplayHeight * dpr; 
        ctx.scale(dpr, dpr);
    
        paddleWidth = canvasDisplayWidth * 0.18; 
        let paddleHeight = currentCanvasDisplayHeight * 0.03; 
        paddleX = (canvasDisplayWidth - paddleWidth) / 2; 
        let ballRadius = canvasDisplayWidth * 0.02; 
        let ballX = paddleX + (paddleWidth / 2); 
        let ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5; 
        let ballSpeed = canvasDisplayWidth * 0.008; // Increased from 0.005 to 0.008 for faster ball
        let ballDX = 0; // CHANGED: Start with 0 horizontal velocity for vertical launch
        let ballDY = -ballSpeed; 
        running = false; 
        paused = true; 
        ballAttachedToPaddle = true; // FIX: Ensure ball is attached to paddle when game initializes
        gameWon = false; 
        winAnimationStartTime = 0;
        gameElementsVisible = true;
    
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
    
        function collisionDetection() {
            // Calculate the next position of the ball
            const nextBallX = ballX + ballDX;
            const nextBallY = ballY + ballDY;
            
            // Track if collision happened to avoid multiple collisions in one frame
            let collisionHappened = false;
            
            // Check for brick collisions
            for (let r = 0; r < brickRowCount && !collisionHappened; r++) { 
                for (let c = 0; c < bricks[r].length && !collisionHappened; c++) { 
                    let b = bricks[r][c];
                    if (b.status === 1) { 
                        // Expanded collision box to catch fast-moving balls
                        // Check if the ball's path intersects with the brick
                        
                        // Calculate the closest point on the brick to the ball's current position
                        const closestX = Math.max(b.x, Math.min(ballX, b.x + b.width));
                        const closestY = Math.max(b.y, Math.min(ballY, b.y + b.height));
                        
                        // Calculate the closest point on the brick to the ball's next position
                        const nextClosestX = Math.max(b.x, Math.min(nextBallX, b.x + b.width));
                        const nextClosestY = Math.max(b.y, Math.min(nextBallY, b.y + b.height));
                        
                        // Check if either the current or next position is inside the brick
                        const distanceNow = Math.sqrt((ballX - closestX) ** 2 + (ballY - closestY) ** 2);
                        const distanceNext = Math.sqrt((nextBallX - nextClosestX) ** 2 + (nextBallY - nextClosestY) ** 2);
                        
                        if (distanceNow <= ballRadius || distanceNext <= ballRadius) {
                            collisionHappened = true;
                            
                            // Determine which side of the brick was hit
                            // This helps with proper bounce direction
                            const fromLeft = ballX < b.x;
                            const fromRight = ballX > b.x + b.width;
                            const fromTop = ballY < b.y;
                            const fromBottom = ballY > b.y + b.height;
                            
                            // Horizontal collision (left or right side)
                            if ((fromLeft || fromRight) && 
                                ballY + ballRadius > b.y && 
                                ballY - ballRadius < b.y + b.height) {
                                ballDX = -ballDX;
                            } 
                            // Vertical collision (top or bottom)
                            else if ((fromTop || fromBottom) && 
                                    ballX + ballRadius > b.x && 
                                    ballX - ballRadius < b.x + b.width) {
                                ballDY = -ballDY;
                            }
                            // Corner collision
                            else {
                                ballDX = -ballDX;
                                ballDY = -ballDY;
                            }
                            
                            // Normalize velocity to maintain constant speed
                            const normalized = normalizeVelocity(ballDX, ballDY, ballSpeed);
                            ballDX = normalized.dx;
                            ballDY = normalized.dy;
                            
                            // Reduce brick HP
                            b.hp--; 
                            if (b.hp <= 0) {
                                b.status = 0; 
                            }
                            
                            // Check if all bricks are destroyed
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
                                winAnimationStartTime = performance.now(); // Start win animation timer
                                // Immediately hide game elements
                                gameElementsVisible = false;
                            }
                        }
                    }
                }
            }
        }
    
        function draw() {
            const gradient = ctx.createLinearGradient(0, 0, 0, currentCanvasDisplayHeight);
            gradient.addColorStop(0, '#cae9ff'); // Lighter blue at the top
            gradient.addColorStop(1, '#89c2d9'); // Light blue at the bottom
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasDisplayWidth, currentCanvasDisplayHeight); 
    
            // Update paddle position based on key states
            updatePaddlePosition();
    
            if (gameWon) {
                // Calculate animation progress
                const now = performance.now();
                const animationProgress = Math.min(1, (now - winAnimationStartTime) / winAnimationDuration);
                
                // Only draw game elements if they're still visible
                if (gameElementsVisible) {
                    drawBricks();
                    drawPaddle();
                    drawBall();
                }
                
                // Show win message immediately after game elements disappear
                if (!gameElementsVisible) {
                    // Apply easing to the animation progress for a "about to bounce" effect
                    const easedProgress = easeOutBack(animationProgress);
                    
                    // Draw win message with animation
                    const opacity = 1; // Full opacity immediately
                    const youWinWidth = canvasDisplayWidth * 0.8; 
                    const youWinHeight = youWinWidth * (youWinImage.height / youWinImage.width);
                    
                    // Scale effect that looks like it's about to bounce - slower growth
                    const scale = Math.min(1, easedProgress);
                    
                    // Draw with animation effects
                    ctx.save();
                    ctx.translate(canvasDisplayWidth / 2, currentCanvasDisplayHeight / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(-canvasDisplayWidth / 2, -currentCanvasDisplayHeight / 2);
                    
                    drawImageMessage(youWinImage, -youWinHeight / 2, youWinWidth, youWinHeight, opacity);
                    
                    ctx.restore();
                    
                    // Draw restart message with fade-in effect
                    if (animationProgress > 0.7) {
                        const textOpacity = (animationProgress - 0.7) / 0.3;
                        drawMessage("Press SELECT to restart", youWinHeight / 2 + 20, 12, "white", textOpacity);
                    }
                }
            } else {
                drawBricks();
                drawPaddle();
                drawBall();
    
                if (ballAttachedToPaddle) {
                    ballX = paddleX + (paddleWidth / 2);
                    ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5; 
                } else { 
                    ballX += ballDX; 
                    ballY += ballDY;
                }
    
                if (ballX + ballRadius > canvasDisplayWidth || ballX - ballRadius < 0) {
                    ballDX = -ballDX;
                    // Normalize velocity to maintain constant speed
                    const normalized = normalizeVelocity(ballDX, ballDY, ballSpeed);
                    ballDX = normalized.dx;
                    ballDY = normalized.dy;
                }
                if (ballY - ballRadius < 0) {
                    ballDY = -ballDY;
                    // Normalize velocity to maintain constant speed
                    const normalized = normalizeVelocity(ballDX, ballDY, ballSpeed);
                    ballDX = normalized.dx;
                    ballDY = normalized.dy;
                }
    
                if (ballY + ballRadius >= currentCanvasDisplayHeight - paddleHeight - 2 && 
                    ballX > paddleX && ballX < paddleX + paddleWidth) { 
                    // CHANGED: Modified paddle bounce to maintain constant speed
                    ballDY = -ballDY; // Reverse vertical direction
                    
                    // Calculate angle based on where the ball hit the paddle
                    let hitPoint = (ballX - paddleX) / paddleWidth; // 0 to 1
                    let angle = (hitPoint - 0.5) * Math.PI * 0.7; // -35 to +35 degrees in radians
                    
                    // Set new direction based on angle, but maintain constant speed
                    ballDX = ballSpeed * Math.sin(angle);
                    ballDY = -ballSpeed * Math.cos(angle); // Negative because we want to go up
                }
    
                if (ballY + ballRadius > currentCanvasDisplayHeight) {
                    ballAttachedToPaddle = true; 
                    running = false; 
                    paused = true; 
                    ballDX = 0; // CHANGED: Reset to vertical direction
                    ballDY = -ballSpeed; 
                }
    
                collisionDetection(); 
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
                ballDX = 0; // CHANGED: Start with vertical direction
                ballDY = -ballSpeed;
                running = false; 
                paused = true; 
                gameWon = false; 
                gameElementsVisible = true;
                
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(draw);
                }
            }
        }
    
        function launchBall() {
            console.log("launchBall called, gameWon:", gameWon, "ballAttachedToPaddle:", ballAttachedToPaddle, "paused:", paused);
            
            if (gameWon) { 
                console.log("Game won, starting new game");
                startGame(); 
            } else if (ballAttachedToPaddle && paused) { 
                console.log("Launching ball from paddle");
                ballAttachedToPaddle = false; 
                running = true; 
                paused = false; 
                
                // CHANGED: Always launch ball straight up
                ballDX = 0;
                ballDY = -ballSpeed;
    
                console.log("Ball launched with speed:", ballSpeed, "direction:", ballDX, ballDY);
    
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(draw);
                }
            } else {
                console.log("Cannot launch ball: conditions not met");
            }
        }
    
        document.getElementById('menu-button').onclick = exitGame; 
        
        // Use addEventListener instead of direct assignment for better compatibility
        document.getElementById('select-button').addEventListener('click', function() {
            console.log("Select button clicked, calling launchBall");
            launchBall();
        });
    
        // Make launchBall available globally for space bar handling
        window.gameLaunchBall = launchBall;
        window.startGame = startGame;
    
        initBricks();
        animationFrameId = requestAnimationFrame(draw); 
    }
    
    // Keyboard Input Handler for key press and release with improved game controls
    function handleKeyboardInput(event) {
        // Handle space bar for game start regardless of mode
        if (event.key === " " && event.type === 'keydown') {
            console.log("Space bar pressed, game mode:", gameMode);
            
            if (gameMode) {
                console.log("In game mode, ball attached:", ballAttachedToPaddle, "paused:", paused);
                if (gameWon) {
                    console.log("Game won, restarting game");
                    if (typeof window.startGame === 'function') {
                        window.startGame();
                    }
                } else if (ballAttachedToPaddle && paused) {
                    console.log("Launching ball");
                    if (typeof window.gameLaunchBall === 'function') {
                        window.gameLaunchBall();
                    }
                }
            } else {
                console.log("Not in game mode, checking if Games is selected");
                const selectedText = menuItems[currentIndex].textContent.trim();
                if (selectedText === "Games") {
                    console.log("Games selected, starting game");
                    startBreakoutGame();
                }
            }
        }
        
        // Game mode controls
        if (gameMode && !gameWon && canvasDisplayWidth !== 0 && paddleWidth !== 0) {
            // Handle arrow keys for paddle movement
            if (event.key === "ArrowLeft") {
                keyState.ArrowLeft = (event.type === 'keydown');
                // Move paddle left immediately for better responsiveness
                if (event.type === 'keydown') {
                    paddleX -= 8; // Reduced from 15 to 8 for slower movement
                    if (paddleX < 0) paddleX = 0;
                }
            }
            if (event.key === "ArrowRight") {
                keyState.ArrowRight = (event.type === 'keydown');
                // Move paddle right immediately for better responsiveness
                if (event.type === 'keydown') {
                    paddleX += 8; // Reduced from 15 to 8 for slower movement
                    if (paddleX + paddleWidth > canvasDisplayWidth) 
                        paddleX = canvasDisplayWidth - paddleWidth;
                }
            }
            
            // Enter key can also launch ball
            if (event.key === "Enter" && event.type === 'keydown') {
                if (ballAttachedToPaddle && paused) {
                    if (typeof window.gameLaunchBall === 'function') {
                        window.gameLaunchBall();
                    }
                } else if (gameWon) {
                    if (typeof window.startGame === 'function') {
                        window.startGame();
                    }
                }
            }
        } else if (!gameMode && event.type === 'keydown') {
            // Menu navigation
            if (event.key === "Enter") {
                // Handle selection
                const selectedText = menuItems[currentIndex].textContent.trim();
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
            } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                // Navigate menu up
                updateSelection(currentIndex - 1);
            } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                // Navigate menu down
                updateSelection(currentIndex + 1);
            }
        }
    }
    
    // Attach keyboard listeners to the document
    document.addEventListener('keydown', handleKeyboardInput);
    document.addEventListener('keyup', handleKeyboardInput);
    
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