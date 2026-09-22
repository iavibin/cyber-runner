(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
  class SoundSynth {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.isBgmPlaying = false;
      this.cachedSlideBuffer = null;
      this.cachedCrashBuffer = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.initNoiseBuffers();
    }

    initNoiseBuffers() {
      if (!this.ctx) return;
      if (!this.cachedSlideBuffer) {
        const slideSize = Math.floor(this.ctx.sampleRate * 0.18);
        this.cachedSlideBuffer = this.ctx.createBuffer(1, slideSize, this.ctx.sampleRate);
        const slideData = this.cachedSlideBuffer.getChannelData(0);
        for (let i = 0; i < slideSize; i++) {
          slideData[i] = Math.random() * 2 - 1;
        }
      }
      if (!this.cachedCrashBuffer) {
        const crashSize = Math.floor(this.ctx.sampleRate * 0.55);
        this.cachedCrashBuffer = this.ctx.createBuffer(1, crashSize, this.ctx.sampleRate);
        const crashData = this.cachedCrashBuffer.getChannelData(0);
        for (let i = 0; i < crashSize; i++) {
          crashData[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / crashSize));
        }
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.muted && this.isBgmPlaying) {
        this.stopBgm();
      } else if (!this.muted && !this.isBgmPlaying) {
        this.startBgm();
      }
      return this.muted;
    }

    playJump() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    playSlide() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (!this.cachedSlideBuffer) this.initNoiseBuffers();
      if (!this.cachedSlideBuffer) return;

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = this.cachedSlideBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
    }

    playDive() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    }

    playCollect() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      // 2-tone melodic crystal bell chime (E6 -> B6)
      const freqs = [1318.5, 1975.5];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteTime = now + idx * 0.055;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.2);
      });
    }

    playCrash() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      if (!this.cachedCrashBuffer) this.initNoiseBuffers();
      if (!this.cachedCrashBuffer) return;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.cachedCrashBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);

      // Low saw dive
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.45);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    }

    playClick() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    startBgm() {
      if (this.muted || this.isBgmPlaying || !this.ctx) return;
      this.isBgmPlaying = true;
      this.bgmStep = 0;
      // 130 BPM Synthwave bassline arpeggio (16th notes = ~115ms)
      const bassNotes = [
        110, 110, 220, 110,  // A2, A2, A3, A2
        130.8, 130.8, 261.6, 130.8, // C3, C3, C4, C3
        98, 98, 196, 98,    // G2, G2, G3, G2
        116.5, 116.5, 233, 116.5   // Bb2, Bb2, Bb3, Bb2
      ];

      const playNextStep = () => {
        if (!this.isBgmPlaying || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const freq = bassNotes[this.bgmStep % bassNotes.length];

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.09);
        filter.Q.value = 4;

        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.11);

        this.bgmStep++;
        this.bgmTimer = setTimeout(playNextStep, 115);
      };

      playNextStep();
    }

    stopBgm() {
      this.isBgmPlaying = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  // --- PARTICLE ENGINE ---
  class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, isGlow = false) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.size = size;
      this.life = life;
      this.maxLife = life;
      this.decay = decay;
      this.isGlow = isGlow;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= this.decay * dt;
    }

    draw(ctx) {
      if (this.life <= 0) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.globalAlpha = alpha;
      if (this.isGlow) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
      }
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size * alpha), 0, Math.PI * 2);
      ctx.fill();
      if (this.isGlow) {
        ctx.shadowBlur = 0;
      }
    }
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
      this.maxParticles = 200;
    }

    update(dt) {
      // In-place compaction without allocating memory or shifting array
      let alive = 0;
      const limit = Math.min(this.particles.length, this.maxParticles);
      for (let i = 0; i < limit; i++) {
        const p = this.particles[i];
        p.update(dt);
        if (p.life > 0) {
          this.particles[alive++] = p;
        }
      }
      this.particles.length = alive;
    }

    draw(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].draw(ctx);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Runner footstep spark / trail
    emitRunTrail(x, y) {
      this.particles.push(
        new Particle(
          x + (Math.random() * 8 - 4),
          y + (Math.random() * 4 - 2),
          -120 - Math.random() * 80,
          Math.random() * -30 - 5,
          '#00f0ff',
          Math.random() * 3 + 1.5,
          0.35,
          1.8,
          true
        )
      );
    }

    // Jet thrust sparks while jumping
    emitJumpThrust(x, y) {
      for (let i = 0; i < 2; i++) {
        this.particles.push(
          new Particle(
            x + (Math.random() * 10 - 5),
            y,
            -80 + (Math.random() * 40 - 20),
            120 + Math.random() * 80,
            '#00f0ff',
            Math.random() * 3 + 2,
            0.28,
            2.2,
            true
          )
        );
      }
    }

    // Intense friction sparks when sliding
    emitSlideSparks(x, y) {
      for (let i = 0; i < 3; i++) {
        this.particles.push(
          new Particle(
            x + (Math.random() * 20 - 10),
            y,
            -180 - Math.random() * 180,
            -30 - Math.random() * 80,
            Math.random() > 0.4 ? '#ff0055' : '#ffe600',
            Math.random() * 3 + 1.5,
            0.3,
            2.5,
            true
          )
        );
      }
    }

    // Shockwave upon fast dive landing
    emitDiveImpact(x, y) {
      for (let i = 0; i < 20; i++) {
        const angle = Math.PI + (Math.random() * Math.PI);
        const speed = 100 + Math.random() * 260;
        this.particles.push(
          new Particle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed * 0.4,
            '#00f0ff',
            Math.random() * 4 + 2,
            0.45,
            1.6,
            true
          )
        );
      }
    }

    // Golden burst when collecting data chips
    emitChipCollect(x, y) {
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 220;
        this.particles.push(
          new Particle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            Math.random() > 0.3 ? '#ffe600' : '#ffffff',
            Math.random() * 3.5 + 2,
            0.5,
            1.4,
            true
          )
        );
      }
    }

    // Massive violent explosion upon crash
    emitCrashExplosion(x, y) {
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 450;
        const colors = ['#00f0ff', '#ff0055', '#ff3366', '#ffffff', '#ffe600'];
        this.particles.push(
          new Particle(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 50,
            colors[Math.floor(Math.random() * colors.length)],
            Math.random() * 5 + 2,
            0.85,
            1.1,
            true
          )
        );
      }
    }

    clear() {
      this.particles = [];
    }
  }

  // --- PARALLAX CYBERPUNK BACKGROUND & 3D RETRO GRID ---
  class ParallaxCity {
    constructor(canvasWidth, canvasHeight, groundY) {
      this.width = canvasWidth;
      this.height = canvasHeight;
      this.groundY = groundY;
      this.gridOffset = 0;
      this.cachedGradients = null;

      // Distant stars/data particles
      this.stars = [];
      for (let i = 0; i < 55; i++) {
        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * (this.groundY - 120),
          size: Math.random() * 2 + 0.8,
          alpha: Math.random() * 0.7 + 0.3,
          speed: Math.random() * 15 + 5
        });
      }

      // Skyline buildings
      this.buildings = [];
      let curX = 0;
      while (curX < this.width * 2) {
        const bWidth = 60 + Math.random() * 90;
        const bHeight = 140 + Math.random() * 220;
        const windows = [];
        const rows = Math.floor(bHeight / 24);
        const cols = Math.floor(bWidth / 18);
        for (let r = 1; r < rows; r++) {
          for (let c = 1; c < cols; c++) {
            if (Math.random() > 0.45) {
              windows.push({
                x: c * 18,
                y: r * 24,
                lit: Math.random() > 0.35,
                color: Math.random() > 0.6 ? '#00f0ff' : '#ff0055'
              });
            }
          }
        }
        this.buildings.push({
          x: curX,
          width: bWidth,
          height: bHeight,
          windows: windows
        });
        curX += bWidth + (10 + Math.random() * 30);
      }
    }

    update(dt, gameSpeed) {
      // Move stars
      for (let s of this.stars) {
        s.x -= (s.speed + gameSpeed * 0.05) * dt;
        if (s.x < 0) {
          s.x = this.width;
          s.y = Math.random() * (this.groundY - 120);
        }
      }

      // Move buildings
      const bSpeed = gameSpeed * 0.18;
      for (let b of this.buildings) {
        b.x -= bSpeed * dt;
      }
      // Loop buildings smoothly without array allocations
      let rightMostB = 0;
      for (let i = 0; i < this.buildings.length; i++) {
        const edge = this.buildings[i].x + this.buildings[i].width;
        if (edge > rightMostB) rightMostB = edge;
      }
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        if (b.x + b.width < 0) {
          b.x = rightMostB + (15 + Math.random() * 25);
        }
      }

      // Scroll 3D Perspective Grid
      this.gridOffset = (this.gridOffset + gameSpeed * dt * 0.75) % 40;
    }

    initGradients(ctx) {
      const sunX = this.width * 0.76;
      const sunY = this.groundY - 130;
      const sunRadius = 65;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
      skyGrad.addColorStop(0, '#040510');
      skyGrad.addColorStop(0.55, '#0a0d24');
      skyGrad.addColorStop(1, '#1b0f34');

      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius + 50);
      sunGlow.addColorStop(0, 'rgba(255, 0, 85, 0.45)');
      sunGlow.addColorStop(0.5, 'rgba(157, 0, 255, 0.2)');
      sunGlow.addColorStop(1, 'transparent');

      const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
      sunGrad.addColorStop(0, '#ffe600');
      sunGrad.addColorStop(0.4, '#ff0055');
      sunGrad.addColorStop(1, '#9d00ff');

      const horizonGrad = ctx.createLinearGradient(0, this.groundY - 15, 0, this.groundY + 25);
      horizonGrad.addColorStop(0, 'transparent');
      horizonGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.45)');
      horizonGrad.addColorStop(0.7, 'rgba(255, 0, 85, 0.3)');
      horizonGrad.addColorStop(1, 'transparent');

      const floorH = this.height - this.groundY;
      const floorGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
      floorGrad.addColorStop(0, '#060613');
      floorGrad.addColorStop(1, '#010207');

      this.cachedGradients = { skyGrad, sunGlow, sunGrad, horizonGrad, floorGrad, sunX, sunY, sunRadius, floorH };
    }

    draw(ctx) {
      if (!this.cachedGradients) this.initGradients(ctx);
      const g = this.cachedGradients;

      // 1. Sky Gradient
      ctx.fillStyle = g.skyGrad;
      ctx.fillRect(0, 0, this.width, this.groundY);

      // 2. Neon Cyber Moon / Sun
      ctx.fillStyle = g.sunGlow;
      ctx.beginPath();
      ctx.arc(g.sunX, g.sunY, g.sunRadius + 50, 0, Math.PI * 2);
      ctx.fill();

      // Sun Disc
      ctx.fillStyle = g.sunGrad;
      ctx.beginPath();
      ctx.arc(g.sunX, g.sunY, g.sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // Sun horizontal retro blinds lines
      ctx.fillStyle = '#0a0d24';
      for (let i = -4; i < 6; i++) {
        const lineY = g.sunY + i * 11;
        const lineH = Math.max(2, (i + 5) * 0.9);
        if (lineY > g.sunY - 20) {
          ctx.fillRect(g.sunX - g.sunRadius - 5, lineY, (g.sunRadius + 5) * 2, lineH);
        }
      }

      // 3. Stars / Data motes
      for (let s of this.stars) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = s.alpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // 4. Skyline Silhouette & Windows
      for (let b of this.buildings) {
        if (b.x + b.width < -10 || b.x > this.width + 10) continue;
        const by = this.groundY - b.height;

        // Building body
        ctx.fillStyle = '#070a18';
        ctx.fillRect(b.x, by, b.width, b.height);

        // Building neon roof edge
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, by, b.width, b.height);

        // Windows
        for (let w of b.windows) {
          if (w.lit) {
            ctx.fillStyle = w.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(b.x + w.x, by + w.y, 7, 10);
          }
        }
        ctx.globalAlpha = 1;
      }

      // 5. Horizon Neon Glow
      ctx.fillStyle = g.horizonGrad;
      ctx.fillRect(0, this.groundY - 20, this.width, 45);

      // 6. 3D RETRO PERSPECTIVE GRID FLOOR
      ctx.fillStyle = g.floorGrad;
      ctx.fillRect(0, this.groundY, this.width, g.floorH);

      // Perspective horizontal lines that move towards the camera
      ctx.lineWidth = 1.5;
      const numLines = 14;
      for (let i = 0; i <= numLines; i++) {
        // Perspective curve
        const ratio = (i + (this.gridOffset / 40)) / numLines;
        if (ratio > 1) continue;
        const y = this.groundY + Math.pow(ratio, 2.3) * floorH;
        const alpha = Math.min(1, Math.pow(ratio, 1.2) * 0.85);

        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }

      // Perspective vertical vanishing lines
      const vanishingX = this.width * 0.5;
      const vanishingY = this.groundY - 30;
      const numVertLines = 26;
      for (let i = 0; i <= numVertLines; i++) {
        const bottomX = (i / numVertLines) * this.width * 2.2 - (this.width * 0.6);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
        ctx.beginPath();
        ctx.moveTo(vanishingX, vanishingY);
        ctx.lineTo(bottomX, this.height);
        ctx.stroke();
      }

      // Ground Top Line Neon Edge
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      ctx.lineTo(this.width, this.groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // --- PLAYER / CYBER RUNNER CHARACTER ---
  class CyberRunner {
    constructor(groundY) {
      this.groundY = groundY;
      this.width = 44;
      this.height = 76;
      this.x = 180;
      this.y = this.groundY - this.height;

      this.vy = 0;
      this.gravity = 2400;
      this.jumpForce = -880;
      this.diveForce = 1550;

      this.isGrounded = true;
      this.isSliding = false;
      this.slideTimer = 0;
      this.slideDuration = 0.62;

      this.runCycle = 0;
      this.trailTimer = 0;
    }

    reset() {
      this.isGrounded = true;
      this.isSliding = false;
      this.slideTimer = 0;
      this.vy = 0;
      this.y = this.groundY - this.height;
      this.runCycle = 0;
    }

    jump(soundSynth, particles) {
      if (this.isGrounded && !this.isSliding) {
        this.vy = this.jumpForce;
        this.isGrounded = false;
        soundSynth.playJump();
        particles.emitJumpThrust(this.x + 22, this.y + this.height);
        return true;
      }
      return false;
    }

    slide(soundSynth, particles) {
      if (this.isGrounded && !this.isSliding) {
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        soundSynth.playSlide();
        particles.emitSlideSparks(this.x + 10, this.groundY);
        return true;
      }
      return false;
    }

    fastDrop(soundSynth, particles) {
      if (!this.isGrounded && this.vy < this.diveForce) {
        this.vy = this.diveForce;
        soundSynth.playDive();
        particles.emitJumpThrust(this.x + 22, this.y + this.height);
        return true;
      }
      return false;
    }

    update(dt, soundSynth, particles) {
      // 1. Sliding update
      if (this.isSliding) {
        this.slideTimer -= dt;
        particles.emitSlideSparks(this.x + 10, this.groundY);
        if (this.slideTimer <= 0) {
          this.isSliding = false;
        }
      }

      // 2. Vertical Physics (Jumping & Gravity)
      if (!this.isGrounded) {
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;

        // Thrust emission during ascent
        if (this.vy < 0) {
          particles.emitJumpThrust(this.x + 20, this.y + this.height);
        }

        // Hit ground
        if (this.y >= this.groundY - this.height) {
          this.y = this.groundY - this.height;
          const wasDiving = this.vy > 1000;
          this.vy = 0;
          this.isGrounded = true;

          if (wasDiving) {
            particles.emitDiveImpact(this.x + 22, this.groundY);
          }
        }
      } else {
        // Running cycle
        this.runCycle += dt * 14;
        this.trailTimer += dt;
        if (this.trailTimer > 0.06 && !this.isSliding) {
          particles.emitRunTrail(this.x + 12, this.groundY - 2);
          this.trailTimer = 0;
        }
      }
    }

    // Dynamic AABB Hitbox
    getHitbox() {
      if (this.isSliding) {
        return {
          x: this.x + 4,
          y: this.groundY - 32,
          width: 58,
          height: 30
        };
      }
      return {
        x: this.x + 8,
        y: this.y + 4,
        width: 32,
        height: this.height - 6
      };
    }

    draw(ctx) {
      ctx.save();
      const currentHitbox = this.getHitbox();

      if (this.isSliding) {
        // SLIDING POSE: Low profile sleek cyber silhouette
        const slideY = this.groundY - 30;

        // Slide glowing shadow
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#00f0ff';

        // Kinetic torso angle
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(this.x + 4, slideY + 26);
        ctx.lineTo(this.x + 48, slideY + 12);
        ctx.lineTo(this.x + 58, slideY + 26);
        ctx.closePath();
        ctx.fill();

        // Cyber Visor / Helmet (lowered)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 40, slideY + 8, 16, 7);

        // Core energy battery
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(this.x + 28, slideY + 20, 4, 0, Math.PI * 2);
        ctx.fill();

        // Neon kinetic streak
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x - 14, slideY + 26);
        ctx.lineTo(this.x + 14, slideY + 26);
        ctx.stroke();

      } else {
        // RUNNING / JUMPING POSE
        const px = this.x + 10;
        const py = this.y;

        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f0ff';

        // Procedural limb offsets
        let legSwing = Math.sin(this.runCycle) * 14;
        let armSwing = Math.cos(this.runCycle) * 12;
        if (!this.isGrounded) {
          legSwing = -8;
          armSwing = -14;
        }

        // 1. Back Arm
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 26);
        ctx.lineTo(px + 12 - armSwing, py + 42);
        ctx.stroke();

        // 2. Back Leg
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.65)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 48);
        ctx.lineTo(px + 12 - legSwing, py + 64);
        ctx.lineTo(px + 14 - legSwing * 1.3, py + 74);
        ctx.stroke();

        // 3. Torso & Cyber Suit
        ctx.fillStyle = '#0a1024';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(px + 6, py + 22);
        ctx.lineTo(px + 20, py + 20);
        ctx.lineTo(px + 18, py + 48);
        ctx.lineTo(px + 8, py + 48);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing reactor core in chest
        ctx.fillStyle = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px + 14, py + 30, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Cyber Helmet / Visor
        ctx.fillStyle = '#030712';
        ctx.beginPath();
        ctx.arc(px + 14, py + 12, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Visor glow
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(px + 14, py + 9, 10, 5);

        // 5. Front Leg
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 48);
        ctx.lineTo(px + 12 + legSwing, py + 64);
        ctx.lineTo(px + 16 + legSwing * 1.3, py + 74);
        ctx.stroke();

        // 6. Front Arm
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 26);
        ctx.lineTo(px + 12 + armSwing, py + 42);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // --- OBSTACLE MANAGER ---
  // Types:
  // 1. BARRIER: Ground laser fence (jump over)
  // 2. DRONE: Mid-air hunter drone (slide underneath)
  class ObstacleManager {
    constructor(canvasWidth, groundY) {
      this.width = canvasWidth;
      this.groundY = groundY;
      this.obstacles = [];
      this.spawnTimer = 1.4;
    }

    reset() {
      this.obstacles = [];
      this.spawnTimer = 1.6;
    }

    update(dt, gameSpeed) {
      // Move obstacles
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= gameSpeed * dt;
        obs.animTime = (obs.animTime || 0) + dt;

        // Hover bob for drones
        if (obs.type === 'DRONE') {
          obs.currentY = obs.baseY + Math.sin(obs.animTime * 5) * 8;
        }

        // Remove off-screen
        if (obs.x + obs.width < -50) {
          this.obstacles.splice(i, 1);
        }
      }

      // Spawning logic with dynamic spacing
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle(gameSpeed);
        // Dynamic fair interval based on current speed
        const minGap = 1.3;
        const speedFactor = Math.max(0.65, 450 / gameSpeed);
        this.spawnTimer = (minGap * speedFactor) + Math.random() * 0.9;
      }
    }

    spawnObstacle(gameSpeed) {
      // 55% chance for ground barrier, 45% chance for mid-air drone
      const isDrone = Math.random() > 0.52;

      if (isDrone) {
        // Mid-air drone: player standing height is ~76px, so drone sits ~88px above ground
        // A standing or jumping player collides; a sliding player (height 32) safely glides under!
        const droneWidth = 52;
        const droneHeight = 36;
        const droneY = this.groundY - 84;

        this.obstacles.push({
          type: 'DRONE',
          x: this.width + 40,
          baseY: droneY,
          currentY: droneY,
          width: droneWidth,
          height: droneHeight,
          animTime: Math.random() * Math.PI
        });
      } else {
        // Ground laser barrier: 48px wide, 54px high. Jumpable!
        const bWidth = 44 + (Math.random() > 0.6 ? 18 : 0);
        const bHeight = 52;
        this.obstacles.push({
          type: 'BARRIER',
          x: this.width + 40,
          y: this.groundY - bHeight,
          width: bWidth,
          height: bHeight,
          animTime: 0
        });
      }
    }

    draw(ctx) {
      for (let obs of this.obstacles) {
        ctx.save();
        if (obs.type === 'BARRIER') {
          // Neon Laser Barrier
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff0055';

          // Side emitter pillars
          ctx.fillStyle = '#0e172a';
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2.5;

          // Left pillar
          ctx.fillRect(obs.x, obs.y, 10, obs.height);
          ctx.strokeRect(obs.x, obs.y, 10, obs.height);
          // Right pillar
          ctx.fillRect(obs.x + obs.width - 10, obs.y, 10, obs.height);
          ctx.strokeRect(obs.x + obs.width - 10, obs.y, 10, obs.height);

          // Energy beams (flickering neon laser)
          const beamPulse = 0.7 + Math.sin(obs.animTime * 18) * 0.3;
          ctx.strokeStyle = `rgba(255, 0, 85, ${beamPulse})`;
          ctx.lineWidth = 4;
          for (let ly = obs.y + 10; ly < obs.y + obs.height - 6; ly += 14) {
            ctx.beginPath();
            ctx.moveTo(obs.x + 8, ly);
            ctx.lineTo(obs.x + obs.width - 8, ly);
            ctx.stroke();
          }

          // Spikes / Danger Warning Icon
          ctx.fillStyle = '#ffe600';
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y + 6);
          ctx.lineTo(obs.x + obs.width / 2 - 6, obs.y + 20);
          ctx.lineTo(obs.x + obs.width / 2 + 6, obs.y + 20);
          ctx.closePath();
          ctx.fill();

        } else if (obs.type === 'DRONE') {
          // Mid-Air Hunter Security Drone
          const dy = obs.currentY;

          ctx.shadowBlur = 16;
          ctx.shadowColor = '#ff0055';

          // Drone Hull
          ctx.fillStyle = '#090e1f';
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(obs.x + 6, dy + 18);
          ctx.lineTo(obs.x + 26, dy + 4);
          ctx.lineTo(obs.x + obs.width - 6, dy + 18);
          ctx.lineTo(obs.x + 26, dy + 28);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing Scanning Eye (Red / Magenta)
          ctx.fillStyle = '#ff0055';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(obs.x + 26, dy + 18, 5, 0, Math.PI * 2);
          ctx.fill();

          // Rotor lights
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(obs.x + 2, dy + 12, 6, 3);
          ctx.fillRect(obs.x + obs.width - 8, dy + 12, 6, 3);

          // Downward Scanning Cone Beam (warning player to slide)
          const coneGrad = ctx.createLinearGradient(obs.x + 26, dy + 24, obs.x + 26, this.groundY);
          coneGrad.addColorStop(0, 'rgba(255, 0, 85, 0.45)');
          coneGrad.addColorStop(1, 'rgba(255, 0, 85, 0.0)');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(obs.x + 20, dy + 24);
          ctx.lineTo(obs.x + 32, dy + 24);
          ctx.lineTo(obs.x + 48, this.groundY);
          ctx.lineTo(obs.x + 4, this.groundY);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    getCollisions(playerHitbox) {
      for (let obs of this.obstacles) {
        let obsBox;
        if (obs.type === 'BARRIER') {
          obsBox = {
            x: obs.x + 3,
            y: obs.y + 4,
            width: obs.width - 6,
            height: obs.height - 4
          };
        } else {
          // DRONE hitbox: precise body coordinates
          obsBox = {
            x: obs.x + 4,
            y: obs.currentY + 4,
            width: obs.width - 8,
            height: obs.height - 8
          };
        }

        // AABB overlap test
        if (
          playerHitbox.x < obsBox.x + obsBox.width &&
          playerHitbox.x + playerHitbox.width > obsBox.x &&
          playerHitbox.y < obsBox.y + obsBox.height &&
          playerHitbox.y + playerHitbox.height > obsBox.y
        ) {
          return obs;
        }
      }
      return null;
    }
  }

  // --- COLLECTIBLES (DATA-CHIPS) ---
  class DataChipManager {
    constructor(canvasWidth, groundY) {
      this.width = canvasWidth;
      this.groundY = groundY;
      this.chips = [];
      this.spawnTimer = 2.2;
    }

    reset() {
      this.chips = [];
      this.spawnTimer = 2.0;
    }

    update(dt, gameSpeed) {
      for (let i = this.chips.length - 1; i >= 0; i--) {
        const c = this.chips[i];
        c.x -= gameSpeed * dt;
        c.animTime += dt * 4;

        if (c.x + c.size < -30) {
          this.chips.splice(i, 1);
        }
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnPattern();
        this.spawnTimer = 2.8 + Math.random() * 2.2;
      }
    }

    spawnPattern() {
      // Spawn either an arc of 3-4 chips or a ground run
      const patternType = Math.random();
      if (patternType < 0.5) {
        // High jump arc
        const count = 4;
        const startX = this.width + 60;
        for (let i = 0; i < count; i++) {
          const arcRatio = i / (count - 1);
          const arcHeight = Math.sin(arcRatio * Math.PI) * 95;
          this.chips.push({
            x: startX + i * 44,
            y: this.groundY - 80 - arcHeight,
            size: 14,
            animTime: i * 0.4
          });
        }
      } else {
        // Low slide reward lane
        const count = 3;
        const startX = this.width + 60;
        for (let i = 0; i < count; i++) {
          this.chips.push({
            x: startX + i * 42,
            y: this.groundY - 25,
            size: 14,
            animTime: i * 0.4
          });
        }
      }
    }

    checkCollection(playerHitbox, soundSynth, particles) {
      let collectedCount = 0;
      for (let i = this.chips.length - 1; i >= 0; i--) {
        const c = this.chips[i];
        if (
          playerHitbox.x < c.x + c.size &&
          playerHitbox.x + playerHitbox.width > c.x - c.size &&
          playerHitbox.y < c.y + c.size &&
          playerHitbox.y + playerHitbox.height > c.y - c.size
        ) {
          soundSynth.playCollect();
          particles.emitChipCollect(c.x, c.y);
          this.chips.splice(i, 1);
          collectedCount++;
        }
      }
      return collectedCount;
    }

    draw(ctx) {
      for (let c of this.chips) {
        ctx.save();
        const pulse = 1 + Math.sin(c.animTime) * 0.15;
        const rotation = c.animTime * 1.5;

        ctx.translate(c.x, c.y);
        ctx.scale(pulse, pulse);

        // Outer glow
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ffe600';

        // Outer rotating hexagon
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const rad = rotation + (a * Math.PI) / 3;
          const hx = Math.cos(rad) * c.size;
          const hy = Math.sin(rad) * c.size;
          if (a === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  // --- MAIN GAME CONTROLLER ---
  class CyberRunnerGame {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');

      // Virtual Coordinate Resolution
      this.V_WIDTH = 1280;
      this.V_HEIGHT = 720;
      this.GROUND_Y = 575;

      // Audio & Particle Engines
      this.synth = new SoundSynth();
      this.particles = new ParticleSystem();
      this.city = new ParallaxCity(this.V_WIDTH, this.V_HEIGHT, this.GROUND_Y);
      this.runner = new CyberRunner(this.GROUND_Y);
      this.obstacles = new ObstacleManager(this.V_WIDTH, this.GROUND_Y);
      this.chipsManager = new DataChipManager(this.V_WIDTH, this.GROUND_Y);

      // Game States: 'START', 'RUNNING', 'GAMEOVER'
      this.state = 'START';

      // Gameplay metrics
      this.baseSpeed = 420;
      this.gameSpeed = this.baseSpeed;
      this.distance = 0;
      this.score = 0;
      this.chipsCollected = 0;
      this.highScore = parseInt(localStorage.getItem('cyber_runner_hi_score') || '0', 10);

      // Timing & Animation
      this.lastTime = 0;
      this.screenShakeTime = 0;

      // DOM Elements
      this.dom = {
        hud: document.getElementById('hud'),
        scoreDisplay: document.getElementById('score-display'),
        distDisplay: document.getElementById('dist-display'),
        speedDisplay: document.getElementById('speed-display'),
        chipsDisplay: document.getElementById('chips-display'),
        highDisplay: document.getElementById('high-display'),
        soundBtn: document.getElementById('sound-btn'),
        soundIcon: document.getElementById('sound-icon'),
        startScreen: document.getElementById('start-screen'),
        startBtn: document.getElementById('start-btn'),
        gameOverScreen: document.getElementById('game-over-screen'),
        restartBtn: document.getElementById('restart-btn'),
        finalScore: document.getElementById('final-score'),
        finalDistance: document.getElementById('final-distance'),
        finalChips: document.getElementById('final-chips'),
        finalHighscore: document.getElementById('final-highscore'),
        newHighBadge: document.getElementById('new-high-badge'),
        touchJump: document.getElementById('touch-jump'),
        touchSlide: document.getElementById('touch-slide')
      };

      this.init();
    }

    init() {
      this.handleResize();
      let resizeRaf = null;
      window.addEventListener('resize', () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => this.handleResize());
      });

      this.updateHighscoreUI();
      this.bindEvents();

      // Start rendering loop
      requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleResize() {
      // Dynamic scaling with DPI capping (max 2) for optimal 60+ FPS on Retina/4K displays
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
        if (this.city) {
          this.city.cachedGradients = null;
        }
      }
    }

    bindEvents() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          this.handleJumpInput();
        } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          this.handleSlideInput();
        } else if (e.code === 'KeyR' && this.state === 'GAMEOVER') {
          this.restartGame();
        }
      });

      // UI Buttons
      this.dom.startBtn.addEventListener('click', () => this.startGame());
      this.dom.restartBtn.addEventListener('click', () => this.restartGame());

      // Sound Mute Toggle
      this.dom.soundBtn.addEventListener('click', () => {
        this.synth.init();
        const isMuted = this.synth.toggleMute();
        this.dom.soundIcon.textContent = isMuted ? '🔇' : '🔊';
        this.synth.playClick();
      });

      // Touch / Mobile Zones
      this.dom.touchJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleJumpInput();
      });
      this.dom.touchSlide.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleSlideInput();
      });

      // Pause / resume audio smoothly when tab loses or regains focus
      let wasBgmPlaying = false;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.synth && this.synth.isBgmPlaying) {
            wasBgmPlaying = true;
            this.synth.stopBgm();
          }
        } else {
          if (wasBgmPlaying && this.state === 'RUNNING' && !this.synth.muted) {
            this.synth.startBgm();
            wasBgmPlaying = false;
          }
        }
      });
    }

    handleJumpInput() {
      this.synth.init();
      if (this.state === 'START') {
        this.startGame();
      } else if (this.state === 'RUNNING') {
        this.runner.jump(this.synth, this.particles);
      } else if (this.state === 'GAMEOVER') {
        this.restartGame();
      }
    }

    handleSlideInput() {
      this.synth.init();
      if (this.state === 'RUNNING') {
        if (!this.runner.isGrounded) {
          // Mid-air quick drop
          this.runner.fastDrop(this.synth, this.particles);
        } else {
          // Ground slide
          this.runner.slide(this.synth, this.particles);
        }
      }
    }

    startGame() {
      this.synth.init();
      this.synth.playClick();
      this.synth.startBgm();

      this.state = 'RUNNING';
      this.dom.startScreen.classList.remove('active');
      this.dom.gameOverScreen.classList.remove('active');

      this.resetStats();
    }

    restartGame() {
      this.synth.init();
      this.synth.playClick();
      this.synth.startBgm();

      this.state = 'RUNNING';
      this.dom.gameOverScreen.classList.remove('active');

      this.resetStats();
      this.runner.reset();
      this.obstacles.reset();
      this.chipsManager.reset();
      this.particles.clear();
    }

    resetStats() {
      this.gameSpeed = this.baseSpeed;
      this.distance = 0;
      this.score = 0;
      this.chipsCollected = 0;
      this.screenShakeTime = 0;
      this.updateHud();
    }

    triggerGameOver() {
      this.state = 'GAMEOVER';
      this.synth.stopBgm();
      this.synth.playCrash();

      this.screenShakeTime = 0.55;
      this.particles.emitCrashExplosion(this.runner.x + 22, this.runner.y + 35);

      // Check High Score
      const isNewRecord = this.score > this.highScore;
      if (isNewRecord) {
        this.highScore = this.score;
        localStorage.setItem('cyber_runner_hi_score', this.highScore.toString());
        this.dom.newHighBadge.classList.remove('hidden');
      } else {
        this.dom.newHighBadge.classList.add('hidden');
      }

      this.dom.finalScore.textContent = this.score.toLocaleString();
      this.dom.finalDistance.textContent = Math.floor(this.distance) + ' m';
      this.dom.finalChips.textContent = this.chipsCollected;
      this.dom.finalHighscore.textContent = this.highScore.toLocaleString();

      this.updateHighscoreUI();
      setTimeout(() => {
        this.dom.gameOverScreen.classList.add('active');
      }, 450);
    }

    updateHighscoreUI() {
      const formatted = this.highScore.toString().padStart(6, '0');
      this.dom.highDisplay.textContent = `HI: ${formatted}`;
    }

    updateHud() {
      const formattedScore = Math.floor(this.score).toString().padStart(6, '0');
      this.dom.scoreDisplay.textContent = formattedScore;
      this.dom.distDisplay.textContent = `${Math.floor(this.distance)} m`;
      this.dom.speedDisplay.textContent = `${(this.gameSpeed / this.baseSpeed).toFixed(1)}x`;
      this.dom.chipsDisplay.textContent = `⬡ ${this.chipsCollected.toString().padStart(2, '0')}`;
    }

    gameLoop(currentTime) {
      if (!this.lastTime) this.lastTime = currentTime;
      let dt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Cap delta time to prevent physics clipping on tab unfocus
      if (dt > 0.1) dt = 0.1;

      // Update
      this.update(dt);

      // Render
      this.render();

      requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
      if (this.state === 'RUNNING') {
        // Accelerate game speed smoothly over time
        this.gameSpeed = Math.min(840, this.baseSpeed + this.distance * 0.18);

        // Distance & Score progression
        const distDelta = (this.gameSpeed * dt) * 0.15;
        this.distance += distDelta;
        this.score += distDelta * 8;

        // Update sub-systems
        this.city.update(dt, this.gameSpeed);
        this.runner.update(dt, this.synth, this.particles);
        this.obstacles.update(dt, this.gameSpeed);
        this.chipsManager.update(dt, this.gameSpeed);

        // Check Chip Collections (+150 pts each)
        const hitChips = this.chipsManager.checkCollection(this.runner.getHitbox(), this.synth, this.particles);
        if (hitChips > 0) {
          this.chipsCollected += hitChips;
          this.score += hitChips * 150;
        }

        // Check Collisions
        const collided = this.obstacles.getCollisions(this.runner.getHitbox());
        if (collided) {
          this.triggerGameOver();
        }

        this.updateHud();
      } else {
        // Idle/title/gameover state: city continues subtle background movement
        this.city.update(dt, 80);
      }

      this.particles.update(dt);

      if (this.screenShakeTime > 0) {
        this.screenShakeTime -= dt;
      }
    }

    render() {
      const ctx = this.ctx;
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      // Clear canvas
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Scale to internal virtual coordinate space (1280x720)
      const scaleX = this.canvas.width / this.V_WIDTH;
      const scaleY = this.canvas.height / this.V_HEIGHT;
      ctx.scale(scaleX, scaleY);

      // Screen Shake Effect
      if (this.screenShakeTime > 0) {
        const magnitude = this.screenShakeTime * 18;
        const ox = (Math.random() * 2 - 1) * magnitude;
        const oy = (Math.random() * 2 - 1) * magnitude;
        ctx.translate(ox, oy);
      }

      // Draw Parallax City & 3D Retro Grid
      this.city.draw(ctx);

      // Draw Collectible Data Chips
      this.chipsManager.draw(ctx);

      // Draw Obstacles (Barriers & Hunter Drones)
      this.obstacles.draw(ctx);

      // Draw Cyber Runner
      if (this.state !== 'GAMEOVER' || this.screenShakeTime <= 0.3) {
        this.runner.draw(ctx);
      }

      // Draw Particles (Sparks, Jet Flame, Explosions)
      this.particles.draw(ctx);

      ctx.restore();
    }
  }

  // Auto-launch when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new CyberRunnerGame();
  });

})();
