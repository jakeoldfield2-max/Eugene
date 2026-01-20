// Example animation scripts for the Pixel Garden

const scriptEditor = document.getElementById('scriptEditor');

const exampleScripts = {
    basic: `// Basic growth sequence
await plantSeed();
await wait(500);
await growRoots();
await wait(500);
await growStem(180);
await wait(500);
await bloomFlowers();`,

    fast: `// Fast-paced growth
await plantSeed();
await Promise.all([
    growRoots(),
    growStem(200)
]);
await bloomFlowers();`,

    custom: `// Custom scene with camera work
await plantSeed();
await growRoots();
await growStem(150);

// Add some custom roots
scene.roots.push(
    { x: 300, y: 280, angle: -1.2, type: 'branch' },
    { x: 340, y: 300, angle: 0.8, type: 'small' }
);

await bloomFlowers();
await wait(1000);
await zoomToFlower(0);
await wait(2000);
await zoomOut();`,

    interactive: `// Interactive growth with pauses
updateStatus('Click the seed to begin...');

// Wait for seed to be planted (user interaction)
while (!scene.seed.planted) {
    await wait(100);
}

updateStatus('Growing roots in 3 seconds...');
await wait(3000);
await growRoots();

updateStatus('Growing stem...');
await growStem(160);

updateStatus('Blooming flowers one by one...');
const colors = ['pink', 'purple', 'white', 'beige'];
const stemTop = 240 - scene.stem.height;

for (let i = 0; i < colors.length; i++) {
    scene.flowers.push({
        x: 320 + (i - 1.5) * 25,
        y: stemTop - 10,
        color: colors[i]
    });
    updateStatus(\`Bloomed \${colors[i]} flower!\`);
    await wait(800);
}

updateStatus('Garden complete! Click flowers to zoom in.');`,

    timelapse: `// Time-lapse growth with multiple plants
// Plant 1 (center)
await plantSeed();
await growRoots();
await growStem(200);
await bloomFlowers();

// Add second plant (left)
scene.seed = { x: 200, y: 50, visible: true, planted: false };
await plantSeed();

// Custom roots for plant 2
for (let i = 0; i < 5; i++) {
    scene.roots.push({
        x: 200 + (Math.random() - 0.5) * 60,
        y: 280 + i * 15,
        angle: (Math.random() - 0.5) * 1.5,
        type: i < 2 ? 'main' : 'branch'
    });
    await wait(150);
}

// Grow stem for plant 2
const duration = 1500;
const startTime = Date.now();
const stemHeight = 120;

await new Promise(resolve => {
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Add stem segments for plant 2
        const currentHeight = stemHeight * progress;

        if (progress >= 1) {
            // Add flowers for plant 2
            scene.flowers.push(
                { x: 190, y: 240 - stemHeight - 10, color: 'purple' },
                { x: 210, y: 240 - stemHeight - 10, color: 'white' }
            );
            resolve();
        } else {
            requestAnimationFrame(animate);
        }
    };
    animate();
});

updateStatus('Multiple plants grown!');`,

    seasonal: `// Seasonal changes
updateStatus('Spring growth...');
await plantSeed();
await growRoots();
await growStem(180);
await bloomFlowers();

await wait(2000);
updateStatus('Summer flourishing...');

// Add more vibrant colors
scene.flowers.forEach(flower => {
    if (flower.color === 'white') flower.color = 'pink';
    if (flower.color === 'beige') flower.color = 'purple';
});

await wait(2000);
updateStatus('Autumn changes...');

// Change flower colors to autumn tones
scene.flowers.forEach(flower => {
    flower.color = Math.random() > 0.5 ? 'beige' : 'white';
});

// Reduce stem height slightly
scene.stem.height *= 0.9;

await wait(2000);
updateStatus('Winter dormancy...');

// Remove flowers
scene.flowers = [];

// Fade roots
scene.roots.forEach(root => {
    root.opacity = 0.3;
});

updateStatus('Seasonal cycle complete.');`,

    garden_party: `// Multiple plants with staggered growth
const plantPositions = [200, 280, 360, 440];
const plantHeights = [160, 200, 140, 180];

for (let i = 0; i < plantPositions.length; i++) {
    updateStatus(\`Planting seed \${i + 1}...\`);

    // Plant seed at position
    scene.seed = {
        x: plantPositions[i],
        y: 50,
        visible: true,
        planted: false
    };

    await plantSeed();

    // Grow roots
    for (let r = 0; r < 4; r++) {
        scene.roots.push({
            x: plantPositions[i] + (Math.random() - 0.5) * 40,
            y: 270 + r * 18,
            angle: (Math.random() - 0.5) * 1.2,
            type: r === 0 ? 'main' : 'branch'
        });
        await wait(100);
    }

    // Grow stem to specific height
    const targetHeight = plantHeights[i];
    scene.stem = { height: targetHeight, maxHeight: targetHeight };

    // Add flowers
    const colors = ['pink', 'purple', 'white', 'beige'];
    const stemTop = 240 - targetHeight;

    for (let f = 0; f < 2; f++) {
        scene.flowers.push({
            x: plantPositions[i] + (f - 0.5) * 20,
            y: stemTop - 10,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    await wait(500);
}

updateStatus('Garden party complete! \${scene.flowers.length} flowers blooming!');`,

    interactive_zoom: `// Interactive zoom tour
await plantSeed();
await growRoots();
await growStem(200);
await bloomFlowers();

updateStatus('Starting flower tour...');

for (let i = 0; i < scene.flowers.length; i++) {
    const flower = scene.flowers[i];
    updateStatus(\`Visiting \${flower.color} flower (\${i + 1}/\${scene.flowers.length})...\`);

    await zoomToFlower(i);
    await wait(1500);

    // Show flower details
    updateStatus(\`\${flower.color.charAt(0).toUpperCase() + flower.color.slice(1)} flower - Beautiful petals and golden center!\`);
    await wait(1500);

    await zoomOut();
    await wait(800);
}

updateStatus('Flower tour complete!');`
};

function loadExample(exampleName) {
    if (exampleScripts[exampleName]) {
        scriptEditor.value = exampleScripts[exampleName];
        garden.updateStatus(`Loaded ${exampleName} example script.`);
    }
}

// Advanced scripting utilities
window.PixelGardenUtils = {
    // Create custom flower at position
    addCustomFlower(x, y, color) {
        garden.scene.flowers.push({ x, y, color });
        garden.updateStatus(`Added ${color} flower at (${x}, ${y})`);
    },

    // Create custom root system
    addCustomRoot(x, y, angle, type = 'branch') {
        garden.scene.roots.push({ x, y, angle, type });
    },

    // Animate camera smoothly
    async animateCamera(targetX, targetY, targetZoom, duration = 1000) {
        const startX = garden.scene.camera.x;
        const startY = garden.scene.camera.y;
        const startZoom = garden.scene.camera.zoom;
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                garden.scene.camera.x = startX + (targetX - startX) * easeProgress;
                garden.scene.camera.y = startY + (targetY - startY) * easeProgress;
                garden.scene.camera.zoom = startZoom + (targetZoom - startZoom) * easeProgress;

                if (progress >= 1) {
                    resolve();
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        });
    },

    // Create particle effect
    createParticles(x, y, count = 10, color = '#FFD700') {
        // This would create particle effects in a more advanced implementation
        garden.updateStatus(`Created ${count} particles at (${x}, ${y})`);
    },

    // Weather effects
    async rainEffect(duration = 3000) {
        garden.updateStatus('Rain effect starting...');
        // This would add rain animation
        await garden.wait(duration);
        garden.updateStatus('Rain effect completed.');
    },

    // Day/night cycle
    async dayNightCycle() {
        garden.updateStatus('Day/night cycle starting...');

        // Fade to night
        garden.scene.sky.tint = '#2F4F4F';
        await garden.wait(2000);

        // Fade to day
        garden.scene.sky.tint = '#87CEEB';
        await garden.wait(2000);

        garden.updateStatus('Day/night cycle completed.');
    }
};

// Make utilities globally available in scripts
window.utils = window.PixelGardenUtils;