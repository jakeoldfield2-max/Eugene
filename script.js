class SweetpeaGarden {
    constructor() {
        this.currentStage = 'initial'; // initial, seed-planted, growing, bloomed
        this.isAnimating = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupElements();
    }

    setupElements() {
        this.seedButton = document.getElementById('seedButton');
        this.plantStem = document.getElementById('plantStem');
        this.flowerCluster = document.getElementById('flowerCluster');
        this.rootSystem = document.getElementById('rootSystem');
        this.zoomOverlay = document.getElementById('zoomOverlay');
        this.flowerImage = document.getElementById('flowerImage');
        this.backButton = document.getElementById('backButton');
        this.seedLandingSpot = document.getElementById('seedLandingSpot');

        // Get all flower elements
        this.flowers = document.querySelectorAll('.flower');
    }

    bindEvents() {
        // Seed planting interaction
        document.addEventListener('click', (e) => {
            if (e.target.closest('.seed-button') && this.currentStage === 'initial') {
                this.plantSeed();
            }
        });

        // Flower clicking interactions
        document.addEventListener('click', (e) => {
            const flower = e.target.closest('.flower');
            if (flower && this.currentStage === 'bloomed' && !this.isAnimating) {
                this.zoomIntoFlower(flower);
            }
        });

        // Back button interaction
        this.backButton.addEventListener('click', () => {
            this.zoomOut();
        });

        // Close zoom on overlay click (outside image)
        this.zoomOverlay.addEventListener('click', (e) => {
            if (e.target === this.zoomOverlay) {
                this.zoomOut();
            }
        });
    }

    // Stage 1: Plant the seed (user clicks seed button)
    plantSeed() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.currentStage = 'seed-planted';

        // Add falling animation to seed
        this.seedButton.classList.add('seed-falling');

        // After seed finishes falling, start growth
        setTimeout(() => {
            this.seedButton.style.display = 'none';
            this.startGrowth();
        }, 2000);
    }

    // Stage 2: Begin root and stem growth
    startGrowth() {
        this.currentStage = 'growing';

        // Generate and animate roots
        this.growRoots();

        // Grow stem
        setTimeout(() => {
            this.growStem();
        }, 500);
    }

    // Generate organic root system
    growRoots() {
        const rootCount = 8;
        const rootSystem = this.rootSystem;

        for (let i = 0; i < rootCount; i++) {
            setTimeout(() => {
                const root = document.createElement('div');
                root.className = 'root';

                // Random root properties for organic look
                const angle = (i * 45) + (Math.random() * 30 - 15); // Spread with variation
                const length = 80 + Math.random() * 60; // Random length 80-140px
                const thickness = 2 + Math.random() * 3; // Random thickness 2-5px
                const xOffset = (Math.random() * 100 - 50); // Random horizontal offset

                root.style.width = `${thickness}px`;
                root.style.height = `0px`;
                root.style.left = `${50 + xOffset}%`;
                root.style.top = '10px';
                root.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                root.style.setProperty('--root-length', `${length}px`);

                rootSystem.appendChild(root);

                // Trigger growth animation
                setTimeout(() => {
                    root.classList.add('root-growing');
                }, 50);

            }, i * 150); // Stagger root growth
        }
    }

    // Grow the main stem
    growStem() {
        this.plantStem.classList.add('stem-growing');

        // After stem finishes growing, bloom flowers
        setTimeout(() => {
            this.bloomFlowers();
        }, 2500);
    }

    // Stage 3: Bloom the flowers
    bloomFlowers() {
        this.flowerCluster.classList.add('flowers-blooming');
        this.currentStage = 'bloomed';
        this.isAnimating = false;
    }

    // Stage 4: Zoom into clicked flower
    zoomIntoFlower(flower) {
        this.isAnimating = true;
        const flowerNumber = flower.dataset.flower;

        // Generate a unique placeholder image for each flower
        const imageUrls = [
            'https://picsum.photos/400/300?random=1',
            'https://picsum.photos/400/300?random=2',
            'https://picsum.photos/400/300?random=3',
            'https://picsum.photos/400/300?random=4'
        ];

        this.flowerImage.src = imageUrls[flowerNumber - 1];

        // Show zoom overlay
        this.zoomOverlay.classList.add('active');

        setTimeout(() => {
            this.isAnimating = false;
        }, 500);
    }

    // Stage 5: Zoom back out to garden view
    zoomOut() {
        this.zoomOverlay.classList.remove('active');
        this.isAnimating = false;
    }

    // Utility method to reset the entire garden (for development/testing)
    reset() {
        this.currentStage = 'initial';
        this.isAnimating = false;

        // Reset all elements
        this.seedButton.style.display = 'block';
        this.seedButton.classList.remove('seed-falling');
        this.plantStem.classList.remove('stem-growing');
        this.flowerCluster.classList.remove('flowers-blooming');
        this.zoomOverlay.classList.remove('active');

        // Clear roots
        this.rootSystem.innerHTML = '';

        console.log('Garden reset to initial state');
    }
}

// Initialize the garden when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const garden = new SweetpeaGarden();

    // Add reset functionality for development (optional)
    // Uncomment the line below to enable reset on 'R' key press
    // document.addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') garden.reset(); });
});

// Add some visual feedback for loading
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
});