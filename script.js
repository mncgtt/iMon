document.addEventListener('DOMContentLoaded', function() {
    const clickwheel = document.getElementById('clickwheel');
    const menuItems = document.querySelectorAll('.menu-item');
    const previewImage = document.getElementById('preview-image');
    const screenEl = document.getElementById('screen'); // Get the main screen element
    
    let currentIndex = 0;
    let startAngle = 0; // For menu navigation rotation
    let isDragging = false; // For menu navigation rotation (true when mousedown/touchstart on clickwheel)
    let inSubMenu = false;
    let gameMode = false; // Flag to indicate if a game is active
    let animationFrameId = null; // To store the requestAnimationFrame ID for the game loop
    
    // Hammer.js instance for paddle control
    let hammerManager = null;
    // Variables for circular paddle control
    let initialClickwheelAngle = 0; // Angle of the touch/mouse relative to clickwheel center at panstart
    let initialPaddleX = 0; // Paddle's X position at panstart
    
    // Game-specific variables (need to be accessible globally or passed)
    let paddleX = 0; 
    let paddleWidth = 0; 
    let canvasDisplayWidth = 0; 
    let running = false; 
    let paused = true; // Game starts paused
    let ballAttachedToPaddle = true; // Ball starts attached
    
    // Game state flags for win/lose
    let gameWon = false;
    // let gameLost = false; // We can add this later for "Game Over" if needed
    
    // Image object for "YOU WIN" message (PNG)
    const youWinImage = new Image();
    youWinImage.src = 'images/you_win.png'; // Path to your "YOU WIN" PNG
    
    // Optional: Preload images (good practice, especially for larger images)
    let imagesLoadedCount = 0;
    const totalImagesToLoad = 1; // Only one image now
    const onImageLoad = () => {
        imagesLoadedCount++;
        if (imagesLoadedCount === totalImagesToLoad) {
            console.log("All win message images loaded.");
            // If you wanted to prevent game start until images loaded, you'd put logic here
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
    
    // Function to update menu selection
    function updateSelection(newIndex) {
        if (newIndex < 0 || newIndex >= menuItems.length) return;
        menuItems[currentIndex].classList.remove('active');
        currentIndex = newIndex;
        menuItems[currentIndex].classList.add('active');
        menuItems[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const previewSrc = menuItems[currentIndex].dataset.preview;
        if (previewSrc) previewImage.src = previewSrc;
    }
    
    // Handle clickwheel rotation for menu navigation (still uses angle)
    function handleMenuRotation(event) {
        if (!isDragging || inSubMenu || gameMode) return; 
    
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) { // It's a touch event
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else { // It's a mouse event
            clientX = event.clientX;
            clientY = event.clientY;
        }
    
        const rect = clickwheel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2; // This is correct for rect-relative center
        
        const angle = Math.atan2(clientY - centerY, clientX - centerX);
        const angleDiff = angle - startAngle;
        if (Math.abs(angleDiff) > Math.PI / 8) { 
            if (angleDiff > 0) updateSelection(currentIndex + 1);
            else updateSelection(currentIndex - 1);
            startAngle = angle;
        }
    }
    
    // --- Hammer.js Circular Paddle Control Functions ---
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
    
            const sensitivity = 150; 
            let newPaddleX = initialPaddleX + (angleDelta * sensitivity);
            
            const minPaddleX = 0;
            const maxPaddleX = canvasDisplayWidth - paddleWidth;
    
            if (newPaddleX < minPaddleX) {
                newPaddleX = minPaddleX;
                initialClickwheelAngle = currentClickwheelAngle; 
                initialPaddleX = minPaddleX;
            } else if (newPaddleX > maxPaddleX) {
                newPaddleX = maxPaddleX;
                initialClickwheelAngle = currentClickwheelAngle;
                initialPaddleX = maxPaddleX;
            }
            
            paddleX = newPaddleX;
        }
    }
    
    function onPanEnd(e) {
        // No specific action needed on pan end
    }
    
    // --- Unified Event Listeners for Clickwheel Interaction ---
    
    // MOUSE DOWN / TOUCH START (Initiates a drag/push)
    clickwheel.addEventListener('mousedown', function(event) {
        if (!gameMode) { 
            isDragging = true; 
            const rect = clickwheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        }
    });
    
    clickwheel.addEventListener('touchstart', function(event) {
        // REMOVED event.preventDefault() from here
        if (!gameMode) { 
            isDragging = true; 
            const touch = event.touches[0];
            const rect = clickwheel.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2; 
            startAngle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
        }
    });
    
    // MOUSE MOVE / TOUCH MOVE (Handles ongoing drag/push) - ATTACHED TO CLICKWHEEL
    clickwheel.addEventListener('mousemove', handleMenuRotation);
    clickwheel.addEventListener('touchmove', function(event) {
        event.preventDefault(); // Keep this here to prevent scrolling during a drag
        handleMenuRotation(event);
    }); 
    
    // MOUSE UP / TOUCH END / MOUSE LEAVE (Stops drag/push) - ATTACHED TO DOCUMENT FOR ROBUSTNESS
    document.addEventListener('mouseup', () => {
        isDragging = false; 
    });
    
    document.addEventListener('touchend', () => { 
        isDragging = false; 
    });
    
    clickwheel.addEventListener('mouseleave', (event) => { 
        if (event.buttons === 0) { 
            isDragging = false; 
        }
    });
    
    // Main clickwheel button handler
    clickwheel.addEventListener('click', function(event) {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
    
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
                        startBreakoutGame(); 
                    } else {
                        screenEl.innerHTML = `
                            <div id="display" style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;">
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
    
    // Initial state setup
    menuItems[currentIndex].classList.add('active');
    menuItems[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    previewImage.src = menuItems[currentIndex].dataset.preview;
    
    // Function to restore the main menu view
    function restoreMenu() {
        // Reloading the page is the simplest way to reset all game state and re-bind menu listeners
        location.reload(); 
    }
    
    // Function to start the Breakout game (initial setup when 'Games' is selected)
    function startBreakoutGame() {
        console.log("Starting Breakout Game...");
        // Use a Promise to ensure images are loaded before proceeding
        allGameImagesLoadedPromise = new Promise((resolve) => {
            let loadedCount = 0;
            const imagesToLoad = [youWinImage]; // Add other game-specific images here if any
    
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
                        loadedCount++; // Still increment to avoid infinite wait
                        if (loadedCount === imagesToLoad.length) {
                            resolve();
                        }
                    };
                }
            });
    
            if (loadedCount === imagesToLoad.length) { // All were already loaded
                resolve();
            }
        });
    
        allGameImagesLoadedPromise.then(() => {
            console.log("All game images confirmed loaded. Proceeding with game setup.");
            screenEl.innerHTML = `
                <canvas id="breakout-game" style="background:black; display:block; margin:auto; width:100%; height:100%;"></canvas>
                <!-- Removed the instruction text div -->
            `;
            const screenRect = screenEl.getBoundingClientRect();
            setTimeout(() => initBreakoutGame(screenRect.width, screenRect.height), 50); 
            gameMode = true; 
            console.log("gameMode set to true.");
    
            if (!hammerManager) {
                console.log("Initializing Hammer.js manager for circular pan...");
                hammerManager = new Hammer.Manager(clickwheel);
                hammerManager.add(new Hammer.Pan({ threshold: 0 })); 
                hammerManager.on('panstart', onPanStart);
                hammerManager.on('panmove', onPanMove);
                hammerManager.on('panend', onPanEnd);
                console.log("Hammer.js manager initialized and listeners added.");
            } else {
                console.log("Hammer.js manager already initialized.");
            }
        });
    }
    
    // Function to exit the game
    function exitGame() {
        console.log("Exiting game...");
        gameMode = false; // Reset game mode flag
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId); // Stop the game loop
            animationFrameId = null;
        }
        restoreMenu(); // Go back to the main menu
    }
    
    // Breakout Game Logic
    // Pass canvas dimensions directly to avoid relying on clientWidth/Height which might be fractional
    function initBreakoutGame(currentCanvasDisplayWidth, currentCanvasDisplayHeight) { 
        console.log("initBreakoutGame called.");
        const canvas = document.getElementById('breakout-game');
        const ctx = canvas.getContext('2d');
    
        // Assign to globally accessible variables
        canvasDisplayWidth = currentCanvasDisplayWidth; 
        
        // Get device pixel ratio for sharp rendering on high-DPI screens
        const dpr = window.devicePixelRatio || 1;
    
        // Set canvas drawing buffer size (internal resolution)
        canvas.width = canvasDisplayWidth * dpr;
        canvas.height = currentCanvasDisplayHeight * dpr; 
    
        // Scale the context to match the device pixel ratio
        ctx.scale(dpr, dpr);
    
        // Game variables (sizes relative to canvas's CSS dimensions)
        paddleWidth = canvasDisplayWidth * 0.25; 
        let paddleHeight = currentCanvasDisplayHeight * 0.03;
        paddleX = (canvasDisplayWidth - paddleWidth) / 2; // Initial paddle position
        let ballRadius = canvasDisplayWidth * 0.02; 
        let ballX = paddleX + (paddleWidth / 2); // Initial ball position centered on paddle
        let ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5; // Initial ball position above paddle
        let ballSpeed = canvasDisplayWidth * 0.005; // Increased speed
        let ballDX = ballSpeed; 
        let ballDY = -ballSpeed; 
        running = false; 
        paused = true; 
        gameWon = false; // Reset gameWon flag for new game
    
        // Brick properties
        const brickRowCount = 3; 
        const maxBrickColumnCount = 6; 
        const brickHeight = currentCanvasDisplayHeight * 0.05; 
        const brickPadding = canvasDisplayWidth * 0.01; 
        const sideMargin = canvasDisplayWidth * 0.05; 
        const brickOffsetTop = currentCanvasDisplayHeight * 0.1; 
        
        let bricks = []; 
    
        // Define gradient colors for different HP levels (more prominent)
        const brickColors = {
            3: ['#003366', '#001133'], 
            2: ['#0077b6', '#005588'], 
            1: ['#00b4d8', '#0099cc']  
        };
    
        // Initialize bricks with organized HP and pyramid layout
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
                
                const totalRowWidth = (currentColumnCount * uniformBrickWidth) + ((currentColumnCount - 1) * brickPadding); // Fix: padding for 1 brick is 0
                
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
    
        // Draw bricks on canvas
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
    
        // Draw paddle on canvas
        function drawPaddle() {
            ctx.fillStyle = "white"; 
            ctx.fillRect(paddleX, currentCanvasDisplayHeight - paddleHeight - 2, paddleWidth, paddleHeight);
        }
    
        // Draw ball on canvas
        function drawBall() {
            ctx.beginPath();
            ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "white"; 
            ctx.fill();
            ctx.closePath();
        }
    
        // Function to draw text messages on canvas
        function drawMessage(text, yOffset, fontSize, color) {
            ctx.font = `${fontSize}px Inter`; // Use Inter font
            ctx.fillStyle = color;
            ctx.textAlign = "center";
            ctx.fillText(text, canvasDisplayWidth / 2, currentCanvasDisplayHeight / 2 + yOffset);
        }
    
        // Function to draw image messages on canvas
        function drawImageMessage(image, yOffset, width, height) {
            // Check if the image is loaded before attempting to draw
            if (image.complete && image.naturalWidth !== 0) {
                // Calculate x to center the image
                const x = (canvasDisplayWidth - width) / 2;
                const y = currentCanvasDisplayHeight / 2 + yOffset;
                ctx.drawImage(image, x, y, width, height);
            } else {
                // console.log("Image not yet loaded:", image.src); // For debugging
            }
        }
    
        // Collision Detection for ball and bricks
        function collisionDetection() {
            // This function is now only for brick collision. Paddle collision is in draw().
            for (let r = 0; r < brickRowCount; r++) { 
                for (let c = 0; c < bricks[r].length; c++) { 
                    let b = bricks[r][c];
                    if (b.status === 1) { 
                        // REVERTED BRICK COLLISION LOGIC
                        if (ballX > b.x && ballX < b.x + b.width &&
                            ballY > b.y && ballY < b.y + b.height) {
                            ballDY = -ballDY; // Reverse ball direction
                            
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
                                gameWon = true; // Set gameWon flag
                            }
                        }
                    }
                }
            }
        }
    
        // Main drawing and update loop
        function draw() {
            const gradient = ctx.createLinearGradient(0, 0, 0, currentCanvasDisplayHeight);
            gradient.addColorStop(0, '#ADD8E6'); 
            gradient.addColorStop(1, '#87CEEB'); 
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasDisplayWidth, currentCanvasDisplayHeight); // Always draw background
    
            if (gameWon) {
                // If game is won, only draw the win messages
                const youWinWidth = canvasDisplayWidth * 0.8; 
                const youWinHeight = youWinWidth * (youWinImage.height / youWinImage.width); 
                
                // NEW: Centering for YOU WIN image
                drawImageMessage(youWinImage, -youWinHeight / 2, youWinWidth, youWinHeight); // Centered vertically
    
                // Text message for restart
                drawMessage("Press SELECT to restart", youWinHeight / 2 + 20, 12, "white"); // Adjusted yOffset
            } else {
                // If game is NOT won, draw all game elements and perform game logic
                drawBricks();
                drawPaddle();
                drawBall();
    
                // Update ball position if attached to paddle
                if (ballAttachedToPaddle) {
                    ballX = paddleX + (paddleWidth / 2);
                    ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5; 
                } else { 
                    ballX += ballDX; 
                    ballY += ballDY;
                }
    
                // --- Collision Detection and Boundary Checks ---
                // These should happen AFTER ball position update, but BEFORE drawing next frame.
    
                // Wall collisions (left/right)
                if (ballX + ballRadius > canvasDisplayWidth || ballX - ballRadius < 0) {
                    ballDX = -ballDX;
                }
                // Wall collisions (top)
                if (ballY - ballRadius < 0) {
                    ballDY = -ballDY;
                }
    
                // Paddle collision
                if (ballDY > 0 && // Only check if ball is moving downwards
                    ballY + ballRadius >= currentCanvasDisplayHeight - paddleHeight - 2 && // Ball's bottom edge crosses paddle's top
                    ballY + ballRadius <= currentCanvasDisplayHeight - 2 && // Ball's bottom edge is not below paddle's bottom
                    ballX > paddleX && ballX < paddleX + paddleWidth) { // Ball is within paddle's X bounds
                    
                    ballDY = -ballDY; // Reverse ball direction
                    
                    // Optional: Add a slight horizontal bounce based on where it hit the paddle
                    let hitPoint = (ballX - paddleX) / paddleWidth; // 0 = far left, 1 = far right
                    let bounceAngle = (hitPoint - 0.5) * 2; // -1 to 1, 0 is center
                    ballDX = ballSpeed * bounceAngle * 1.5; // Adjust 1.5 for sensitivity
                }
    
                // Ball falls off bottom - reset position and attach to paddle
                if (ballY + ballRadius > currentCanvasDisplayHeight) {
                    ballAttachedToPaddle = true; 
                    running = false; 
                    paused = true; 
                    ballDX = ballSpeed; 
                    ballDY = -ballSpeed; 
                }
    
                // --- End Collision Detection and Boundary Checks ---
    
                collisionDetection(); // Call brick collision detection after ball movement and paddle collision
            }
            
            // NEW: Always request next frame unless explicitly cancelled (e.g., on exitGame)
            // The loop will continue to draw the win screen until restart.
            animationFrameId = requestAnimationFrame(draw); 
        }
    
        // Function to start/restart the game (initial setup when 'Games' is selected)
        function startGame() {
            // This function is called when 'Games' is selected and the center button is pressed.
            // It should only initialize a *new* game, not launch the ball.
            // Launching is handled by launchBall().
    
            // Only proceed if game is not running and is paused (e.g., first start or after game over)
            // If it's already running, this call is ignored.
            if (!running && paused) { 
                // Reset game state for a fresh start
                initBricks(); // Reset bricks
                ballAttachedToPaddle = true; // Attach ball for new game
                
                // Reset paddle and ball to center for a NEW game
                paddleX = (canvasDisplayWidth - paddleWidth) / 2; 
                ballX = paddleX + (paddleWidth / 2); // Ball centered on paddle
                ballY = currentCanvasDisplayHeight - paddleHeight - ballRadius - 5; // Just above paddle
    
                running = false; // Game is paused until ball is launched
                paused = true; 
                gameWon = false; // Reset gameWon flag for a new game start
                
                // NEW: Ensure the animation loop is running if it was stopped
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(draw);
                }
            }
        }
    
        // Function to launch the ball
        function launchBall() {
            // This function is called when the 'select' button is pressed AND the ball is attached.
            if (gameWon) { // If game was won, pressing select restarts it
                startGame(); // Call startGame to reset everything
            } else if (ballAttachedToPaddle && paused) { // Otherwise, if ball is attached and paused, launch it
                ballAttachedToPaddle = false; // Detach ball
                running = true; // Start game loop
                paused = false; // Unpause game
                // Ball's position (ballX, ballY) is already set by the paddle's current position in the draw loop
                // No need to reset ballX here.
    
                // NEW: Ensure the animation loop is running if it was stopped
                if (!animationFrameId) {
                    animationFrameId = requestAnimationFrame(draw);
                }
            }
        }
    
        // Assign clickwheel button actions for the game
        document.getElementById('menu-button').onclick = exitGame; 
        // Assign launchBall to select button for in-game use
        document.getElementById('select-button').onclick = launchBall; 
    
        // Initialize bricks and start drawing loop
        initBricks();
        // Initial call to draw, which will then self-loop if running/paused
        animationFrameId = requestAnimationFrame(draw); 
    }
    });