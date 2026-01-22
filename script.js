document.addEventListener('DOMContentLoaded', function() {
    const clickwheel = document.getElementById('clickwheel');
    let menuItems = document.querySelectorAll('.menu-item');
    let previewImage = document.getElementById('preview-image');
    const screenEl = document.getElementById('screen');
    
    let currentIndex = 0;
    let inSubMenu = false;
    let inSettingsMenu = false;
    let inThemeMenu = false;
    let inGamesMenu = false;
    let gameMode = false;
    let animationFrameId = null;
    
    let menuHammerManager = null;
    let settingsHammerManager = null;
    let gameHammerManager = null;
    
    let lastMenuAngle = 0;
    let lastSettingsAngle = 0;

    let initialClickwheelAngle = 0; 
    let initialPaddleX = 0; 
    
    let paddleX = 0; 
    let paddleWidth = 0; 
    let canvasDisplayWidth = 0; 
    let running = false; 
    let paused = true; 
    let ballAttachedToPaddle = true; 
    
    // Game state flags for win/lose
    let gameWon = false;
    let winAnimationStartTime = 0;
    let winAnimationDuration = 1000; 
    let gameElementsVisible = true; 
    
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
        "CV": "https://drive.google.com/drive/folders/1Lljhj2zPl8zjRdFb4QppszHeY8YD7SCH?usp=drive_link",
        "Mail": "mailto:monicagottardi@outlook.com"
    };
    
    menuItems.forEach((item, index) => {
        if (item.classList.contains('active')) {
            currentIndex = index;
        }
    });
    
    function updateSelection(newIndex) {
        if (newIndex < 0 || newIndex >= menuItems.length) return;
        
        menuItems[currentIndex].classList.remove('active');
        currentIndex = newIndex;
        menuItems[currentIndex].classList.add('active');
        menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
        
        const previewSrc = menuItems[currentIndex].dataset.preview;
        if (previewSrc) {
            previewImage.src = previewSrc;
        }
    }
    
    function onMenuPanStart(e) {
        if (gameMode || inSubMenu) return;
        lastMenuAngle = e.angle;
        console.log("Menu Pan Start. Initial Angle:", lastMenuAngle);
    }
    
    function onMenuPanMove(e) {
        if (gameMode || inSubMenu) return;
    
        const currentPanAngle = e.angle;
        let angleDiff = currentPanAngle - lastMenuAngle;
    
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
    
        const rotationThreshold = 15;
    
        if (angleDiff > rotationThreshold) {
            updateSelection(currentIndex + 1);
            lastMenuAngle = currentPanAngle;
            console.log("Menu moved right. New Index:", currentIndex);
        } else if (angleDiff < -rotationThreshold) {
            updateSelection(currentIndex - 1);
            lastMenuAngle = currentPanAngle;
            console.log("Menu moved left. New Index:", currentIndex);
        }
    }
    
    function onMenuPanEnd(e) {
        console.log("Menu Pan End.");
    }
    
    function onSettingsPanStart(e) {
        if (!inSettingsMenu && !inThemeMenu) return;
        lastSettingsAngle = e.angle;
        console.log("Settings Pan Start. Initial Angle:", lastSettingsAngle);
    }
    
    function onSettingsPanMove(e) {
        if (!inSettingsMenu && !inThemeMenu) return;
        
        const currentPanAngle = e.angle;
        let angleDiff = currentPanAngle - lastSettingsAngle;
        
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        
        const rotationThreshold = 15;
        
        const themeItems = document.querySelectorAll('.menu-item[data-theme], .menu-item[data-setting]');
        if (themeItems.length === 0) return;
        
        let themeIndex = 0;
        themeItems.forEach((item, index) => {
            if (item.classList.contains('active')) {
                themeIndex = index;
            }
        });
        
        if (angleDiff > rotationThreshold) {
            if (themeIndex < themeItems.length - 1) {
                themeItems[themeIndex].classList.remove('active');
                themeIndex++;
                themeItems[themeIndex].classList.add('active');
                themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
                
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
            if (themeIndex > 0) {
                themeItems[themeIndex].classList.remove('active');
                themeIndex--;
                themeItems[themeIndex].classList.add('active');
                themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
                
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
        console.log("Settings Pan End.");
    }
    
    function onPanStart(e) {
        if (gameMode) { 
            const rect = clickwheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            initialClickwheelAngle = Math.atan2(e.center.y - centerY, e.center.x - centerX);
            initialPaddleX = paddleX; 
        }
    }
    
    function onPanMove(e) {
        if (gameMode) { 
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
            
            if (Math.abs(angleDelta) > Math.PI / 4) {
                initialClickwheelAngle = currentClickwheelAngle;
                initialPaddleX = paddleX;
            }
        }
    }
    
    function onPanEnd(e) { // game paddle
    }
    
    menuHammerManager = new Hammer.Manager(clickwheel);
    menuHammerManager.add(new Hammer.Pan({ threshold: 10 }));
    menuHammerManager.on('panstart', onMenuPanStart);
    menuHammerManager.on('panmove', onMenuPanMove);
    menuHammerManager.on('panend', onMenuPanEnd);
    console.log("Menu Hammer.js manager initialized.");
    
    settingsHammerManager = new Hammer.Manager(clickwheel);
    settingsHammerManager.add(new Hammer.Pan({ threshold: 10 }));
    settingsHammerManager.on('panstart', onSettingsPanStart);
    settingsHammerManager.on('panmove', onSettingsPanMove);
    settingsHammerManager.on('panend', onSettingsPanEnd);
    settingsHammerManager.set({ enable: false });
    console.log("Settings Hammer.js manager initialized.");
    
    clickwheel.addEventListener('click', function(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
    
        if (inSettingsMenu) {
            handleSettingsMenuAction(action);
            return;
        }
        
        if (inThemeMenu) {
            handleThemeMenuAction(action);
            return;
        }
        
        if (inGamesMenu) {
            handleGamesMenuAction(action);
            return;
        }
    
        if (action === 'select') {
            if (gameMode) {
                launchBall();
            } else {
                const selectedText = menuItems[currentIndex].textContent.trim();
                if (links[selectedText]) {
                    if (selectedText === "Mail") {
                        window.location.href = links[selectedText];
                    } else {
                        window.open(links[selectedText], '_blank');
                    }
                } else {
                    if (selectedText === "Games") {
                        showGamesMenu();
                    } else if (selectedText === "Settings") {
                        showSettingsMenu();
                    } else {
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
            return;
        }
    
        if (gameMode) {
            if (action === 'menu') {
                exitGame(); 
            }
            return;
        }
    
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
    
    function handleSettingsMenuAction(action) {
        const settingItems = document.querySelectorAll('.menu-item[data-setting]');
        let settingIndex = 0;
        
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
                showSettingsMenu();
                break;
            case 'forward':
                if (themeIndex < themeItems.length - 1) {
                    themeItems[themeIndex].classList.remove('active');
                    themeIndex++;
                    themeItems[themeIndex].classList.add('active');
                    themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
                    
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
                    
                    if (previewImage && themeItems[themeIndex].dataset.preview) {
                        previewImage.src = themeItems[themeIndex].dataset.preview;
                    }
                }
                break;
        }
    }
    
    function handleGamesMenuAction(action) {
        const gameItems = document.querySelectorAll('.menu-item[data-game]');
        let gameIndex = 0;
        
        gameItems.forEach((item, index) => {
            if (item.classList.contains('active')) {
                gameIndex = index;
            }
        });
        
        switch(action) {
            case 'select':
                const selectedGame = gameItems[gameIndex].dataset.game;
                if (selectedGame === "breakout") {
                    screenEl.innerHTML = `<canvas id="breakout-game" style="background:black; display:block; margin:auto; width:100%; height:100%;"></canvas>`;
                    
                    const screenRect = screenEl.getBoundingClientRect();
                    initBreakoutGame(screenRect.width, screenRect.height);
                    
                    gameMode = true;
                    inSubMenu = true;
                    inGamesMenu = false;
                    console.log("gameMode set to true.");
                    
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
                    menuHammerManager.set({ enable: false });
                    gameHammerManager.set({ enable: true });
                }
                break;
            case 'menu':
                restoreMenu();
                break;
            case 'forward':
                if (gameIndex < gameItems.length - 1) {
                    gameItems[gameIndex].classList.remove('active');
                    gameIndex++;
                    gameItems[gameIndex].classList.add('active');
                    gameItems[gameIndex].scrollIntoView({ block: 'nearest' });
                    
                    const previewImage = document.getElementById('preview-image');
                    if (previewImage && gameItems[gameIndex].dataset.preview) {
                        previewImage.src = gameItems[gameIndex].dataset.preview;
                    }
                }
                break;
            case 'back':
                if (gameIndex > 0) {
                    gameItems[gameIndex].classList.remove('active');
                    gameIndex--;
                    gameItems[gameIndex].classList.add('active');
                    gameItems[gameIndex].scrollIntoView({ block: 'nearest' });
                    
                    const previewImage = document.getElementById('preview-image');
                    if (previewImage && gameItems[gameIndex].dataset.preview) {
                        previewImage.src = gameItems[gameIndex].dataset.preview;
                    }
                }
                break;
        }
    }
    
    menuItems[currentIndex].classList.add('active');
    menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
    previewImage.src = menuItems[currentIndex].dataset.preview;
    
    function restoreMenu() {
        console.log("Restoring menu...");
        
        if (gameMode) {
            gameMode = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }
        
        menuHammerManager.set({ enable: true });
        settingsHammerManager.set({ enable: false });
        if (gameHammerManager) {
            gameHammerManager.set({ enable: false });
        }
        
        inSubMenu = false;
        inSettingsMenu = false;
        inThemeMenu = false;
        inGamesMenu = false;
        
        const defaultPreviewPath = "images/linkedin-preview.png";
        
        const menuHTML = `
            <div id="display">
                <div id="menu-title">iMon</div>
                <div id="menu-container">
                    <ul id="menu-list">
                        <li class="menu-item" data-preview="images/linkedin-preview.png">LinkedIn</li>
                        <li class="menu-item" data-preview="images/behance-preview.png">Behance</li>
                        <li class="menu-item" data-preview="images/cv-preview.png">CV</li>
                        <li class="menu-item" data-preview="images/mail-preview.png">Mail</li>
                        <li class="menu-item" data-preview="images/games-preview.png">Games</li>
                        <li class="menu-item" data-preview="images/settings-preview.png">Settings</li>
                    </ul>
                </div>
            </div>
            <div id="right-display">
                <img src="${defaultPreviewPath}" alt="Preview" class="display-icon" id="preview-image">
            </div>
        `;
        
        screenEl.innerHTML = menuHTML;
        
        menuItems = document.querySelectorAll('.menu-item');
        previewImage = document.getElementById('preview-image');
        
        currentIndex = 0; 
        
        menuItems[currentIndex].classList.add('active');
        menuItems[currentIndex].scrollIntoView({ block: 'nearest' });

        previewImage.src = menuItems[currentIndex].dataset.preview;

        console.log("Menu restored. New currentIndex:", currentIndex);
    }
    
    function showSettingsMenu() {
        inSubMenu = true;
        inSettingsMenu = true;
        inThemeMenu = false;
        inGamesMenu = false;
        
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
        
        const themeItems = document.querySelectorAll('.menu-item[data-theme]');
        let themeIndex = Array.from(themeItems).findIndex(item => item.classList.contains('active'));
        const previewImage = document.getElementById('preview-image');
        
        function updateThemeSelection(newIndex) {
            if (newIndex < 0 || newIndex >= themeItems.length) return;
            themeItems[themeIndex].classList.remove('active');
            themeIndex = newIndex;
            themeItems[themeIndex].classList.add('active');
            themeItems[themeIndex].scrollIntoView({ block: 'nearest' });
            
            const previewSrc = themeItems[themeIndex].dataset.preview;
            if (previewSrc && previewImage) {
                previewImage.src = previewSrc;
            }
        }
        
        window.updateThemeSelection = updateThemeSelection;
    }
    
    function showGamesMenu() {
        inSubMenu = true;
        inSettingsMenu = false;
        inThemeMenu = false;
        inGamesMenu = true;
        
        menuHammerManager.set({ enable: false });
        
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
    }
    
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-mint');
        
        document.body.setAttribute('data-theme', theme);
        
        document.body.classList.add('theme-' + theme);
        
        const ipodContainer = document.querySelector('.ipod-container');
        ipodContainer.style.transition = 'background 0.5s ease';
        
        if (theme === 'light') {
            ipodContainer.style.background = 'linear-gradient(145deg, #e6e6e6, #cccccc)';
        } else if (theme === 'dark') {
            ipodContainer.style.background = 'linear-gradient(145deg, #333333, #222222)';
        } else if (theme === 'mint') {
            ipodContainer.style.background = 'linear-gradient(145deg, #98CFD1, #7ABFC1)';
        }
        
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
    
    function startBreakoutGame() {
        console.log("Starting Breakout Game...");
        showGamesMenu();
    }
    
    function exitGame() {
        console.log("Exiting game...");
        gameMode = false; 
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); 
            animationFrameId = null;
        }
        if (menuHammerManager) {
            menuHammerManager.set({ enable: true });
        }
        if (gameHammerManager) {
            gameHammerManager.set({ enable: false });
        }
        restoreMenu(); 
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
    
    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    
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
    
        function normalizeVelocity(dx, dy, speed) {
            const currentSpeed = Math.sqrt(dx * dx + dy * dy);
            if (currentSpeed === 0) return { dx: 0, dy: -speed };
            
            const ratio = speed / currentSpeed;
            return {
                dx: dx * ratio,
                dy: dy * ratio
            };
        }
    
        function collisionDetection() {
            if (ballAttachedToPaddle) return;
            
            const nextBallX = ballX + ballDX;
            const nextBallY = ballY + ballDY;
            
            let collisionHappened = false;
            
            for (let r = 0; r < brickRowCount && !collisionHappened; r++) { 
                for (let c = 0; c < bricks[r].length && !collisionHappened; c++) { 
                    let b = bricks[r][c];
                    if (b.status === 1) { 
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
                            
                            if ((fromLeft || fromRight) && 
                                ballY + ballRadius > b.y && 
                                ballY - ballRadius < b.y + b.height) {
                                ballDX = -ballDX;
                            } 
                            else if ((fromTop || fromBottom) && 
                                    ballX + ballRadius > b.x && 
                                    ballX - ballRadius < b.x + b.width) {
                                ballDY = -ballDY;
                            }
                            else {
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
                console.log("Game won, starting new game");
                startGame(); 
            } else if (ballAttachedToPaddle && paused) { 
                console.log("Launching ball from paddle");
                ballAttachedToPaddle = false; 
                running = true; 
                paused = false; 
                
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
        
        document.getElementById('select-button').addEventListener('click', function() {
            console.log("Select button clicked, calling launchBall");
            launchBall();
        });
    
        window.gameLaunchBall = launchBall;
        window.startGame = startGame;
    
        initBricks();
        animationFrameId = requestAnimationFrame(draw); 
    }
    
    function handleKeyboardInput(event) {
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
        
        if (gameMode && !gameWon && canvasDisplayWidth !== 0 && paddleWidth !== 0) {
            if (event.key === "ArrowLeft") {
                keyState.ArrowLeft = (event.type === 'keydown');
                if (event.type === 'keydown') {
                    paddleX -= 8;
                    if (paddleX < 0) paddleX = 0;
                }
            }
            if (event.key === "ArrowRight") {
                keyState.ArrowRight = (event.type === 'keydown');
                if (event.type === 'keydown') {
                    paddleX += 8;
                    if (paddleX + paddleWidth > canvasDisplayWidth) 
                        paddleX = canvasDisplayWidth - paddleWidth;
                }
            }
            
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
            if (event.key === "Enter") {
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
                updateSelection(currentIndex - 1);
            } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                updateSelection(currentIndex + 1);
            }
        }
    }
    
    document.addEventListener('keydown', handleKeyboardInput);
    document.addEventListener('keyup', handleKeyboardInput);
    
    menuItems[currentIndex].classList.add('active');
    menuItems[currentIndex].scrollIntoView({ block: 'nearest' });
    previewImage.src = menuItems[currentIndex].dataset.preview;
    
    function draw() {
    }
    
    animationFrameId = requestAnimationFrame(draw); 
});
