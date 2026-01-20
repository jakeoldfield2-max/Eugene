class PixelGarden {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Performance limits
        this.maxActiveStems = 50; // Limit total active stems for performance
        this.maxPlantsPerSession = 20; // Limit plants per session
        this.activeStemCount = 0; // Track current active stems

        // Scene state - start with clean garden
        this.scene = {
            sky: { visible: true, tint: '#87CEEB' },
            mountains: { visible: true }, // Add mountain visibility control
            grass: { visible: true, height: 120 },
            soil: { visible: true, height: 120 },
            seed: { x: 0, y: 0, visible: false, planted: false },
            fallingGifts: [], // Array of gifts currently falling
            roots: [],
            stems: [], // Change to array to track multiple stems
            flowers: [],
            plantedGifts: [], // Array to track planted gifts that can be clicked
            risingBalloons: [], // Array to track balloons rising from gifts
            endingBalloons: [], // Array for balloons on ending screen
            gemButtons: [], // Array to track gem buttons and their associated photos
            seedCounter: 18, // Starting seed count
            camera: { x: 0, y: 0, zoom: 1 },
            revealQueue: [] // Queue of plant elements to reveal bottom-up
        };

        // Animation state
        this.isAnimating = false;
        this.animationQueue = [];

        // Application state management
        this.appState = 'splash'; // 'splash', 'transitioning', 'main', 'ending'
        this.transitionData = {
            phase: '', // 'slideDown', 'darkness', 'brighten'
            progress: 0,
            startTime: 0,
            duration: 0
        };

        // Photo ordering system - goes 1 to 18 in order
        this.photoNumbers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
        this.photoIndex = 0;
        this.debug = false;

        // Sprites (will be generated programmatically)
        this.sprites = {};

        this.init();
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getNextPhotoNumber() {
        const photoNumber = this.photoNumbers[this.photoIndex];
        this.photoIndex = (this.photoIndex + 1) % this.photoNumbers.length;

        // If we've cycled through all photos, reset for next cycle
        if (this.photoIndex === 0) {
            this.photoNumbers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
            console.log('Photo cycle complete - reset for next cycle');
        }

        return photoNumber;
    }

    async init() {
        console.log('Initializing PixelGarden... Initial state:', this.appState);
        await this.createSprites();
        this.setupEventListeners();
        console.log('Starting render loop with app state:', this.appState);
        this.render();
    }

    // Programmatically create pixel art sprites
    async createSprites() {
        // Load new workshop background
        try {
            this.sprites.workshopBackground = await this.loadSVGSprite('sprites/Background.png');
            console.log('Workshop background loaded');
        } catch (error) {
            console.error('Failed to load workshop background:', error);
        }

        // Load floor tile
        try {
            this.sprites.woodFloor = await this.loadSVGSprite('sprites/Floor.png');
            console.log('Wood floor loaded');
        } catch (error) {
            console.error('Failed to load wood floor:', error);
        }

        // Legacy sprites (kept for fallback)
        // Create sky tile
        this.sprites.sky = this.createSkyTile(32, 32);

        // Load grass PNG sprite
        try {
            this.sprites.grass = await this.loadSVGSprite('sprites/Grass.png');
        } catch (error) {
            console.error('Failed to load grass sprite:', error);
            // Fallback to generated grass
            this.sprites.grass = this.createGrassTile(32, 16);
        }

        // Create soil tile
        this.sprites.soil = this.createSoilTile(32, 32);

        // Load gift sprites (closed and open)
        try {
            this.sprites.seed = await this.loadSVGSprite('sprites/gift_closed.png');
        } catch (error) {
            console.error('Failed to load gift sprite:', error);
            // Fallback to generated seed
            this.sprites.seed = this.createSeedSprite(8, 8);
        }

        try {
            this.sprites.giftOpen = await this.loadSVGSprite('sprites/gift_open.png');
        } catch (error) {
            console.error('Failed to load opened gift sprite:', error);
        }

        // Create stem segments (new shorter height for multi-stem system)
        this.sprites.stemStraight = this.createStemTile(8, 8, 'straight');
        this.sprites.stemCurved = this.createStemTile(10, 8, 'curved');
        this.sprites.stemThick = this.createStemTile(12, 8, 'thick');

        // Create diagonal split sprites (3 variants to match stem types)
        this.sprites.splitStraightLeft = this.createDiagonalSplitSprite(14, 8, 'straight', 'left');
        this.sprites.splitStraightRight = this.createDiagonalSplitSprite(14, 8, 'straight', 'right');
        this.sprites.splitCurvedLeft = this.createDiagonalSplitSprite(16, 8, 'curved', 'left');
        this.sprites.splitCurvedRight = this.createDiagonalSplitSprite(16, 8, 'curved', 'right');
        this.sprites.splitThickLeft = this.createDiagonalSplitSprite(18, 8, 'thick', 'left');
        this.sprites.splitThickRight = this.createDiagonalSplitSprite(18, 8, 'thick', 'right');

        // Create legacy branch sprites (keep for backward compatibility)
        this.sprites.branchLeft = this.createBranchSprite(12, 8, 'left');
        this.sprites.branchRight = this.createBranchSprite(12, 8, 'right');

        // Create root sprites
        this.sprites.rootMain = this.createRootSprite(16, 16, 'main');
        this.sprites.rootBranch = this.createRootSprite(12, 8, 'branch');
        this.sprites.rootSmall = this.createRootSprite(8, 4, 'small');

        // Load balloon sprites (replace flowers)
        try {
            this.sprites.balloonBlue = await this.loadSVGSprite('sprites/balloon_blue.png');
            this.sprites.balloonGreen = await this.loadSVGSprite('sprites/balloon_green.png');
            this.sprites.balloonRed = await this.loadSVGSprite('sprites/balloon_red.png');
            this.sprites.balloonYellow = await this.loadSVGSprite('sprites/balloon_yellow.png');
        } catch (error) {
            console.error('Failed to load balloon sprites:', error);
            // Fallback to generated sweetpea sprites
            this.sprites.balloonBlue = this.createSweetpeaSprite(24, 24, 'white');
            this.sprites.balloonGreen = this.createSweetpeaSprite(24, 24, 'white');
            this.sprites.balloonRed = this.createSweetpeaSprite(24, 24, 'pink');
            this.sprites.balloonYellow = this.createSweetpeaSprite(24, 24, 'white');
        }

        // Create splash screen elements
        this.sprites.splashText = this.createSplashTextSprite();
        this.sprites.pixelHeart = this.createPixelHeartSprite();

        // Load mountain panorama sprites
        await this.loadMountainSprites();

        // Load cloud sprites (with spaces in filenames)
        try {
            this.sprites.cloud1 = await this.loadSVGSprite('sprites/Cloud 1.png');
            this.sprites.cloud2 = await this.loadSVGSprite('sprites/Cloud 2.png');
            this.sprites.cloud3 = await this.loadSVGSprite('sprites/Cloud 3.png');
        } catch (error) {
            console.error('Failed to load cloud sprites:', error);
        }

        // Load gem button sprite
        try {
            this.sprites.gem = await this.loadSVGSprite('sprites/Gem.png');
        } catch (error) {
            console.error('Failed to load gem sprite:', error);
        }

        // Load click anywhere sprite
        try {
            this.sprites.clickAnywhere = await this.loadSVGSprite('sprites/clickAnywhere.png');
            console.log('Click anywhere sprite loaded successfully');
        } catch (error) {
            console.error('Failed to load click anywhere sprite:', error);
        }

        // Load adore you sprite
        try {
            this.sprites.adoreYou = await this.loadSVGSprite('sprites/adoreYou.png');
            console.log('Adore you sprite loaded successfully');
        } catch (error) {
            console.error('Failed to load adore you sprite:', error);
        }
    }

    createSkyTile(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Create solid sky color for seamless tiling
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, width, height);

        return canvas;
    }

    createGrassTile(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Base grass color
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, 0, width, height);

        // Add grass blade details
        ctx.fillStyle = '#32CD32';
        for (let x = 2; x < width; x += 4) {
            for (let y = 0; y < height; y += 2) {
                if (Math.random() > 0.6) {
                    ctx.fillRect(x, y, 1, 2);
                }
            }
        }

        return canvas;
    }

    createSoilTile(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Base soil color
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, width, height);

        // Add soil texture
        ctx.fillStyle = '#A0522D';
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            ctx.fillRect(x, y, 1, 1);
        }

        ctx.fillStyle = '#654321';
        for (let i = 0; i < 30; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            ctx.fillRect(x, y, 1, 1);
        }

        return canvas;
    }

    createSeedSprite(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Draw seed
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(2, 2, 4, 4);
        ctx.fillRect(1, 3, 6, 2);

        // Add highlight
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(2, 2, 2, 1);

        return canvas;
    }

    createStemTile(width, height, variant) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const centerX = Math.floor(width / 2);

        if (variant === 'straight') {
            // Straight thin stem
            ctx.fillStyle = '#228B22';
            ctx.fillRect(centerX - 1, 0, 2, height);

            // Highlight
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(centerX - 1, 0, 1, height);

            // Shadow
            ctx.fillStyle = '#1F5F1F';
            ctx.fillRect(centerX, 0, 1, height);

            // Small leaf nodes for 8px height
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(centerX - 2, 2, 1, 1);
            ctx.fillRect(centerX + 1, 5, 1, 1);
        }
        else if (variant === 'curved') {
            // Slightly curved stem
            ctx.fillStyle = '#228B22';

            for (let y = 0; y < height; y++) {
                const curve = Math.sin(y / height * Math.PI) * 1.5;
                const x = centerX + Math.floor(curve);
                ctx.fillRect(x - 1, y, 2, 1);

                // Highlight
                ctx.fillStyle = '#32CD32';
                ctx.fillRect(x - 1, y, 1, 1);
                // Shadow
                ctx.fillStyle = '#1F5F1F';
                ctx.fillRect(x, y, 1, 1);
                ctx.fillStyle = '#228B22';
            }

            // Small leaves along curve
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(centerX - 2, 2, 1, 1);
            ctx.fillRect(centerX + 2, 6, 1, 1);
        }
        else if (variant === 'thick') {
            // Thicker, more robust stem
            ctx.fillStyle = '#1F5F1F';
            ctx.fillRect(centerX - 2, 0, 4, height);

            // Main stem color
            ctx.fillStyle = '#228B22';
            ctx.fillRect(centerX - 1, 0, 3, height);

            // Highlight
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(centerX - 1, 0, 1, height);

            // Texture lines
            ctx.fillStyle = '#1F5F1F';
            ctx.fillRect(centerX, 2, 1, 1);
            ctx.fillRect(centerX, 5, 1, 1);

            // Larger leaf nodes for thick stem
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(centerX - 3, 1, 2, 1);
            ctx.fillRect(centerX + 2, 4, 2, 1);
        }

        return canvas;
    }

    createBranchSprite(width, height, direction) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const centerY = Math.floor(height / 2);

        if (direction === 'left') {
            // Branch extending left
            ctx.fillStyle = '#228B22';
            ctx.fillRect(0, centerY - 1, width - 2, 2);

            // Connection to main stem (right side)
            ctx.fillRect(width - 2, centerY - 1, 2, 2);

            // Highlight
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(0, centerY - 1, width - 2, 1);

            // Small leaf at end
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(0, centerY - 2, 2, 1);
            ctx.fillRect(0, centerY + 1, 2, 1);
        } else {
            // Branch extending right
            ctx.fillStyle = '#228B22';
            ctx.fillRect(2, centerY - 1, width - 2, 2);

            // Connection to main stem (left side)
            ctx.fillRect(0, centerY - 1, 2, 2);

            // Highlight
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(2, centerY - 1, width - 2, 1);

            // Small leaf at end
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(width - 2, centerY - 2, 2, 1);
            ctx.fillRect(width - 2, centerY + 1, 2, 1);
        }

        return canvas;
    }

    createDiagonalSplitSprite(width, height, variant, direction) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const centerX = Math.floor(width / 2);

        // Get stem width for this variant
        const stemWidths = { 'straight': 2, 'curved': 2, 'thick': 4 };
        const stemWidth = stemWidths[variant];

        // Draw vertical input connection at bottom (connects to stem from below)
        ctx.fillStyle = '#228B22';
        const stemStartX = centerX - Math.floor(stemWidth / 2);
        ctx.fillRect(stemStartX, height - 2, stemWidth, 2);

        // Add highlight to input
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(stemStartX, height - 2, 1, 2);

        // Draw main split junction
        ctx.fillStyle = '#228B22';
        ctx.fillRect(stemStartX, 3, stemWidth, 2);

        if (direction === 'left') {
            // Left split: 15° right branch + 45° left branch

            // 15° right branch (nearly vertical: 1px right per 4px up)
            ctx.fillStyle = '#228B22';
            for (let y = 0; y < 4; y++) {
                const x = centerX + Math.floor(y / 4); // 15° angle
                if (variant === 'thick') {
                    ctx.fillRect(x, 3 - y, 2, 1);
                    ctx.fillStyle = '#32CD32';
                    ctx.fillRect(x, 3 - y, 1, 1);
                    ctx.fillStyle = '#228B22';
                } else {
                    ctx.fillRect(x, 3 - y, 1, 1);
                    if (y < 2) {
                        ctx.fillStyle = '#32CD32';
                        ctx.fillRect(x, 3 - y, 1, 1);
                        ctx.fillStyle = '#228B22';
                    }
                }
            }

            // 45° left branch (1px left per 1px up)
            ctx.fillStyle = '#228B22';
            for (let i = 0; i < 4; i++) {
                const x = centerX - i - 1;
                const y = 3 - i;
                if (x >= 0 && y >= 0) {
                    if (variant === 'thick') {
                        ctx.fillRect(x, y, 2, 1);
                        ctx.fillStyle = '#32CD32';
                        ctx.fillRect(x, y, 1, 1);
                        ctx.fillStyle = '#228B22';
                    } else {
                        ctx.fillRect(x, y, 1, 1);
                        if (i < 2) {
                            ctx.fillStyle = '#32CD32';
                            ctx.fillRect(x, y, 1, 1);
                            ctx.fillStyle = '#228B22';
                        }
                    }
                }
            }

        } else {
            // Right split: 45° right branch + 15° left branch

            // 45° right branch (1px right per 1px up)
            ctx.fillStyle = '#228B22';
            for (let i = 0; i < 4; i++) {
                const x = centerX + i + 1;
                const y = 3 - i;
                if (x < width && y >= 0) {
                    if (variant === 'thick') {
                        ctx.fillRect(x - 1, y, 2, 1);
                        ctx.fillStyle = '#32CD32';
                        ctx.fillRect(x - 1, y, 1, 1);
                        ctx.fillStyle = '#228B22';
                    } else {
                        ctx.fillRect(x, y, 1, 1);
                        if (i < 2) {
                            ctx.fillStyle = '#32CD32';
                            ctx.fillRect(x, y, 1, 1);
                            ctx.fillStyle = '#228B22';
                        }
                    }
                }
            }

            // 15° left branch (nearly vertical: 1px left per 4px up)
            ctx.fillStyle = '#228B22';
            for (let y = 0; y < 4; y++) {
                const x = centerX - Math.floor(y / 4); // 15° angle
                if (variant === 'thick') {
                    ctx.fillRect(x - 1, 3 - y, 2, 1);
                    ctx.fillStyle = '#32CD32';
                    ctx.fillRect(x - 1, 3 - y, 1, 1);
                    ctx.fillStyle = '#228B22';
                } else {
                    ctx.fillRect(x, 3 - y, 1, 1);
                    if (y < 2) {
                        ctx.fillStyle = '#32CD32';
                        ctx.fillRect(x, 3 - y, 1, 1);
                        ctx.fillStyle = '#228B22';
                    }
                }
            }
        }

        // Add variant-specific details
        if (variant === 'curved') {
            // Add organic curve details
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(centerX - 1, 2, 1, 1);
        } else if (variant === 'thick') {
            // Add texture to thick splits
            ctx.fillStyle = '#1F5F1F';
            ctx.fillRect(centerX, 4, 1, 1);
        }

        return canvas;
    }

    createRootSprite(width, height, type) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#F5F5DC';

        if (type === 'main') {
            // Main root
            ctx.fillRect(7, 0, 2, height);
            ctx.fillRect(6, height - 4, 4, 2);
        } else if (type === 'branch') {
            // Branch root
            ctx.fillRect(0, 3, width, 2);
        } else {
            // Small root
            ctx.fillRect(0, 1, width, 2);
        }

        return canvas;
    }

    createSweetpeaSprite(width, height, variant) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);

        // Color schemes for variants
        const colors = {
            white: {
                primary: '#F8F8FF',
                secondary: '#E6E6FA',
                accent: '#D8BFD8',
                center: '#FFE4B5'
            },
            pink: {
                primary: '#FFB6C1',
                secondary: '#FF91A4',
                accent: '#FF69B4',
                center: '#FFF8DC'
            }
        };

        const colorScheme = colors[variant];

        // Draw main flower body (sweetpea characteristic shape)
        ctx.fillStyle = colorScheme.primary;

        // Standard/banner petal (top large petal)
        ctx.fillRect(centerX - 6, centerY - 8, 12, 8);
        ctx.fillRect(centerX - 7, centerY - 6, 2, 4);
        ctx.fillRect(centerX + 5, centerY - 6, 2, 4);

        // Wing petals (side petals)
        ctx.fillStyle = colorScheme.secondary;
        ctx.fillRect(centerX - 8, centerY - 2, 6, 6);
        ctx.fillRect(centerX + 2, centerY - 2, 6, 6);

        // Keel petals (bottom fused petals)
        ctx.fillStyle = colorScheme.accent;
        ctx.fillRect(centerX - 4, centerY + 2, 8, 4);
        ctx.fillRect(centerX - 5, centerY + 4, 10, 2);

        // Add details and texture
        ctx.fillStyle = colorScheme.primary;
        // Petal veining
        ctx.fillRect(centerX - 1, centerY - 7, 1, 6);
        ctx.fillRect(centerX, centerY - 7, 1, 6);
        ctx.fillRect(centerX + 1, centerY - 7, 1, 6);

        // Wing petal details
        ctx.fillStyle = colorScheme.accent;
        ctx.fillRect(centerX - 6, centerY, 2, 1);
        ctx.fillRect(centerX + 4, centerY, 2, 1);

        // Center/pistil area
        ctx.fillStyle = colorScheme.center;
        ctx.fillRect(centerX - 1, centerY - 1, 2, 3);

        // Small highlight on standard petal
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(centerX - 2, centerY - 6, 1, 1);
        ctx.fillRect(centerX + 1, centerY - 6, 1, 1);

        return canvas;
    }

    createRootSprite(width, height, type) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#F5F5DC';

        if (type === 'main') {
            ctx.fillRect(7, 0, 2, height);
            ctx.fillRect(6, height - 4, 4, 2);
        } else if (type === 'branch') {
            ctx.fillRect(0, 3, width, 2);
        } else {
            ctx.fillRect(0, 1, width, 2);
        }

        return canvas;
    }

    createSplashTextSprite() {
        // Create "Click anywhere" text in white pixels
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // White pixel text "Click anywhere"
        ctx.fillStyle = '#FFFFFF';

        // C (0-6)
        ctx.fillRect(1, 2, 4, 1); // top
        ctx.fillRect(0, 3, 1, 8); // left side
        ctx.fillRect(1, 11, 4, 1); // bottom

        // l (8-9)
        ctx.fillRect(8, 1, 1, 12);

        // i (11-12)
        ctx.fillRect(11, 2, 1, 1); // dot
        ctx.fillRect(11, 4, 1, 9);

        // c (14-19)
        ctx.fillRect(15, 5, 3, 1); // top
        ctx.fillRect(14, 6, 1, 6); // left side
        ctx.fillRect(15, 12, 3, 1); // bottom

        // k (21-26)
        ctx.fillRect(21, 1, 1, 12); // vertical line
        ctx.fillRect(22, 7, 1, 1); // middle
        ctx.fillRect(23, 6, 1, 1); // upper diagonal
        ctx.fillRect(24, 5, 1, 1);
        ctx.fillRect(23, 8, 1, 1); // lower diagonal
        ctx.fillRect(24, 9, 1, 1);

        // (space)

        // a (30-35)
        ctx.fillRect(31, 5, 3, 1); // top
        ctx.fillRect(30, 6, 1, 7); // left side
        ctx.fillRect(34, 6, 1, 7); // right side
        ctx.fillRect(31, 8, 3, 1); // middle

        // n (37-42)
        ctx.fillRect(37, 5, 1, 8); // left
        ctx.fillRect(38, 5, 1, 1); // top connector
        ctx.fillRect(39, 6, 1, 1); // diagonal
        ctx.fillRect(40, 7, 1, 1);
        ctx.fillRect(41, 8, 1, 5); // right

        // y (44-49)
        ctx.fillRect(44, 5, 1, 4); // left top
        ctx.fillRect(48, 5, 1, 4); // right top
        ctx.fillRect(45, 9, 1, 1); // middle connection
        ctx.fillRect(46, 10, 1, 3); // bottom stem

        // w (51-58)
        ctx.fillRect(51, 5, 1, 8); // left
        ctx.fillRect(52, 12, 1, 1); // bottom left
        ctx.fillRect(53, 11, 1, 1); // diagonal up
        ctx.fillRect(54, 10, 1, 1); // middle peak
        ctx.fillRect(55, 11, 1, 1); // diagonal down
        ctx.fillRect(56, 12, 1, 1); // bottom right
        ctx.fillRect(57, 5, 1, 8); // right

        // h (60-65)
        ctx.fillRect(60, 1, 1, 12); // left
        ctx.fillRect(61, 8, 3, 1); // middle bar
        ctx.fillRect(64, 5, 1, 8); // right

        // e (67-72)
        ctx.fillRect(67, 5, 1, 8); // left side
        ctx.fillRect(68, 5, 4, 1); // top
        ctx.fillRect(68, 8, 3, 1); // middle
        ctx.fillRect(68, 12, 4, 1); // bottom

        // r (74-78)
        ctx.fillRect(74, 5, 1, 8); // left side
        ctx.fillRect(75, 5, 2, 1); // top
        ctx.fillRect(77, 6, 1, 2); // right top
        ctx.fillRect(75, 8, 2, 1); // middle

        // e (80-85)
        ctx.fillRect(80, 5, 1, 8); // left side
        ctx.fillRect(81, 5, 4, 1); // top
        ctx.fillRect(81, 8, 3, 1); // middle
        ctx.fillRect(81, 12, 4, 1); // bottom

        return canvas;
    }

    createPixelHeartSprite() {
        // Create red pixel heart
        const canvas = document.createElement('canvas');
        canvas.width = 12;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#FF0000'; // Red color

        // Heart shape in pixels
        ctx.fillRect(2, 1, 2, 2); // left top
        ctx.fillRect(6, 1, 2, 2); // right top
        ctx.fillRect(1, 3, 8, 1); // wide middle
        ctx.fillRect(2, 4, 6, 1); // narrowing
        ctx.fillRect(3, 5, 4, 1); // more narrow
        ctx.fillRect(4, 6, 2, 1); // narrow
        ctx.fillRect(5, 7, 1, 1); // point

        return canvas;
    }

    async loadSVGSprite(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log(`Successfully loaded: ${path}`);
                resolve(img);
            };
            img.onerror = (error) => {
                console.error(`Failed to load: ${path}`, error);
                reject(error);
            };
            img.src = path;
        });
    }

    async loadSpriteWithTransparency(path, threshold = 250) {
        // Load image and remove white/near-white background
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas to process the image
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;

                // Draw the image
                ctx.drawImage(img, 0, 0);

                // Get image data and remove white pixels
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // If pixel is white or near-white, make it transparent
                    if (r >= threshold && g >= threshold && b >= threshold) {
                        data[i + 3] = 0; // Set alpha to 0
                    }
                }

                // Put processed data back
                ctx.putImageData(imageData, 0, 0);

                console.log(`Successfully loaded with transparency: ${path}`);
                resolve(canvas);
            };
            img.onerror = (error) => {
                console.error(`Failed to load: ${path}`, error);
                reject(error);
            };
            img.src = path;
        });
    }

    async loadMountainSprites() {
        try {
            // Load the single PNG mountain panorama
            this.sprites.mountain_background = await this.loadSVGSprite('sprites/Mountain.png');
            console.log('Mountain background PNG loaded successfully');
        } catch (error) {
            console.error('Failed to load mountain sprite:', error);
        }
    }

    createMountainPanorama(width, height, layer) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Define color palettes for each layer with atmospheric perspective
        const layerPalettes = {
            far: {
                base: '#9BB3C7',      // Light blue-gray (most distant)
                mid: '#8DA6BA',       // Slightly darker blue-gray
                dark: '#7A92A5',      // Darker blue-gray for shadows
                accent: '#B4C7DB'     // Lighter accent
            },
            mid: {
                base: '#7A9BB8',      // Medium blue-gray
                mid: '#6B8CA9',       // Darker blue-gray
                dark: '#5C7D9A',      // Dark blue-gray for shadows
                accent: '#8FACC9'     // Light accent
            },
            near: {
                base: '#5F8AA6',      // Darker blue-gray (closest)
                mid: '#507B97',       // Dark blue-gray
                dark: '#416C88',      // Very dark blue-gray for shadows
                accent: '#6E99B5'     // Medium accent
            }
        };

        const palette = layerPalettes[layer];

        // Create 5 unique interconnected mountains across the panorama
        const mountainData = this.generateMountainData(width, height, layer);

        // Render the continuous mountain silhouette
        this.renderMountainSilhouette(ctx, mountainData, palette, width, height);

        return canvas;
    }

    generateMountainData(width, height, layer) {
        // Create 5 distinct mountain profiles that connect seamlessly
        const mountainCount = 5;
        const sectionWidth = width / mountainCount;
        const mountains = [];

        // Define mountain characteristics for each layer - dramatic underground vista
        const layerConfig = {
            far: {
                minHeight: height * 0.4,
                maxHeight: height * 0.8,
                roughness: 0.2,
                peakSharpness: 0.8,  // Much sharper peaks
                peakOffset: 0        // No offset for far layer (base reference)
            },
            mid: {
                minHeight: height * 0.5,
                maxHeight: height * 0.9,
                roughness: 0.3,
                peakSharpness: 0.9,  // Very sharp peaks
                peakOffset: 64       // Offset peaks by 64px from far layer
            },
            near: {
                minHeight: height * 0.6,
                maxHeight: height * 0.95,
                roughness: 0.4,
                peakSharpness: 1.0,  // Extremely sharp peaks
                peakOffset: 128      // Offset peaks by 128px from far layer
            }
        };

        const config = layerConfig[layer];

        // Generate each mountain section with peak offsetting
        for (let i = 0; i < mountainCount; i++) {
            const startX = i * sectionWidth;
            const endX = (i + 1) * sectionWidth;

            // Create unique mountain profile with layer-specific peak offset
            const mountain = this.createMountainProfile(startX, endX, config, i, layer);
            mountains.push(mountain);
        }

        // Connect mountains with smooth transitions
        this.connectMountains(mountains, sectionWidth);

        return mountains.flat(); // Flatten to single array of points
    }

    createMountainProfile(startX, endX, config, mountainIndex, layer) {
        const points = [];
        const stepSize = 1; // Higher resolution for sharper detail

        // Emphasize dramatic peak types for underground vista
        const mountainTypes = ['peak', 'jagged', 'ridge', 'needle', 'spire'];
        const type = mountainTypes[mountainIndex % mountainTypes.length];

        // Apply peak offset based on layer
        const offsetX = config.peakOffset || 0;

        for (let x = startX; x <= endX; x += stepSize) {
            // Apply horizontal offset to create staggered peak arrangement
            const offsetProgress = ((x + offsetX) - startX) / (endX - startX);
            const wrappedProgress = offsetProgress % 1; // Wrap around if offset pushes beyond bounds
            let y;

            switch (type) {
                case 'peak':
                    // Extremely sharp central peak
                    y = this.createSharpPeakProfile(wrappedProgress, config);
                    break;
                case 'ridge':
                    // Sharp ridge with dramatic peaks
                    y = this.createSharpRidgeProfile(wrappedProgress, config);
                    break;
                case 'jagged':
                    // Very jagged, angular peaks
                    y = this.createJaggedProfile(wrappedProgress, config);
                    break;
                case 'needle':
                    // Thin needle-like peaks
                    y = this.createNeedleProfile(wrappedProgress, config);
                    break;
                case 'spire':
                    // Tall spire formations
                    y = this.createSpireProfile(wrappedProgress, config);
                    break;
            }

            // Reduce natural variation for sharper, cleaner lines
            y += (Math.random() - 0.5) * config.roughness * 5;

            points.push({ x: Math.round(x), y: Math.round(y) });
        }

        return points;
    }

    createSharpPeakProfile(progress, config) {
        // Extremely sharp triangular peak - much more dramatic
        const peak = progress < 0.5 ?
            progress * 2 : // Rising slope
            2 - (progress * 2); // Falling slope

        // Use extreme sharpness with power function for needle-sharp peaks
        const sharpness = Math.pow(peak, config.peakSharpness * 2); // Double the sharpness
        const height = config.minHeight + (config.maxHeight - config.minHeight) * sharpness;
        return height;
    }

    createSharpRidgeProfile(progress, config) {
        // Sharp ridge with multiple dramatic peaks
        const ridgeBase = 0.4 + 0.2 * Math.sin(progress * Math.PI * 4);

        // Create 3 sharp peaks along the ridge
        const peak1 = Math.max(0, 1 - Math.abs(progress - 0.2) * 12); // Sharp peak at 20%
        const peak2 = Math.max(0, 1 - Math.abs(progress - 0.5) * 15); // Sharper peak at 50%
        const peak3 = Math.max(0, 1 - Math.abs(progress - 0.8) * 10); // Sharp peak at 80%

        // Use power function for sharper peaks
        const sharpPeak1 = Math.pow(peak1, config.peakSharpness);
        const sharpPeak2 = Math.pow(peak2, config.peakSharpness);
        const sharpPeak3 = Math.pow(peak3, config.peakSharpness);

        const combined = Math.max(ridgeBase, sharpPeak1 * 0.7, sharpPeak2 * 0.9, sharpPeak3 * 0.6);
        return config.minHeight + (config.maxHeight - config.minHeight) * combined;
    }

    createRollingProfile(progress, config) {
        // Gentle rolling waves
        const roll1 = Math.sin(progress * Math.PI * 2) * 0.3 + 0.7;
        const roll2 = Math.sin(progress * Math.PI * 4 + 1) * 0.2;

        const combined = Math.max(0.3, roll1 + roll2);
        return config.minHeight + (config.maxHeight - config.minHeight) * combined;
    }

    createJaggedProfile(progress, config) {
        // Very sharp, angular jagged peaks
        let jagged = 0;

        // Create more aggressive jagged pattern
        for (let i = 1; i <= 6; i++) {
            const frequency = i * 3; // Higher frequency for more jagged appearance
            const amplitude = 0.4 / i;
            jagged += Math.sin(progress * Math.PI * frequency) * amplitude;
        }

        // Create sharp angular transitions instead of smooth
        const segments = 16; // Divide into segments for angular effect
        const segmentIndex = Math.floor(progress * segments);
        const segmentProgress = (progress * segments) % 1;

        // Sharp transitions between segments
        const angularJagged = segmentProgress < 0.5 ?
            segmentProgress * 2 :
            2 - (segmentProgress * 2);

        const combined = Math.abs(jagged) + angularJagged * 0.3 + 0.5;
        return config.minHeight + (config.maxHeight - config.minHeight) * Math.pow(combined, config.peakSharpness);
    }

    createNeedleProfile(progress, config) {
        // Thin needle-like peaks - very sharp and tall
        const needleWidth = 0.1; // Very narrow peaks
        const peakPositions = [0.15, 0.4, 0.65, 0.85]; // Multiple needle positions

        let maxHeight = 0;
        peakPositions.forEach(peakPos => {
            const distance = Math.abs(progress - peakPos);
            if (distance < needleWidth) {
                const needleHeight = 1 - (distance / needleWidth);
                maxHeight = Math.max(maxHeight, Math.pow(needleHeight, config.peakSharpness * 3));
            }
        });

        const baseHeight = 0.3 + 0.1 * Math.sin(progress * Math.PI * 8);
        const combined = Math.max(baseHeight, maxHeight);

        return config.minHeight + (config.maxHeight - config.minHeight) * combined;
    }

    createSpireProfile(progress, config) {
        // Tall spire formations - dramatic vertical structures
        const spirePositions = [0.25, 0.75]; // Two main spires
        let maxHeight = 0;

        spirePositions.forEach(spirePos => {
            const distance = Math.abs(progress - spirePos);
            if (distance < 0.15) {
                // Create asymmetric spire (steeper on one side)
                const spireProgress = (progress - spirePos + 0.15) / 0.3;
                let spireHeight;

                if (spireProgress < 0.3) {
                    // Steep rise
                    spireHeight = Math.pow(spireProgress / 0.3, 0.5);
                } else if (spireProgress < 0.7) {
                    // Peak plateau
                    spireHeight = 1;
                } else {
                    // Sharp drop
                    spireHeight = Math.pow((1 - spireProgress) / 0.3, 2);
                }

                maxHeight = Math.max(maxHeight, spireHeight * Math.pow(0.9, distance * 10));
            }
        });

        const baseHeight = 0.4 + 0.2 * Math.sin(progress * Math.PI * 6);
        const combined = Math.max(baseHeight, maxHeight);

        return config.minHeight + (config.maxHeight - config.minHeight) * combined;
    }

    connectMountains(mountains, sectionWidth) {
        // Smooth transitions between mountain sections
        for (let i = 0; i < mountains.length - 1; i++) {
            const currentSection = mountains[i];
            const nextSection = mountains[i + 1];

            if (currentSection.length > 0 && nextSection.length > 0) {
                const lastPoint = currentSection[currentSection.length - 1];
                const firstPoint = nextSection[0];

                // Create smooth transition over 10 pixels
                const transitionWidth = 10;
                const yDiff = firstPoint.y - lastPoint.y;

                for (let t = 1; t < transitionWidth; t++) {
                    const progress = t / transitionWidth;
                    const smoothProgress = progress * progress * (3 - 2 * progress); // Smoothstep

                    const transitionPoint = {
                        x: lastPoint.x + t,
                        y: lastPoint.y + yDiff * smoothProgress
                    };

                    currentSection.push(transitionPoint);
                }
            }
        }
    }

    renderMountainSilhouette(ctx, mountainData, palette, width, height) {
        // Create the mountain path
        ctx.beginPath();
        ctx.moveTo(0, height); // Start at bottom left

        // Draw mountain outline
        mountainData.forEach((point, index) => {
            if (index === 0) {
                ctx.lineTo(point.x, height - point.y);
            } else {
                ctx.lineTo(point.x, height - point.y);
            }
        });

        // Complete the shape
        ctx.lineTo(width, height); // Bottom right
        ctx.lineTo(0, height); // Close path
        ctx.closePath();

        // Fill base mountain shape
        ctx.fillStyle = palette.base;
        ctx.fill();

        // Add atmospheric shading and depth
        this.addMountainShading(ctx, mountainData, palette, width, height);
    }

    addMountainShading(ctx, mountainData, palette, width, height) {
        // Add gradient shading for depth
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, palette.accent);
        gradient.addColorStop(0.3, palette.base);
        gradient.addColorStop(0.7, palette.mid);
        gradient.addColorStop(1, palette.dark);

        ctx.beginPath();
        ctx.moveTo(0, height);
        mountainData.forEach((point) => {
            ctx.lineTo(point.x, height - point.y);
        });
        ctx.lineTo(width, height);
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();

        // Add subtle pixel details for texture
        this.addMountainDetails(ctx, mountainData, palette, width, height);
    }

    addMountainDetails(ctx, mountainData, palette, width, height) {
        // Add snow caps, ridges, and shadows for realism
        mountainData.forEach((point, index) => {
            const mountainHeight = height - point.y;

            // Add snow on high peaks (top 20% of mountain)
            if (mountainHeight > height * 0.8) {
                if (Math.random() > 0.7) {
                    ctx.fillStyle = palette.accent;
                    ctx.fillRect(point.x, point.y, 1, 1);
                }
            }

            // Add ridge highlights
            if (index > 0 && index < mountainData.length - 1) {
                const prevPoint = mountainData[index - 1];
                const nextPoint = mountainData[index + 1];

                // Detect peaks (local maxima)
                if (point.y > prevPoint.y && point.y > nextPoint.y) {
                    ctx.fillStyle = palette.accent;
                    ctx.fillRect(point.x, height - point.y, 1, 1);
                }

                // Detect valleys for shadows
                if (point.y < prevPoint.y && point.y < nextPoint.y) {
                    ctx.fillStyle = palette.dark;
                    ctx.fillRect(point.x, height - point.y, 1, 2);
                }
            }
        });
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            this.handleCanvasClick(x, y);
        });
    }

    handleCanvasClick(x, y) {
        console.log('Click detected at:', x, y, 'App state:', this.appState);

        // Handle splash screen click
        if (this.appState === 'splash') {
            console.log('Starting transition from splash screen...');
            this.startTransitionSequence();
            return;
        }

        // Only process clicks in main state
        if (this.appState !== 'main') {
            console.log('Click ignored - app state is:', this.appState);
            return;
        }

        // First check if click is on a planted gift
        const clickedGift = this.checkPlantedGiftClick(x, y);
        if (clickedGift) {
            this.handleGiftClick(clickedGift);
            return;
        }

        // Check if click is on a gem button (legacy)
        const clickedGem = this.checkGemButtonClick(x, y);
        if (clickedGem) {
            this.handleGemClick(clickedGem);
            return;
        }

        // Start the growth sequence (multiple can run in parallel)
        this.startFullGrowthSequence(x, y);
    }

    checkPlantedGiftClick(x, y) {
        if (!this.sprites.seed) return null;

        for (let gift of this.scene.plantedGifts) {
            if (gift.visible && !gift.clicked) {
                const giftHalfWidth = this.sprites.seed.width / 2;
                const giftHalfHeight = this.sprites.seed.height / 2;

                // Check if click is within gift bounds
                if (x >= gift.x - giftHalfWidth &&
                    x <= gift.x + giftHalfWidth &&
                    y >= gift.y - giftHalfHeight &&
                    y <= gift.y + giftHalfHeight) {
                    return gift;
                }
            }
        }
        return null;
    }

    handleGiftClick(gift) {
        gift.clicked = true;
        // Gift stays visible but shows opened sprite
        console.log(`Gift clicked! Loading Photo ${gift.photoNumber} from Photos folder`);

        // Remove all balloons associated with this gift
        this.scene.risingBalloons = this.scene.risingBalloons.filter(balloon => {
            return balloon.giftX !== gift.x || balloon.giftY !== gift.y;
        });

        // Load and display the associated photo
        this.displayPhoto(gift.photoNumber);

        // Check for end condition after gift click
        this.checkEndCondition();
    }

    checkGemButtonClick(x, y) {
        if (!this.sprites.gem) return null;

        for (let gemButton of this.scene.gemButtons) {
            if (gemButton.visible && !gemButton.clicked) {
                const gemHalfWidth = this.sprites.gem.width / 2;
                const gemHalfHeight = this.sprites.gem.height / 2;

                // Check if click is within gem button bounds
                if (x >= gemButton.x - gemHalfWidth &&
                    x <= gemButton.x + gemHalfWidth &&
                    y >= gemButton.y - gemHalfHeight &&
                    y <= gemButton.y + gemHalfHeight) {
                    return gemButton;
                }
            }
        }
        return null;
    }

    handleGemClick(gemButton) {
        gemButton.clicked = true;
        gemButton.visible = false; // Make gem disappear when clicked
        console.log(`Gem clicked! Loading Photo ${gemButton.photoNumber} from Photos folder`);

        // Load and display the associated photo
        this.displayPhoto(gemButton.photoNumber);

        // Check for end condition after gem click
        this.checkEndCondition();
    }

    displayPhoto(photoNumber) {
        // Create photo filename using the random photo number
        const photoPath = `Photos/Photo ${photoNumber}.jpg`; // Format: "Photo 1.jpg", "Photo 2.jpg", etc.

        // Create modal overlay to display the photo
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            cursor: pointer;
        `;

        const img = document.createElement('img');
        img.src = photoPath;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        `;

        img.onerror = () => {
            console.error(`Failed to load photo: ${photoPath}`);
            modal.innerHTML = `<div style="color: white; font-size: 24px;">Photo ${photoNumber} not found</div>`;
        };

        modal.appendChild(img);
        document.body.appendChild(modal);

        // Close modal on click
        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    async startTransitionSequence() {
        console.log('Transition sequence started!');
        console.log('Previous appState:', this.appState);
        this.appState = 'transitioning';
        console.log('New appState:', this.appState);

        // Single slide up animation (1200ms)
        console.log('Sliding up to garden');
        await this.animateTransition('slideUp', 1200);

        // Transition complete
        console.log('Transition complete!');
        this.appState = 'main';
    }

    async animateTransition(phase, duration) {
        return new Promise((resolve) => {
            this.transitionData.phase = phase;
            this.transitionData.progress = 0;
            this.transitionData.startTime = Date.now();
            this.transitionData.duration = duration;

            // Check progress in an interval instead of RAF
            const checkProgress = setInterval(() => {
                const elapsed = Date.now() - this.transitionData.startTime;
                this.transitionData.progress = Math.min(elapsed / duration, 1);

                if (this.transitionData.progress >= 1) {
                    clearInterval(checkProgress);
                    resolve();
                }
            }, 16); // ~60fps
        });
    }

    // Complete growth sequence triggered by click
    startFullGrowthSequence(clickX, clickY) {
        // Check if we have seeds left
        if (this.scene.seedCounter <= 0) {
            console.log('No seeds remaining!');
            return;
        }

        // Decrement seed counter
        this.scene.seedCounter--;
        console.log(`Seed planted! Seeds remaining: ${this.scene.seedCounter}`);

        // Check for end condition after planting
        this.checkEndCondition();

        // Create falling gift object
        const fallingGift = {
            x: clickX,
            y: clickY,
            photoNumber: this.getNextPhotoNumber(),
            startY: clickY,
            startTime: Date.now()
        };

        // Add to falling gifts array
        this.scene.fallingGifts.push(fallingGift);

        // Animation runs via render loop - no blocking
    }

    spawnRisingBalloons(giftX, giftCenterY) {
        // giftCenterY is the center of the planted gift - string connects to center
        const giftTopY = giftCenterY - (this.sprites.seed.height * 2.5) / 2; // Top of scaled gift for balloon start

        // Spawn 4-8 balloons
        const balloonCount = 4 + Math.floor(Math.random() * 5); // 4 to 8
        const balloonVariants = ['balloonBlue', 'balloonGreen', 'balloonRed', 'balloonYellow'];

        for (let i = 0; i < balloonCount; i++) {
            const selectedBalloon = balloonVariants[Math.floor(Math.random() * balloonVariants.length)];
            // Random target height between 60 and 150 pixels above the gift
            const targetHeight = 60 + Math.floor(Math.random() * 90);
            // Spread balloons horizontally around the gift
            const xOffset = (i - (balloonCount - 1) / 2) * 12 + (Math.random() - 0.5) * 8;

            const balloon = {
                x: giftX + xOffset,
                y: giftTopY, // Start at top of gift
                targetY: giftTopY - targetHeight, // Where balloon will stop
                giftX: giftX, // Remember gift center for string
                giftY: giftCenterY, // Center of gift for string attachment
                spriteName: selectedBalloon,
                rising: true, // Still animating
                speed: 0.3 + Math.random() * 0.3 // Slightly varied speeds
            };

            this.scene.risingBalloons.push(balloon);
        }

        // Animation runs via render loop - no blocking needed
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Log current state
        if (this.appState === 'transitioning') {
            console.log('Render: transitioning state, phase:', this.transitionData.phase, 'progress:', this.transitionData.progress);
        }

        // Handle different application states
        if (this.appState === 'splash') {
            this.renderSplashScreen();
            requestAnimationFrame(() => this.render());
            return;
        } else if (this.appState === 'transitioning') {
            console.log('Calling renderTransition...');
            this.renderTransition();
            requestAnimationFrame(() => this.render());
            return;
        } else if (this.appState === 'ending') {
            this.renderEndingScreen();
            requestAnimationFrame(() => this.render());
            return;
        }

        // Apply camera transform for main scene
        this.ctx.save();
        this.ctx.scale(this.scene.camera.zoom, this.scene.camera.zoom);
        this.ctx.translate(-this.scene.camera.x, -this.scene.camera.y);

        // Render floor first (behind), then background on top
        this.renderWoodFloor();
        this.renderWorkshopBackground();

        // Render stems
        this.renderStems();

        // Render falling gifts
        this.renderSeed();

        // Render planted gifts (clickable)
        this.renderPlantedGifts();

        // Render rising balloons with strings
        this.renderRisingBalloons();

        // Render flowers (legacy - balloons now replace these)
        this.renderFlowers();

        // Render gem buttons (legacy - gifts now handle this)
        this.renderGemButtons();

        // Render seed counter UI
        this.renderSeedCounter();

        // Debug info
        if (this.debug) {
            this.renderDebugInfo();
        }

        this.ctx.restore();

        // Continue animation loop
        requestAnimationFrame(() => this.render());
    }

    checkEndCondition() {
        // Check if all seeds are used and no gifts/gems are visible
        const visibleGifts = this.scene.plantedGifts.filter(gift => gift.visible && !gift.clicked).length;
        const visibleGems = this.scene.gemButtons.filter(gem => gem.visible && !gem.clicked).length;

        if (this.scene.seedCounter <= 0 && visibleGifts === 0 && visibleGems === 0) {
            console.log('End condition met! Starting ending transition...');
            this.startEndingTransition();
        }
    }

    async startEndingTransition() {
        this.appState = 'transitioning';

        // Slide down to sky ending
        await this.animateTransition('slideToEnding', 1500);

        // Transition complete
        this.appState = 'ending';
        console.log('Transitioned to ending screen');

        // Start spawning ending balloons
        this.startEndingBalloons();
    }

    startEndingBalloons() {
        // Spawn a balloon every 500-1000ms
        const spawnBalloon = () => {
            if (this.appState !== 'ending') return;

            const balloonVariants = ['balloonBlue', 'balloonGreen', 'balloonRed', 'balloonYellow'];
            const selectedBalloon = balloonVariants[Math.floor(Math.random() * balloonVariants.length)];

            const balloon = {
                x: Math.random() * this.canvas.width,
                y: this.canvas.height + 50, // Start below screen
                spriteName: selectedBalloon,
                speed: 0.5 + Math.random() * 1.5 // Varying speeds between 0.5 and 2
            };

            this.scene.endingBalloons.push(balloon);

            // Schedule next balloon
            const nextSpawn = 250 + Math.random() * 250; // 250-500ms (doubled rate)
            setTimeout(spawnBalloon, nextSpawn);
        };

        // Start spawning
        spawnBalloon();
    }

    renderEndingScreen() {
        // Tile the sky sprite across the entire canvas
        const tileWidth = 32;
        const tileHeight = 32;

        for (let y = 0; y < this.canvas.height; y += tileHeight) {
            for (let x = 0; x < this.canvas.width; x += tileWidth) {
                this.ctx.drawImage(this.sprites.sky, x, y);
            }
        }

        // Render scattered clouds around edges
        this.renderEndingClouds();

        // Render and animate ending balloons
        this.renderEndingBalloons();

        // Draw the adoreYou sprite centered on screen (50% size)
        if (this.sprites.adoreYou) {
            const scale = 0.5;
            const scaledWidth = this.sprites.adoreYou.width * scale;
            const scaledHeight = this.sprites.adoreYou.height * scale;
            const spriteX = (this.canvas.width - scaledWidth) / 2;
            const spriteY = (this.canvas.height - scaledHeight) / 2;
            this.ctx.drawImage(this.sprites.adoreYou, spriteX, spriteY, scaledWidth, scaledHeight);
        }
    }

    renderEndingBalloons() {
        const balloonScale = 1.5; // Same scale as other balloons

        // Animate and render each balloon
        for (let i = this.scene.endingBalloons.length - 1; i >= 0; i--) {
            const balloon = this.scene.endingBalloons[i];
            const sprite = this.sprites[balloon.spriteName];
            if (!sprite) continue;

            // Move balloon up
            balloon.y -= balloon.speed;

            // Remove if off top of screen
            const scaledHeight = sprite.height * balloonScale;
            if (balloon.y + scaledHeight < 0) {
                this.scene.endingBalloons.splice(i, 1);
                continue;
            }

            // Render the balloon
            const scaledWidth = sprite.width * balloonScale;
            this.ctx.drawImage(sprite,
                balloon.x - scaledWidth / 2,
                balloon.y - scaledHeight / 2,
                scaledWidth, scaledHeight);
        }
    }

    renderEndingClouds() {
        // Generate 12 clouds scattered around edges with rotations
        const cloudPositions = [
            { x: 50, y: 40, type: 1, rotation: 0 },
            { x: this.canvas.width - 80, y: 30, type: 2, rotation: 90 },
            { x: 30, y: this.canvas.height - 60, type: 3, rotation: 180 },
            { x: this.canvas.width - 60, y: this.canvas.height - 50, type: 1, rotation: 270 },
            { x: this.canvas.width / 4, y: 25, type: 2, rotation: 0 },
            { x: 3 * this.canvas.width / 4, y: 35, type: 3, rotation: 90 },
            { x: 25, y: this.canvas.height / 3, type: 1, rotation: 180 },
            { x: this.canvas.width - 45, y: 2 * this.canvas.height / 3, type: 2, rotation: 270 },
            { x: this.canvas.width / 6, y: this.canvas.height - 45, type: 3, rotation: 0 },
            { x: 5 * this.canvas.width / 6, y: this.canvas.height - 35, type: 1, rotation: 90 },
            { x: 40, y: this.canvas.height / 2, type: 2, rotation: 180 },
            { x: this.canvas.width - 70, y: this.canvas.height / 2, type: 3, rotation: 270 }
        ];

        cloudPositions.forEach(cloud => {
            let cloudSprite;
            switch(cloud.type) {
                case 1: cloudSprite = this.sprites.cloud1; break;
                case 2: cloudSprite = this.sprites.cloud2; break;
                case 3: cloudSprite = this.sprites.cloud3; break;
            }

            if (cloudSprite) {
                this.ctx.save();
                this.ctx.translate(cloud.x, cloud.y);
                this.ctx.rotate((cloud.rotation * Math.PI) / 180);
                this.ctx.translate(-cloudSprite.width / 2, -cloudSprite.height / 2);
                this.ctx.drawImage(cloudSprite, 0, 0);
                this.ctx.restore();
            }
        });
    }

    renderSky() {
        const tileWidth = 32;
        const tileHeight = 32;
        const skyHeight = 190;

        for (let x = 0; x < this.canvas.width; x += tileWidth) {
            for (let y = 0; y < skyHeight; y += tileHeight) {
                this.ctx.drawImage(this.sprites.sky, x, y);
            }
        }
    }

    renderClouds() {
        // Render original 3 clouds
        const cloudSpacing = this.canvas.width / 4;

        if (this.sprites.cloud1) {
            const cloud1X = cloudSpacing - (this.sprites.cloud1.width / 2);
            const cloud1Y = 25;
            this.ctx.drawImage(this.sprites.cloud1, cloud1X, cloud1Y);
        }

        // Original cloud2 position
        if (this.sprites.cloud2) {
            const cloud2X = cloudSpacing * 2 - (this.sprites.cloud2.width / 2);
            const cloud2Y = 40;
            this.ctx.drawImage(this.sprites.cloud2, cloud2X, cloud2Y);
        }

        if (this.sprites.cloud3) {
            const cloud3X = cloudSpacing * 3 - (this.sprites.cloud3.width / 2);
            const cloud3Y = 30;
            this.ctx.drawImage(this.sprites.cloud3, cloud3X, cloud3Y);
        }

        // Add 4 more instances of cloud2 scattered around
        if (this.sprites.cloud2) {
            // Additional cloud2 instance 1 - far left
            const cloud2_1X = 40;
            const cloud2_1Y = 50;
            this.ctx.drawImage(this.sprites.cloud2, cloud2_1X, cloud2_1Y);

            // Additional cloud2 instance 2 - center-right
            const cloud2_2X = 420;
            const cloud2_2Y = 20;
            this.ctx.drawImage(this.sprites.cloud2, cloud2_2X, cloud2_2Y);

            // Additional cloud2 instance 3 - left-center
            const cloud2_3X = 180;
            const cloud2_3Y = 55;
            this.ctx.drawImage(this.sprites.cloud2, cloud2_3X, cloud2_3Y);

            // Additional cloud2 instance 4 - far right
            const cloud2_4X = 550;
            const cloud2_4Y = 45;
            this.ctx.drawImage(this.sprites.cloud2, cloud2_4X, cloud2_4Y);
        }

        // Add scattered cloud3 instances near cloud2 positions
        if (this.sprites.cloud3) {
            // Cloud3 near the first cloud2 (far left)
            const cloud3_1X = 85;
            const cloud3_1Y = 45;
            this.ctx.drawImage(this.sprites.cloud3, cloud3_1X, cloud3_1Y);

            // Cloud3 near the second cloud2 (center-right)
            const cloud3_2X = 380;
            const cloud3_2Y = 25;
            this.ctx.drawImage(this.sprites.cloud3, cloud3_2X, cloud3_2Y);

            // Cloud3 near the third cloud2 (left-center)
            const cloud3_3X = 220;
            const cloud3_3Y = 50;
            this.ctx.drawImage(this.sprites.cloud3, cloud3_3X, cloud3_3Y);

            // Cloud3 near the fourth cloud2 (far right)
            const cloud3_4X = 510;
            const cloud3_4Y = 40;
            this.ctx.drawImage(this.sprites.cloud3, cloud3_4X, cloud3_4Y);

            // Cloud3 near the original cloud2 position
            const cloud3_5X = 340;
            const cloud3_5Y = 35;
            this.ctx.drawImage(this.sprites.cloud3, cloud3_5X, cloud3_5Y);
        }
    }

    renderWorkshopBackground() {
        if (this.sprites.workshopBackground) {
            // Scale background to fit canvas width, maintaining aspect ratio
            const scale = this.canvas.width / this.sprites.workshopBackground.width;
            const scaledHeight = this.sprites.workshopBackground.height * scale;

            // Draw background scaled to canvas
            this.ctx.drawImage(
                this.sprites.workshopBackground,
                0, 0,
                this.sprites.workshopBackground.width, this.sprites.workshopBackground.height,
                0, 0,
                this.canvas.width, scaledHeight
            );
        }
    }

    renderWoodFloor() {
        if (this.sprites.woodFloor) {
            // Floor at the very bottom of the view
            const tileHeight = 64; // Fixed tile height
            const tileScale = tileHeight / this.sprites.woodFloor.height;
            const tileWidth = this.sprites.woodFloor.width * tileScale;
            const floorY = this.canvas.height - tileHeight;

            // Tile the floor horizontally
            for (let x = 0; x < this.canvas.width; x += tileWidth) {
                this.ctx.drawImage(
                    this.sprites.woodFloor,
                    0, 0,
                    this.sprites.woodFloor.width, this.sprites.woodFloor.height,
                    x, floorY,
                    tileWidth, tileHeight
                );
            }
        }
    }

    renderMountains() {
        // Render single mountain panorama background
        if (this.sprites.mountain_background) {
            const grassY = 190; // Grass line position
            const mountainY = grassY - this.sprites.mountain_background.height; // Position just above grass
            this.ctx.drawImage(this.sprites.mountain_background, 0, mountainY);
        }
    }

    renderGrass() {
        if (this.sprites.grass) {
            const tileWidth = this.sprites.grass.width;
            const tileHeight = this.sprites.grass.height;
            const grassY = 190 - 3; // Shift up by 3 pixels

            for (let x = 0; x < this.canvas.width; x += tileWidth) {
                this.ctx.drawImage(this.sprites.grass, x, grassY);
            }
        }
    }

    renderSoil() {
        const tileWidth = 32;
        const tileHeight = 32;
        const soilY = 190 + 16;

        for (let x = 0; x < this.canvas.width; x += tileWidth) {
            for (let y = soilY; y < this.canvas.height; y += tileHeight) {
                this.ctx.drawImage(this.sprites.soil, x, y);
            }
        }
    }

    renderSeed() {
        // Check if sprite is loaded
        if (!this.sprites.seed) return;
        if (!this.scene.fallingGifts || this.scene.fallingGifts.length === 0) {
            // Also check legacy seed
            if (this.scene.seed && this.scene.seed.visible) {
                const scale = 2.5;
                const scaledWidth = this.sprites.seed.width * scale;
                const scaledHeight = this.sprites.seed.height * scale;
                this.ctx.drawImage(this.sprites.seed,
                    this.scene.seed.x - scaledWidth / 2,
                    this.scene.seed.y - scaledHeight / 2,
                    scaledWidth, scaledHeight);
            }
            return;
        }

        // Render and animate all falling gifts
        const scale = 2.5;
        const scaledWidth = this.sprites.seed.width * scale;
        const scaledHeight = this.sprites.seed.height * scale;
        const spriteHeight = this.sprites.seed.height;
        const floorY = this.canvas.height - 64;
        const endY = floorY - spriteHeight / 2 + 30;
        const duration = 500;

        // Process each falling gift
        for (let i = this.scene.fallingGifts.length - 1; i >= 0; i--) {
            const gift = this.scene.fallingGifts[i];
            const elapsed = Date.now() - gift.startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Update position
            gift.y = gift.startY + (endY - gift.startY) * progress;

            // Render the gift
            this.ctx.drawImage(this.sprites.seed,
                gift.x - scaledWidth / 2,
                gift.y - scaledHeight / 2,
                scaledWidth, scaledHeight);

            // Check if landed
            if (progress >= 1) {
                // Add to planted gifts
                this.scene.plantedGifts.push({
                    x: gift.x,
                    y: endY,
                    photoNumber: gift.photoNumber,
                    clicked: false,
                    visible: true
                });

                // Spawn balloons for this gift
                this.spawnRisingBalloons(gift.x, endY);

                // Remove from falling array
                this.scene.fallingGifts.splice(i, 1);
            }
        }

        // Also render the legacy single seed if visible (for compatibility)
        if (this.scene.seed.visible) {
            this.ctx.drawImage(this.sprites.seed,
                this.scene.seed.x - scaledWidth / 2,
                this.scene.seed.y - scaledHeight / 2,
                scaledWidth, scaledHeight);
        }
    }

    renderRoots() {
        this.scene.roots.forEach(root => {
            this.ctx.save();
            this.ctx.translate(root.x, root.y);
            this.ctx.rotate(root.angle);

            let sprite;
            switch (root.type) {
                case 'main': sprite = this.sprites.rootMain; break;
                case 'branch': sprite = this.sprites.rootBranch; break;
                default: sprite = this.sprites.rootSmall; break;
            }

            this.ctx.drawImage(sprite, -sprite.width/2, -sprite.height/2);
            this.ctx.restore();
        });
    }

    renderStems() {
        this.scene.stems.forEach((plant, plantIndex) => {
            // Skip if plant is in pre-generation (not yet revealed)
            if (plant.visible === false) return;

            // Render all stem segments (can be at different x positions now)
            plant.segments.forEach((segment, segmentIndex) => {
                // Check if this segment should be visible based on reveal queue
                const revealItem = this.scene.revealQueue.find(item =>
                    item.type === 'segment' &&
                    item.plantIndex === plantIndex &&
                    item.elementIndex === segmentIndex
                );

                if (!revealItem || revealItem.visible) {
                    const stemX = segment.x - Math.floor(segment.width / 2);
                    const stemSprite = this.sprites[segment.spriteName];
                    this.ctx.drawImage(stemSprite, stemX, segment.y);
                }
            });

            // Render branches
            plant.branches.forEach((branch, branchIndex) => {
                // Check if this branch should be visible based on reveal queue
                const revealItem = this.scene.revealQueue.find(item =>
                    item.type === 'branch' &&
                    item.plantIndex === plantIndex &&
                    item.elementIndex === branchIndex
                );

                if (!revealItem || revealItem.visible) {
                    let branchSprite, branchX;

                    if (branch.type === 'diagonal_split') {
                        // Use new variant-specific diagonal split sprites
                        branchSprite = this.sprites[branch.spriteName];

                        // Center the diagonal split sprite on the stem (width varies by variant)
                        const spriteWidths = {
                            'splitStraightLeft': 14, 'splitStraightRight': 14,
                            'splitCurvedLeft': 16, 'splitCurvedRight': 16,
                            'splitThickLeft': 18, 'splitThickRight': 18
                        };
                        const spriteWidth = spriteWidths[branch.spriteName] || 16;
                        branchX = branch.x - Math.floor(spriteWidth / 2);
                    } else {
                        // Use legacy horizontal branch sprites for flower branches
                        branchSprite = branch.direction === 'left' ?
                            this.sprites.branchLeft : this.sprites.branchRight;

                        if (branch.direction === 'left') {
                            branchX = branch.x - 12;
                        } else {
                            branchX = branch.x - 0;
                        }
                    }

                    this.ctx.drawImage(branchSprite, branchX, branch.y - 4);
                }

                // Render flowers on this branch
                branch.flowers.forEach((flower, flowerIndex) => {
                    // Check if this flower should be visible based on reveal queue
                    const flowerRevealItem = this.scene.revealQueue.find(item =>
                        item.type === 'flower' &&
                        item.plantIndex === plantIndex &&
                        item.branchIndex === branchIndex &&
                        item.elementIndex === flowerIndex
                    );

                    if (!flowerRevealItem || flowerRevealItem.visible) {
                        const sprite = this.sprites[flower.spriteName];
                        // Sweetpea flowers are 24x24, so offset by 12
                        this.ctx.drawImage(sprite, flower.x - 12, flower.y - 12);
                    }
                });
            });
        });
    }

    renderFlowers() {
        this.scene.flowers.forEach(flower => {
            const sprite = this.sprites[flower.spriteName];
            // Sweetpea flowers are 24x24, so offset by 12
            this.ctx.drawImage(sprite, flower.x - 12, flower.y - 12);
        });
    }

    renderGemButtons() {
        this.scene.gemButtons.forEach(gemButton => {
            if (this.sprites.gem && gemButton.visible) {
                // Center the gem button
                const gemX = gemButton.x - (this.sprites.gem.width / 2);
                const gemY = gemButton.y - (this.sprites.gem.height / 2);
                this.ctx.drawImage(this.sprites.gem, gemX, gemY);
            }
        });
    }

    renderPlantedGifts() {
        const scale = 2.5; // Doubled in size
        this.scene.plantedGifts.forEach(gift => {
            if (gift.visible) {
                // Show opened gift if clicked, closed gift otherwise
                const sprite = gift.clicked ? this.sprites.giftOpen : this.sprites.seed;
                if (sprite) {
                    const scaledWidth = sprite.width * scale;
                    const scaledHeight = sprite.height * scale;
                    this.ctx.drawImage(sprite,
                        gift.x - scaledWidth / 2,
                        gift.y - scaledHeight / 2,
                        scaledWidth, scaledHeight);
                }
            }
        });
    }

    renderRisingBalloons() {
        const balloonScale = 1.5; // 50% bigger balloons
        this.scene.risingBalloons.forEach(balloon => {
            const sprite = this.sprites[balloon.spriteName];
            if (!sprite) return;

            // Animate rising balloons
            if (balloon.rising) {
                balloon.y -= balloon.speed;
                if (balloon.y <= balloon.targetY) {
                    balloon.y = balloon.targetY;
                    balloon.rising = false;
                }
            }

            const scaledWidth = sprite.width * balloonScale;
            const scaledHeight = sprite.height * balloonScale;

            // Draw the string first (behind balloon)
            // String goes from gift top-center to balloon bottom-center
            const balloonBottomY = balloon.y + scaledHeight / 2;

            this.ctx.beginPath();
            this.ctx.strokeStyle = '#C0C0C0'; // Light grey
            this.ctx.lineWidth = 2;
            this.ctx.moveTo(balloon.giftX, balloon.giftY);
            this.ctx.lineTo(balloon.x, balloonBottomY);
            this.ctx.stroke();

            // Draw the balloon
            this.ctx.drawImage(sprite,
                balloon.x - scaledWidth / 2,
                balloon.y - scaledHeight / 2,
                scaledWidth, scaledHeight);
        });
    }

    renderSeedCounter() {
        // Position in bottom right corner
        const padding = 10;
        const boxWidth = 80;
        const boxHeight = 30;
        const boxX = this.canvas.width - boxWidth - padding;
        const boxY = this.canvas.height - boxHeight - padding;

        // Draw brown border (2 pixels)
        this.ctx.fillStyle = '#8B4513'; // Brown color
        this.ctx.fillRect(boxX - 2, boxY - 2, boxWidth + 4, boxHeight + 4);

        // Draw green background
        this.ctx.fillStyle = '#228B22'; // Green color
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // Draw gift/seed icon (scaled to fit)
        if (this.sprites.seed) {
            const iconSize = 20; // Target size for icon
            const scale = Math.min(iconSize / this.sprites.seed.width, iconSize / this.sprites.seed.height);
            const scaledWidth = this.sprites.seed.width * scale;
            const scaledHeight = this.sprites.seed.height * scale;
            const seedX = boxX + 6;
            const seedY = boxY + (boxHeight / 2) - (scaledHeight / 2);
            this.ctx.drawImage(this.sprites.seed, seedX, seedY, scaledWidth, scaledHeight);
        }

        // Draw counter text
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';

        const textX = boxX + 30; // Position after gift icon
        const textY = boxY + (boxHeight / 2);
        this.ctx.fillText(this.scene.seedCounter.toString(), textX, textY);

        // Reset text alignment
        this.ctx.textAlign = 'start';
        this.ctx.textBaseline = 'alphabetic';
    }

    renderDebugInfo() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 100);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Stems: ${this.scene.stems.length}`, 15, 25);
        this.ctx.fillText(`Roots: ${this.scene.roots.length}`, 15, 40);
        this.ctx.fillText(`Flowers: ${this.scene.flowers.length}`, 15, 55);
        this.ctx.fillText(`Zoom: ${this.scene.camera.zoom.toFixed(2)}`, 15, 70);
        this.ctx.fillText(`Seed planted: ${this.scene.seed.planted}`, 15, 85);
    }

    renderSplashScreen() {
        console.log('Rendering splash screen...');
        // Tile the wood floor sprite across the entire canvas
        if (this.sprites.woodFloor) {
            const tileHeight = 64;
            const tileScale = tileHeight / this.sprites.woodFloor.height;
            const tileWidth = this.sprites.woodFloor.width * tileScale;

            for (let y = 0; y < this.canvas.height; y += tileHeight) {
                for (let x = 0; x < this.canvas.width; x += tileWidth) {
                    this.ctx.drawImage(
                        this.sprites.woodFloor,
                        0, 0,
                        this.sprites.woodFloor.width, this.sprites.woodFloor.height,
                        x, y,
                        tileWidth, tileHeight
                    );
                }
            }
        }

        // Draw the click anywhere sprite centered on screen at 62.5% scale (25% bigger than 50%)
        if (this.sprites.clickAnywhere) {
            const scaledWidth = this.sprites.clickAnywhere.width * 0.625;
            const scaledHeight = this.sprites.clickAnywhere.height * 0.625;
            const spriteX = (this.canvas.width - scaledWidth) / 2;
            const spriteY = (this.canvas.height - scaledHeight) / 2;
            this.ctx.drawImage(this.sprites.clickAnywhere, spriteX, spriteY, scaledWidth, scaledHeight);
        } else {
            // Fallback text if sprite fails to load
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Click anywhere', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = 'start';
            this.ctx.textBaseline = 'alphabetic';
        }
    }

    renderTransition() {
        const progress = this.transitionData.progress;
        console.log('renderTransition called - phase:', this.transitionData.phase, 'progress:', progress);

        if (this.transitionData.phase === 'slideUp') {
            console.log('Rendering slideUp phase');
            // Calculate slide amount
            const slideAmount = progress * this.canvas.height;

            // Render main garden scene sliding down from the top
            this.ctx.save();
            this.ctx.translate(0, -this.canvas.height + slideAmount);
            this.renderMainScene();
            this.ctx.restore();

            // Render splash screen sliding down and out
            this.ctx.save();
            this.ctx.translate(0, slideAmount);
            this.renderSplashScreen();
            this.ctx.restore();
        } else if (this.transitionData.phase === 'slideToEnding') {
            console.log('Rendering slideToEnding phase');
            // Calculate slide amount
            const slideAmount = progress * this.canvas.height;

            // Render ending screen sliding down from the top
            this.ctx.save();
            this.ctx.translate(0, -this.canvas.height + slideAmount);
            this.renderEndingScreen();
            this.ctx.restore();

            // Render main garden scene sliding down and out
            this.ctx.save();
            this.ctx.translate(0, slideAmount);
            this.renderMainScene();
            this.ctx.restore();
        }
    }

    renderMainScene() {
        // Apply camera transform for main scene
        this.ctx.save();
        this.ctx.scale(this.scene.camera.zoom, this.scene.camera.zoom);
        this.ctx.translate(-this.scene.camera.x, -this.scene.camera.y);

        // Render floor first (behind), then background on top
        this.renderWoodFloor();
        this.renderWorkshopBackground();

        // Render stems
        this.renderStems();

        // Render falling gifts
        this.renderSeed();

        // Render planted gifts (clickable)
        this.renderPlantedGifts();

        // Render rising balloons with strings
        this.renderRisingBalloons();

        // Render flowers (legacy)
        this.renderFlowers();

        // Render gem buttons (legacy)
        this.renderGemButtons();

        // Render seed counter UI
        this.renderSeedCounter();

        // Debug info
        if (this.debug) {
            this.renderDebugInfo();
        }

        this.ctx.restore();
    }

    // Animation scripting API methods
    async plantSeed() {
        if (this.scene.seed.planted) return;

        // Check performance limits
        if (this.scene.stems.length >= this.maxPlantsPerSession) {
            console.log('Maximum plants per session reached. Performance optimization active.');
            return;
        }

        if (this.activeStemCount >= this.maxActiveStems) {
            console.log('Maximum active stems reached. Waiting for current growth to complete.');
            return;
        }

        // Animate seed falling
        const startY = this.scene.seed.y;
        // Land with bottom of gift at floor level (bottom of canvas - floor height)
        const spriteHeight = this.sprites.seed.height;
        const floorY = this.canvas.height - 64; // Floor is 64px tall at bottom
        const endY = floorY - spriteHeight / 2 + 30; // 30 pixels lower
        const duration = 500; // Faster fall
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                this.scene.seed.y = startY + (endY - startY) * progress;

                if (progress >= 1) {
                    this.scene.seed.planted = true;
                    this.scene.seed.visible = false;

                    // Add gift to planted gifts array for click tracking
                    this.scene.plantedGifts.push({
                        x: this.scene.seed.x,
                        y: endY,
                        photoNumber: this.getNextPhotoNumber(),
                        clicked: false,
                        visible: true
                    });

                    resolve();
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        });
    }

    async growRoots() {
        // Select random root pattern (0, 1, or 2)
        const rootPattern = Math.floor(Math.random() * 3);

        const rootPatterns = {
            0: [ // Spreading pattern
                { type: 'main', angle: 0, delay: 0, xOffset: 0, yOffset: 0 },
                { type: 'branch', angle: -0.7, delay: 200, xOffset: -20, yOffset: 25 },
                { type: 'branch', angle: 0.7, delay: 300, xOffset: 20, yOffset: 25 },
                { type: 'small', angle: -1.2, delay: 500, xOffset: -35, yOffset: 45 },
                { type: 'small', angle: 1.2, delay: 600, xOffset: 35, yOffset: 45 },
                { type: 'small', angle: -0.3, delay: 800, xOffset: -15, yOffset: 65 },
                { type: 'small', angle: 0.3, delay: 900, xOffset: 15, yOffset: 65 }
            ],
            1: [ // Deep taproot pattern
                { type: 'main', angle: 0, delay: 0, xOffset: 0, yOffset: 0 },
                { type: 'main', angle: 0.1, delay: 100, xOffset: 5, yOffset: 30 },
                { type: 'main', angle: -0.1, delay: 200, xOffset: -5, yOffset: 60 },
                { type: 'branch', angle: -0.5, delay: 400, xOffset: -15, yOffset: 40 },
                { type: 'branch', angle: 0.5, delay: 500, xOffset: 15, yOffset: 40 },
                { type: 'small', angle: -0.8, delay: 700, xOffset: -25, yOffset: 70 },
                { type: 'small', angle: 0.8, delay: 800, xOffset: 25, yOffset: 70 }
            ],
            2: [ // Fibrous/bushy pattern
                { type: 'branch', angle: -0.4, delay: 0, xOffset: -10, yOffset: 0 },
                { type: 'branch', angle: 0.4, delay: 100, xOffset: 10, yOffset: 0 },
                { type: 'small', angle: -0.8, delay: 200, xOffset: -20, yOffset: 15 },
                { type: 'small', angle: 0.8, delay: 250, xOffset: 20, yOffset: 15 },
                { type: 'small', angle: -1.1, delay: 350, xOffset: -30, yOffset: 25 },
                { type: 'small', angle: 1.1, delay: 400, xOffset: 30, yOffset: 25 },
                { type: 'small', angle: -0.2, delay: 500, xOffset: -8, yOffset: 35 },
                { type: 'small', angle: 0.2, delay: 550, xOffset: 8, yOffset: 35 },
                { type: 'small', angle: -0.6, delay: 650, xOffset: -18, yOffset: 45 },
                { type: 'small', angle: 0.6, delay: 700, xOffset: 18, yOffset: 45 }
            ]
        };

        const selectedPattern = rootPatterns[rootPattern];
        const seedX = this.scene.seed.x;

        const promises = selectedPattern.map((config) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    this.scene.roots.push({
                        x: seedX + config.xOffset + (Math.random() - 0.5) * 10,
                        y: 210 + config.yOffset,
                        angle: config.angle + (Math.random() - 0.5) * 0.2,
                        type: config.type
                    });
                    resolve();
                }, config.delay);
            });
        });

        await Promise.all(promises);
    }

    async growStem(targetHeight = 170) {
        // Roots removed - flowers grow directly from gift

        // Pre-generate the complete plant structure first
        const plantStructure = await this.preGeneratePlant(targetHeight);

        // Add the complete plant to the scene (initially hidden)
        const plantIndex = this.scene.stems.length;
        this.scene.stems.push(plantStructure);

        // Create reveal queue for bottom-up animation
        this.createRevealQueue(plantIndex, plantStructure);

        // Start the reveal animation
        await this.startRevealAnimation(plantIndex);
    }

    async generateRootsInstantly() {
        // Generate random root pattern
        const rootPattern = Math.floor(Math.random() * 3);

        const rootPatterns = {
            0: [ // Spreading pattern
                { type: 'main', angle: 0, delay: 0, xOffset: 0, yOffset: 0 },
                { type: 'branch', angle: -0.7, delay: 0, xOffset: -20, yOffset: 25 },
                { type: 'branch', angle: 0.7, delay: 0, xOffset: 20, yOffset: 25 },
                { type: 'small', angle: -1.2, delay: 0, xOffset: -35, yOffset: 45 },
                { type: 'small', angle: 1.2, delay: 0, xOffset: 35, yOffset: 45 },
                { type: 'small', angle: -0.3, delay: 0, xOffset: -15, yOffset: 65 },
                { type: 'small', angle: 0.3, delay: 0, xOffset: 15, yOffset: 65 }
            ],
            1: [ // Deep taproot pattern
                { type: 'main', angle: 0, delay: 0, xOffset: 0, yOffset: 0 },
                { type: 'main', angle: 0.1, delay: 0, xOffset: 5, yOffset: 30 },
                { type: 'main', angle: -0.1, delay: 0, xOffset: -5, yOffset: 60 },
                { type: 'branch', angle: -0.5, delay: 0, xOffset: -15, yOffset: 40 },
                { type: 'branch', angle: 0.5, delay: 0, xOffset: 15, yOffset: 40 },
                { type: 'small', angle: -0.8, delay: 0, xOffset: -25, yOffset: 70 },
                { type: 'small', angle: 0.8, delay: 0, xOffset: 25, yOffset: 70 }
            ],
            2: [ // Fibrous/bushy pattern
                { type: 'branch', angle: -0.4, delay: 0, xOffset: -10, yOffset: 0 },
                { type: 'branch', angle: 0.4, delay: 0, xOffset: 10, yOffset: 0 },
                { type: 'small', angle: -0.8, delay: 0, xOffset: -20, yOffset: 15 },
                { type: 'small', angle: 0.8, delay: 0, xOffset: 20, yOffset: 15 },
                { type: 'small', angle: -1.1, delay: 0, xOffset: -30, yOffset: 25 },
                { type: 'small', angle: 1.1, delay: 0, xOffset: 30, yOffset: 25 },
                { type: 'small', angle: -0.2, delay: 0, xOffset: -8, yOffset: 35 },
                { type: 'small', angle: 0.2, delay: 0, xOffset: 8, yOffset: 35 },
                { type: 'small', angle: -0.6, delay: 0, xOffset: -18, yOffset: 45 },
                { type: 'small', angle: 0.6, delay: 0, xOffset: 18, yOffset: 45 }
            ]
        };

        const selectedPattern = rootPatterns[rootPattern];
        const seedX = this.scene.seed.x;

        // Generate all roots instantly
        selectedPattern.forEach((config) => {
            this.scene.roots.push({
                x: seedX + config.xOffset + (Math.random() - 0.5) * 10,
                y: 210 + config.yOffset,
                angle: config.angle + (Math.random() - 0.5) * 0.2,
                type: config.type
            });
        });
    }

    async preGeneratePlant(targetHeight = 170) {
        const stemX = this.scene.seed.x;

        // Select random stem variant (0, 1, or 2)
        const stemVariant = Math.floor(Math.random() * 3);
        const stemTypes = ['straight', 'curved', 'thick'];
        const stemSpriteNames = ['stemStraight', 'stemCurved', 'stemThick'];

        // Create temporary plant structure for generation
        const tempPlant = {
            x: stemX,
            variant: stemTypes[stemVariant],
            spriteName: stemSpriteNames[stemVariant],
            width: stemVariant === 2 ? 12 : (stemVariant === 1 ? 10 : 8),
            segments: [], // Main stem segments
            branches: [],  // Side branches with flowers
            activeStems: [{ // Track multiple vertical stems
                x: stemX,
                currentHeight: 0,
                maxHeight: targetHeight,
                variant: stemTypes[stemVariant],
                spriteName: stemSpriteNames[stemVariant],
                width: stemVariant === 2 ? 12 : (stemVariant === 1 ? 10 : 8),
                lastSplitHeight: -16, // Track last split to prevent immediate consecutive splits
                hasEndingFlower: false, // Track if stem has ending flower
                lastAction: 'grow', // Track last action (grow, split, flower)
                segmentsSinceSplit: 0, // Count segments since last split
                splitDepth: 0, // Track how many splits have occurred in this branch lineage
                endedBySplit: false // Track if this stem ended due to splitting
            }],
            visible: false // Initially hidden for pre-generation
        };

        // Generate the complete structure silently (no delays, no rendering)
        await this.executePreGeneration(tempPlant, targetHeight);

        return tempPlant;
    }

    async executePreGeneration(plant, targetHeight) {
        console.log('Starting pre-generation...');
        const startTime = Date.now();
        const segmentHeight = 8; // Match the silent generation methods

        // Keep growing until all active stems are complete (silent generation)
        let growthCycle = 0;
        while (plant.activeStems.length > 0 && growthCycle < 50) { // Safety limit
            console.log(`Growth cycle ${growthCycle}, active stems: ${plant.activeStems.length}`);
            const activeStems = [...plant.activeStems]; // Copy array since we'll modify it

            for (let stemIndex = 0; stemIndex < activeStems.length; stemIndex++) {
                const activeStem = activeStems[stemIndex];

                // Check if stem has reached max height
                if (activeStem.currentHeight >= activeStem.maxHeight) {
                    // Add final flower if needed (silent generation)
                    if (!activeStem.hasEndingFlower && !activeStem.endedBySplit) {
                        this.addFinalFlowerSilent(plant, activeStem);
                        activeStem.hasEndingFlower = true;
                    }

                    // Remove completed stems
                    const actualIndex = plant.activeStems.indexOf(activeStem);
                    if (actualIndex !== -1) {
                        plant.activeStems.splice(actualIndex, 1);
                    }
                    continue;
                }

                // Check if stem is close to max height (within 8 pixels - one segment)
                const distanceToTop = activeStem.maxHeight - activeStem.currentHeight;
                const nearCompletion = distanceToTop <= 8;

                // Determine next action based on growth rules
                const action = this.decideStemAction(activeStem, growthCycle);

                // Execute the action (silent generation)
                if (action === 'grow') {
                    this.growStemSegmentSilent(plant, activeStem);
                } else if (action === 'split') {
                    this.splitStemSilent(plant, activeStem);
                    activeStem.endedBySplit = true;
                } else if (action === 'flower') {
                    this.addFlowerBranchSilent(plant, activeStem);
                    activeStem.lastAction = 'flower';
                }
            }

            growthCycle++;
        }

        const endTime = Date.now();
        console.log(`Pre-generation completed in ${endTime - startTime}ms`);
        console.log(`Final plant structure: ${plant.segments.length} segments, ${plant.branches.length} branches`);
    }

    createRevealQueue(plantIndex, plantStructure) {
        const revealItems = [];

        // Add all plant elements with their Y positions for sorting
        // Add stem segments
        plantStructure.segments.forEach((segment, index) => {
            revealItems.push({
                type: 'segment',
                plantIndex: plantIndex,
                elementIndex: index,
                y: segment.y,
                visible: false
            });
        });

        // Add branches and their flowers
        plantStructure.branches.forEach((branch, branchIndex) => {
            revealItems.push({
                type: 'branch',
                plantIndex: plantIndex,
                elementIndex: branchIndex,
                y: branch.y,
                visible: false
            });

            branch.flowers.forEach((flower, flowerIndex) => {
                revealItems.push({
                    type: 'flower',
                    plantIndex: plantIndex,
                    branchIndex: branchIndex,
                    elementIndex: flowerIndex,
                    y: flower.y,
                    visible: false
                });
            });
        });

        // Sort by Y position (bottom to top - higher Y values first since Y=0 is top)
        revealItems.sort((a, b) => b.y - a.y);

        this.scene.revealQueue = revealItems;
    }

    async startRevealAnimation(plantIndex) {
        console.log(`Starting reveal animation for plant ${plantIndex}, ${this.scene.revealQueue.length} items in queue`);
        const startTime = Date.now();

        // Make the plant visible for rendering now that reveal has started
        this.scene.stems[plantIndex].visible = true;

        // Reveal elements one by one from bottom to top
        let revealedCount = 0;
        for (const item of this.scene.revealQueue) {
            if (item.plantIndex === plantIndex) {
                item.visible = true;
                revealedCount++;
                await this.wait(50); // Small delay between reveals
            }
        }

        const endTime = Date.now();
        console.log(`Reveal animation completed in ${endTime - startTime}ms, revealed ${revealedCount} items`);

        // Gem buttons removed - gifts now handle photo display
    }

    addGemButtonForPlant(plantIndex) {
        const plant = this.scene.stems[plantIndex];
        if (plant && plant.segments.length > 0) {
            // Get the X position from the plant stem
            const stemX = plant.x || plant.segments[0].x;

            // Position gem 50 pixels below the grass line (y=187, adjusted for grass position)
            const grassLineY = 187; // Current grass position (190 - 3 pixels)
            const gemX = stemX;
            const gemY = grassLineY + 50; // 50 pixels below grass line

            // Create unique gem button with photo assignment
            const gemButton = {
                x: gemX,
                y: gemY,
                visible: true,
                plantIndex: plantIndex,
                photoNumber: this.getNextPhotoNumber(), // Get next random photo number
                clicked: false
            };

            this.scene.gemButtons.push(gemButton);
            console.log(`Added gem button for plant ${plantIndex} at (${gemX}, ${gemY}) - 50px below grass line`);
        }
    }

    addGemButton(x, y) {
        // Alternative method for adding gem buttons at specific coordinates
        const gemButton = {
            x: x,
            y: y,
            visible: true,
            plantIndex: this.scene.stems.length - 1,
            photoIndex: this.scene.gemButtons.length,
            clicked: false
        };

        this.scene.gemButtons.push(gemButton);
    }

    // Silent generation methods (no waits, no rendering)
    growStemSegmentSilent(plant, activeStem) {
        const segmentHeight = 8; // Updated to match new shorter sprites
        const segmentIndex = Math.floor(activeStem.currentHeight / segmentHeight);
        const segmentY = 190 - activeStem.currentHeight - segmentHeight;

        // Add segment to plant structure
        plant.segments.push({
            x: activeStem.x,
            y: segmentY,
            variant: activeStem.variant,
            spriteName: activeStem.spriteName,
            width: activeStem.width
        });

        // Update active stem height and tracking
        activeStem.currentHeight += segmentHeight;
        activeStem.lastAction = 'grow';
        activeStem.segmentsSinceSplit += 1;
    }

    splitStemSilent(plant, activeStem) {
        const segmentY = 190 - activeStem.currentHeight;

        // Choose split direction (left or right)
        const splitDirection = Math.random() > 0.5 ? 'left' : 'right';

        // Get the correct split sprite based on stem variant and direction
        const splitSpriteName = `split${activeStem.variant.charAt(0).toUpperCase() + activeStem.variant.slice(1)}${splitDirection.charAt(0).toUpperCase() + splitDirection.slice(1)}`;

        // Add diagonal split sprite
        plant.branches.push({
            x: activeStem.x,
            y: segmentY,
            direction: splitDirection,
            type: 'diagonal_split',
            variant: activeStem.variant,
            spriteName: splitSpriteName,
            flowers: []
        });

        // Create exactly 2 new branches based on split angles
        const remainingHeight = activeStem.maxHeight - activeStem.currentHeight;

        if (remainingHeight > 16) { // Only if enough height remaining
            if (splitDirection === 'left') {
                // Left split: 15° right branch (nearly vertical) + 45° left branch

                // 15° right branch (1 pixel right per 4 pixels up)
                const branch15X = activeStem.x + 1; // Slight right offset
                plant.activeStems.push({
                    x: branch15X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 10,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });

                // 45° left branch (1 pixel left per 1 pixel up)
                const branch45X = activeStem.x - 4; // 45° left offset
                plant.activeStems.push({
                    x: branch45X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 20,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });

            } else {
                // Right split: 45° right branch + 15° left branch (nearly vertical)

                // 45° right branch (1 pixel right per 1 pixel up)
                const branch45X = activeStem.x + 4; // 45° right offset
                plant.activeStems.push({
                    x: branch45X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 20,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });

                // 15° left branch (nearly vertical)
                const branch15X = activeStem.x - 1; // Slight left offset
                plant.activeStems.push({
                    x: branch15X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 10,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });
            }
        }

        // IMPORTANT: End the main stem after splitting (no more main stem continuation)
        activeStem.currentHeight = activeStem.maxHeight; // This terminates the main stem
    }

    addFlowerBranchSilent(plant, activeStem) {
        const segmentY = 190 - activeStem.currentHeight;
        const direction = Math.random() > 0.5 ? 'left' : 'right';

        // Add horizontal branch
        const branch = {
            x: activeStem.x,
            y: segmentY,
            direction: direction,
            flowers: []
        };

        // Create balloons for this branch
        const balloonVariants = ['balloonBlue', 'balloonGreen', 'balloonRed', 'balloonYellow'];
        const flowerCount = 2 + Math.floor(Math.random() * 2); // 2 or 3 balloons

        for (let i = 0; i < flowerCount; i++) {
            const branchX = direction === 'left' ? activeStem.x - 12 : activeStem.x + 12;
            const selectedBalloon = balloonVariants[Math.floor(Math.random() * balloonVariants.length)];

            branch.flowers.push({
                x: branchX + (i - (flowerCount - 1) / 2) * 8,
                y: segmentY + (Math.random() - 0.5) * 6,
                variant: selectedBalloon,
                spriteName: selectedBalloon
            });
        }

        plant.branches.push(branch);

        // Mark stem as having flowers and end it
        activeStem.hasEndingFlower = true;
        activeStem.currentHeight = activeStem.maxHeight; // This terminates the stem
    }

    addFinalFlowerSilent(plant, activeStem) {
        const segmentY = 190 - activeStem.currentHeight;
        const direction = Math.random() > 0.5 ? 'left' : 'right';

        // Add horizontal branch for final flower
        const branch = {
            x: activeStem.x,
            y: segmentY,
            direction: direction,
            flowers: []
        };

        // Create single final balloon
        const balloonVariants = ['balloonBlue', 'balloonGreen', 'balloonRed', 'balloonYellow'];
        const selectedBalloon = balloonVariants[Math.floor(Math.random() * balloonVariants.length)];
        const branchX = direction === 'left' ? activeStem.x - 12 : activeStem.x + 12;

        branch.flowers.push({
            x: branchX,
            y: segmentY,
            variant: selectedBalloon,
            spriteName: selectedBalloon
        });

        plant.branches.push(branch);
    }

    async executeStemGrowthPlan(plantIndex, targetHeight) {
        const plant = this.scene.stems[plantIndex];
        const segmentHeight = 16;

        // Keep growing until all active stems are complete
        let growthCycle = 0;
        while (plant.activeStems.length > 0 && growthCycle < 50) { // Safety limit
            const activeStems = [...plant.activeStems]; // Copy array since we'll modify it

            for (let stemIndex = 0; stemIndex < activeStems.length; stemIndex++) {
                const activeStem = activeStems[stemIndex];

                if (activeStem.currentHeight >= activeStem.maxHeight) {
                    // Before removing stem, ensure it ends with a flower (ONLY if not ended by split)
                    if (!activeStem.hasEndingFlower && !activeStem.endedBySplit) {
                        await this.addFinalFlower(plantIndex, activeStem);
                        activeStem.hasEndingFlower = true;
                    }

                    // Remove completed stems
                    const actualIndex = plant.activeStems.indexOf(activeStem);
                    if (actualIndex !== -1) {
                        plant.activeStems.splice(actualIndex, 1);
                        this.activeStemCount -= 1; // Update active stem count
                    }
                    continue;
                }

                // Check if stem is close to max height (within 8 pixels - one segment)
                const remainingHeight = activeStem.maxHeight - activeStem.currentHeight;

                // If very close to max height, force a flower to finish
                if (remainingHeight <= 8) {
                    await this.addFinalFlower(plantIndex, activeStem);
                    activeStem.currentHeight = activeStem.maxHeight; // Mark as complete
                    activeStem.hasEndingFlower = true;
                    continue;
                }

                // Decide what to do: Grow, Split, or Flower
                const action = this.decideStemAction(activeStem, growthCycle);

                if (action === 'grow') {
                    await this.growStemSegment(plantIndex, activeStem);
                } else if (action === 'split') {
                    await this.splitStem(plantIndex, activeStem);
                } else if (action === 'flower') {
                    await this.addFlowerBranch(plantIndex, activeStem);
                }

                await this.wait(0); // Small delay between actions
            }

            growthCycle++;
            await this.wait(0); // Brief pause between growth cycles
        }

        // Clean up any remaining active stems
        plant.activeStems = [];
    }

    decideStemAction(activeStem, growthCycle) {
        const heightProgress = activeStem.currentHeight / activeStem.maxHeight;
        const segmentHeight = 8;
        const segmentIndex = Math.floor(activeStem.currentHeight / segmentHeight);

        // Always grow in very early stages
        if (heightProgress < 0.1) {
            return 'grow';
        }

        // Check constraints
        const timeSinceLastSplit = activeStem.currentHeight - activeStem.lastSplitHeight;
        const canSplit = timeSinceLastSplit >= 16; // Minimum 2 segments between splits
        const canFlower = activeStem.lastAction !== 'flower'; // No consecutive flowers

        // WEIGHTED GROWTH AFTER SPLITS
        if (activeStem.segmentsSinceSplit < 3) {
            // Right after a split, heavily favor vertical growth
            const segmentWeight = [0.95, 0.85, 0.75][activeStem.segmentsSinceSplit]; // 95%, 85%, 75% chance
            if (Math.random() < segmentWeight) {
                return 'grow';
            }
        }

        // Base probabilities that change with height
        let growChance = Math.max(0.2, 0.6 - heightProgress); // Decreases from 60% to 20%
        let baseSplitChance = Math.min(0.4, heightProgress * 0.8); // Base split chance increases with height, max 40%

        // Reduce split chance by 30% for each split level (compound reduction)
        // splitDepth 0: 100%, 1: 70%, 2: 49%, 3: 34%, etc.
        const splitReduction = Math.pow(0.7, activeStem.splitDepth);
        let splitChance = canSplit ? baseSplitChance * splitReduction : 0;

        // Limit maximum split depth to prevent excessive branching
        if (activeStem.splitDepth >= 3) {
            splitChance = 0; // No more splits after 3 levels
        }

        let flowerChance = canFlower ? Math.min(0.5, heightProgress * 1.0) : 0; // Increases with height, max 50%

        // Normalize probabilities to sum to 1
        const totalChance = growChance + splitChance + flowerChance;
        if (totalChance > 0) {
            growChance /= totalChance;
            splitChance /= totalChance;
            flowerChance /= totalChance;
        }

        const random = Math.random();

        if (random < growChance) {
            return 'grow';
        } else if (random < growChance + splitChance && canSplit) {
            return 'split';
        } else if (canFlower) {
            return 'flower';
        } else {
            // Fallback to grow if flower is blocked
            return 'grow';
        }
    }

    async growStemSegment(plantIndex, activeStem) {
        const plant = this.scene.stems[plantIndex];
        const segmentHeight = 8; // Updated to match new shorter sprites
        const segmentIndex = Math.floor(activeStem.currentHeight / segmentHeight);
        const segmentY = 190 - activeStem.currentHeight - segmentHeight;

        // Add segment to plant structure
        plant.segments.push({
            x: activeStem.x,
            y: segmentY,
            variant: activeStem.variant,
            spriteName: activeStem.spriteName,
            width: activeStem.width
        });

        // Update active stem height and tracking
        activeStem.currentHeight += segmentHeight;
        activeStem.lastAction = 'grow';
        activeStem.segmentsSinceSplit += 1;

        await this.wait(0);
    }

    async splitStem(plantIndex, activeStem) {
        const plant = this.scene.stems[plantIndex];
        const segmentY = 190 - activeStem.currentHeight;

        // Choose split direction (left or right)
        const splitDirection = Math.random() > 0.5 ? 'left' : 'right';

        // Get the correct split sprite based on stem variant and direction
        const splitSpriteName = `split${activeStem.variant.charAt(0).toUpperCase() + activeStem.variant.slice(1)}${splitDirection.charAt(0).toUpperCase() + splitDirection.slice(1)}`;

        // Add diagonal split sprite
        plant.branches.push({
            x: activeStem.x,
            y: segmentY,
            direction: splitDirection,
            type: 'diagonal_split',
            variant: activeStem.variant,
            spriteName: splitSpriteName,
            flowers: []
        });

        // Create exactly 2 new branches based on split angles
        const remainingHeight = activeStem.maxHeight - activeStem.currentHeight;

        if (remainingHeight > 16) { // Only if enough height remaining
            if (splitDirection === 'left') {
                // Left split: 15° right branch (nearly vertical) + 45° left branch

                // 15° right branch (1 pixel right per 4 pixels up)
                const branch15X = activeStem.x + 1; // Slight right offset
                plant.activeStems.push({
                    x: branch15X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 10,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });

                // 45° left branch (1 pixel left per 1 pixel up)
                const branch45X = activeStem.x - 4; // 45° left offset
                plant.activeStems.push({
                    x: branch45X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 20,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });

                // Update active stem count (+2 new stems, -1 original)
                this.activeStemCount += 1;

            } else {
                // Right split: 45° right branch + 15° left branch (nearly vertical)

                // 45° right branch (1 pixel right per 1 pixel up)
                const branch45X = activeStem.x + 4; // 45° right offset
                plant.activeStems.push({
                    x: branch45X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 20,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });

                // 15° left branch (nearly vertical)
                const branch15X = activeStem.x - 1; // Slight left offset
                plant.activeStems.push({
                    x: branch15X,
                    currentHeight: activeStem.currentHeight, // Start at split height
                    maxHeight: activeStem.maxHeight - Math.random() * 10,
                    variant: activeStem.variant,
                    spriteName: activeStem.spriteName,
                    width: activeStem.width,
                    lastSplitHeight: activeStem.currentHeight,
                    hasEndingFlower: false,
                    lastAction: 'split',
                    segmentsSinceSplit: 0,
                    splitDepth: activeStem.splitDepth + 1, // Increment split depth for new branch
                    endedBySplit: false
                });

                // Update active stem count (+2 new stems, -1 original)
                this.activeStemCount += 1;
            }
        }

        // IMPORTANT: End the main stem after splitting (no more main stem continuation)
        activeStem.currentHeight = activeStem.maxHeight; // This terminates the main stem

        await this.wait(0);
    }

    async addFlowerBranch(plantIndex, activeStem) {
        const plant = this.scene.stems[plantIndex];
        const segmentY = 190 - activeStem.currentHeight;
        const direction = Math.random() > 0.5 ? 'left' : 'right';

        // Add horizontal branch
        const branch = {
            x: activeStem.x,
            y: segmentY,
            direction: direction,
            flowers: []
        };

        // Create balloons for this branch
        const balloonVariants = ['balloonBlue', 'balloonGreen', 'balloonRed', 'balloonYellow'];
        const flowerCount = 2 + Math.floor(Math.random() * 2); // 2 or 3 balloons

        for (let i = 0; i < flowerCount; i++) {
            const branchX = direction === 'left' ? activeStem.x - 12 : activeStem.x + 12;
            const selectedBalloon = balloonVariants[Math.floor(Math.random() * balloonVariants.length)];

            branch.flowers.push({
                x: branchX + (i - (flowerCount - 1) / 2) * 8,
                y: segmentY + (Math.random() - 0.5) * 6,
                variant: selectedBalloon,
                spriteName: selectedBalloon
            });
        }

        plant.branches.push(branch);

        // Add flowers to main scene flowers array for rendering
        branch.flowers.forEach(flower => {
            this.scene.flowers.push(flower);
        });

        // Update stem tracking after adding flowers
        activeStem.currentHeight += 8; // Small increment for flower branch
        activeStem.lastAction = 'flower';
        activeStem.segmentsSinceSplit += 1; // Count as one segment

        await this.wait(0);
    }

   async addFinalFlower(plantIndex, activeStem) {
        const plant = this.scene.stems[plantIndex];
        const segmentY = 190 - activeStem.currentHeight;

        // Create a final balloon cluster at the top of the stem
        const balloonVariants = ['balloonBlue', 'balloonGreen', 'balloonRed', 'balloonYellow'];
        const flowerCount = 2 + Math.floor(Math.random() * 2); // 2 or 3 balloons

        // Create balloons directly above the stem (no horizontal branch for final balloon)
        for (let i = 0; i < flowerCount; i++) {
            const selectedBalloon = balloonVariants[Math.floor(Math.random() * balloonVariants.length)];
            this.scene.flowers.push({
                x: activeStem.x + (i - (flowerCount - 1) / 2) * 10,
                y: segmentY - 15 + (Math.random() - 0.5) * 8,
                variant: selectedBalloon,
                spriteName: selectedBalloon
            });
        }

        await this.wait(0);
    } 

    async zoomToFlower(flowerIndex) {
        const flower = this.scene.flowers[flowerIndex];
        if (!flower) return;

        const targetZoom = 3;
        const targetX = flower.x - this.canvas.width / (2 * targetZoom);
        const targetY = flower.y - this.canvas.height / (2 * targetZoom);
        const duration = 1000;
        const startTime = Date.now();

        const startZoom = this.scene.camera.zoom;
        const startX = this.scene.camera.x;
        const startY = this.scene.camera.y;

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                this.scene.camera.zoom = startZoom + (targetZoom - startZoom) * easeProgress;
                this.scene.camera.x = startX + (targetX - startX) * easeProgress;
                this.scene.camera.y = startY + (targetY - startY) * easeProgress;

                if (progress >= 1) {
                    resolve();
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        });
    }

    async zoomOut() {

        const duration = 800;
        const startTime = Date.now();
        const startZoom = this.scene.camera.zoom;
        const startX = this.scene.camera.x;
        const startY = this.scene.camera.y;

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                this.scene.camera.zoom = startZoom + (1 - startZoom) * easeProgress;
                this.scene.camera.x = startX - startX * easeProgress;
                this.scene.camera.y = startY - startY * easeProgress;

                if (progress >= 1) {
                    resolve();
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        });
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the garden when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PixelGarden('gardenCanvas');
});