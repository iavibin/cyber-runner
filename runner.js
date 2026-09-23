(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
  class SoundSynth {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.muted = false;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.isBgmPlaying = false;
      this.slideNoise = null;
      this.crashNoise = null;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Pre-generate procedural white noise buffers (reused across plays)
      const rate = this.ctx.sampleRate;
      const slideLen = Math.floor(rate * 0.18);
      this.slideNoise = this.ctx.createBuffer(1, slideLen, rate);
      const sData = this.slideNoise.getChannelData(0);
      for (let i = 0; i < slideLen; i++) sData[i] = Math.random() * 2 - 1;

      const crashLen = Math.floor(rate * 0.5);
      this.crashNoise = this.ctx.createBuffer(1, crashLen, rate);
      const cData = this.crashNoise.getChannelData(0);
      for (let i = 0; i < crashLen; i++) cData[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / crashLen));
    }

    toggleMute() {
      this.init();
      this.muted = !this.muted;
      if (this.masterGain) {
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);
      }
      if (this.muted && this.isBgmPlaying) this.stopBgm();
      else if (!this.muted && !this.isBgmPlaying) this.startBgm();
      return this.muted;
    }

    // Helper to play synthesized envelope tones
    playTone(type, startFreq, endFreq, startVol, duration, decayStart = 0) {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);

      gain.gain.setValueAtTime(startVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration);
    }

    playJump() {
      this.playTone('triangle', 160, 620, 0.28, 0.18);
    }

    playSlide() {
      if (this.muted || !this.ctx || !this.slideNoise) return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.slideNoise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(260, now + 0.18);
      filter.Q.value = 3;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(now);
    }

    playDive() {
      this.playTone('sine', 260, 45, 0.4, 0.22);
    }

    playCollect() {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      [1318.5, 1975.5].forEach((freq, idx) => {
        const t = now + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.24, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    }

    playNearMiss() {
      this.playTone('sine', 880, 1320, 0.2, 0.12);
    }

    playCrash() {
      if (this.muted || !this.ctx || !this.crashNoise) return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.crashNoise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(now);

      this.playTone('sawtooth', 150, 25, 0.35, 0.45);
    }

    playClick() {
      this.playTone('sine', 750, 1300, 0.16, 0.05);
    }

    startBgm() {
      if (this.muted || this.isBgmPlaying || !this.ctx) return;
      this.isBgmPlaying = true;
      this.bgmStep = 0;
      const bassNotes = [110, 110, 220, 110, 130.8, 130.8, 261.6, 130.8, 98, 98, 196, 98, 116.5, 116.5, 233, 116.5];

      const tick = () => {
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
        filter.frequency.exponentialRampToValueAtTime(170, now + 0.08);
        filter.Q.value = 3.5;

        gain.gain.setValueAtTime(0.075, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.1);

        this.bgmStep++;
        this.bgmTimer = setTimeout(tick, 115);
      };
      tick();
    }

    stopBgm() {
      this.isBgmPlaying = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  // --- OPTIMIZED PARTICLE ENGINE ---
  class Particle {
    init(x, y, vx, vy, color, size, life, decay, isGlow) {
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
      return this;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= this.decay * dt;
    }

    draw(ctx) {
      if (this.life <= 0) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      const r = Math.max(0.5, this.size * alpha);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Lightweight 2-layer glow without costly ctx.shadowBlur
      if (this.isGlow && alpha > 0.3) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  class ParticleSystem {
    constructor() {
      this.pool = [];
      this.active = [];
      this.maxParticles = 160;
    }

    spawn(x, y, vx, vy, color, size, life, decay, isGlow = false) {
      if (this.active.length >= this.maxParticles) return;
      const p = this.pool.pop() || new Particle();
      p.init(x, y, vx, vy, color, size, life, decay, isGlow);
      this.active.push(p);
    }

    update(dt) {
      let alive = 0;
      for (let i = 0; i < this.active.length; i++) {
        const p = this.active[i];
        p.update(dt);
        if (p.life > 0) {
          this.active[alive++] = p;
        } else {
          this.pool.push(p);
        }
      }
      this.active.length = alive;
    }

    draw(ctx) {
      for (let i = 0; i < this.active.length; i++) {
        this.active[i].draw(ctx);
      }
      ctx.globalAlpha = 1;
    }

    emitRunTrail(x, y) {
      this.spawn(x + (Math.random() * 8 - 4), y + (Math.random() * 4 - 2), -120 - Math.random() * 80, -15 - Math.random() * 20, '#00f0ff', 2.8, 0.3, 1.8, true);
    }

    emitJumpThrust(x, y) {
      for (let i = 0; i < 2; i++) {
        this.spawn(x + (Math.random() * 10 - 5), y, -70 + (Math.random() * 40 - 20), 120 + Math.random() * 80, '#00f0ff', 3, 0.25, 2.2, true);
      }
    }

    emitSlideSparks(x, y) {
      for (let i = 0; i < 2; i++) {
        this.spawn(x + (Math.random() * 20 - 10), y, -160 - Math.random() * 160, -25 - Math.random() * 70, Math.random() > 0.4 ? '#ff0055' : '#ffe600', 2.8, 0.28, 2.5, true);
      }
    }

    emitDiveImpact(x, y) {
      for (let i = 0; i < 16; i++) {
        const angle = Math.PI + Math.random() * Math.PI;
        const speed = 100 + Math.random() * 240;
        this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.4, '#00f0ff', 3.5, 0.4, 1.6, true);
      }
    }

    emitChipCollect(x, y) {
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 200;
        this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, Math.random() > 0.3 ? '#ffe600' : '#ffffff', 3.5, 0.45, 1.5, true);
      }
    }

    emitCrashExplosion(x, y) {
      const colors = ['#00f0ff', '#ff0055', '#ff3366', '#ffffff', '#ffe600'];
      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 400;
        this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 40, colors[Math.floor(Math.random() * colors.length)], 4.5, 0.75, 1.2, true);
      }
    }

    clear() {
      for (let i = 0; i < this.active.length; i++) this.pool.push(this.active[i]);
      this.active.length = 0;
    }
  }

  // --- PARALLAX CYBERPUNK BACKGROUND & PERSPECTIVE GRID ---
  class ParallaxCity {
    constructor(canvasWidth, canvasHeight, groundY) {
      this.width = canvasWidth;
      this.height = canvasHeight;
      this.groundY = groundY;
      this.gridOffset = 0;

      // Stars
      this.stars = [];
      for (let i = 0; i < 50; i++) {
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
              windows.push({ x: c * 18, y: r * 24, color: Math.random() > 0.6 ? '#00f0ff' : '#ff0055' });
            }
          }
        }
        this.buildings.push({ x: curX, width: bWidth, height: bHeight, windows });
        curX += bWidth + (10 + Math.random() * 30);
      }

      // Pre-cached gradients in virtual 1280x720 space
      this.cachedGrads = null;
    }

    initGrads(ctx) {
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

      this.cachedGrads = { skyGrad, sunGlow, sunGrad, horizonGrad, floorGrad, sunX, sunY, sunRadius, floorH };
    }

    update(dt, gameSpeed) {
      // Move stars
      const starSpeed = gameSpeed * 0.05;
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.x -= (s.speed + starSpeed) * dt;
        if (s.x < 0) {
          s.x = this.width;
          s.y = Math.random() * (this.groundY - 120);
        }
      }

      // Move & wrap buildings with single-pass rightmost tracking
      const bSpeed = gameSpeed * 0.18 * dt;
      let rightEdge = 0;
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        b.x -= bSpeed;
        const edge = b.x + b.width;
        if (edge > rightEdge) rightEdge = edge;
      }
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        if (b.x + b.width < 0) {
          b.x = rightEdge + 15 + Math.random() * 25;
          rightEdge = b.x + b.width;
        }
      }

      // Perspective Grid Offset
      this.gridOffset = (this.gridOffset + gameSpeed * dt * 0.75) % 40;
    }

    draw(ctx) {
      if (!this.cachedGrads) this.initGrads(ctx);
      const g = this.cachedGrads;

      // 1. Sky & Sun
      ctx.fillStyle = g.skyGrad;
      ctx.fillRect(0, 0, this.width, this.groundY);

      ctx.fillStyle = g.sunGlow;
      ctx.beginPath();
      ctx.arc(g.sunX, g.sunY, g.sunRadius + 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = g.sunGrad;
      ctx.beginPath();
      ctx.arc(g.sunX, g.sunY, g.sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // Retro sun blinds lines
      ctx.fillStyle = '#0a0d24';
      for (let i = -4; i < 6; i++) {
        const ly = g.sunY + i * 11;
        if (ly > g.sunY - 20) {
          ctx.fillRect(g.sunX - g.sunRadius - 5, ly, (g.sunRadius + 5) * 2, Math.max(2, (i + 5) * 0.9));
        }
      }

      // 2. Stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        ctx.globalAlpha = s.alpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // 3. Buildings & Windows
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        if (b.x + b.width < -10 || b.x > this.width + 10) continue;
        const by = this.groundY - b.height;

        ctx.fillStyle = '#070a18';
        ctx.fillRect(b.x, by, b.width, b.height);
        ctx.strokeRect(b.x, by, b.width, b.height);

        for (let j = 0; j < b.windows.length; j++) {
          const w = b.windows[j];
          ctx.fillStyle = w.color;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(b.x + w.x, by + w.y, 7, 10);
        }
      }
      ctx.globalAlpha = 1;

      // 4. Horizon Glow
      ctx.fillStyle = g.horizonGrad;
      ctx.fillRect(0, this.groundY - 20, this.width, 45);

      // 5. 3D Perspective Grid
      ctx.fillStyle = g.floorGrad;
      ctx.fillRect(0, this.groundY, this.width, g.floorH);

      // Moving horizontal lines
      const numLines = 14;
      for (let i = 0; i <= numLines; i++) {
        const ratio = (i + (this.gridOffset / 40)) / numLines;
        if (ratio > 1) continue;
        const y = this.groundY + Math.pow(ratio, 2.3) * g.floorH;
        ctx.strokeStyle = `rgba(0, 240, 255, ${Math.min(1, Math.pow(ratio, 1.2) * 0.85)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }

      // Vanishing vertical lines
      const vanishingX = this.width * 0.5;
      const vanishingY = this.groundY - 30;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
      for (let i = 0; i <= 26; i++) {
        const bottomX = (i / 26) * this.width * 2.2 - (this.width * 0.6);
        ctx.beginPath();
        ctx.moveTo(vanishingX, vanishingY);
        ctx.lineTo(bottomX, this.height);
        ctx.stroke();
      }

      // Ground Top Line
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      ctx.lineTo(this.width, this.groundY);
      ctx.stroke();
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

      // Reusable hitbox to eliminate garbage allocation
      this.hitbox = { x: 0, y: 0, width: 0, height: 0 };
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
      if (this.isSliding) {
        this.slideTimer -= dt;
        particles.emitSlideSparks(this.x + 10, this.groundY);
        if (this.slideTimer <= 0) this.isSliding = false;
      }

      if (!this.isGrounded) {
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;
        if (this.vy < 0) particles.emitJumpThrust(this.x + 20, this.y + this.height);

        if (this.y >= this.groundY - this.height) {
          this.y = this.groundY - this.height;
          const wasDiving = this.vy > 1000;
          this.vy = 0;
          this.isGrounded = true;
          if (wasDiving) particles.emitDiveImpact(this.x + 22, this.groundY);
        }
      } else {
        this.runCycle += dt * 14;
        this.trailTimer += dt;
        if (this.trailTimer > 0.06 && !this.isSliding) {
          particles.emitRunTrail(this.x + 12, this.groundY - 2);
          this.trailTimer = 0;
        }
      }
    }

    getHitbox() {
      if (this.isSliding) {
        this.hitbox.x = this.x + 4;
        this.hitbox.y = this.groundY - 32;
        this.hitbox.width = 58;
        this.hitbox.height = 30;
      } else {
        this.hitbox.x = this.x + 8;
        this.hitbox.y = this.y + 4;
        this.hitbox.width = 32;
        this.hitbox.height = this.height - 6;
      }
      return this.hitbox;
    }

    draw(ctx) {
      ctx.save();
      if (this.isSliding) {
        // Sliding Pose
        const slideY = this.groundY - 30;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(this.x + 4, slideY + 26);
        ctx.lineTo(this.x + 48, slideY + 12);
        ctx.lineTo(this.x + 58, slideY + 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 40, slideY + 8, 16, 7);

        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(this.x + 28, slideY + 20, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x - 14, slideY + 26);
        ctx.lineTo(this.x + 14, slideY + 26);
        ctx.stroke();
      } else {
        // Running / Jumping Pose
        const px = this.x + 10;
        const py = this.y;
        let legSwing = Math.sin(this.runCycle) * 14;
        let armSwing = Math.cos(this.runCycle) * 12;
        if (!this.isGrounded) {
          legSwing = -8;
          armSwing = -14;
        }

        // Back Arm & Leg
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 26);
        ctx.lineTo(px + 12 - armSwing, py + 42);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 180, 255, 0.65)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 48);
        ctx.lineTo(px + 12 - legSwing, py + 64);
        ctx.lineTo(px + 14 - legSwing * 1.3, py + 74);
        ctx.stroke();

        // Torso & Cyber Suit
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

        // Reactor Core
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(px + 14, py + 30, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Helmet & Visor
        ctx.fillStyle = '#030712';
        ctx.beginPath();
        ctx.arc(px + 14, py + 12, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(px + 14, py + 9, 10, 5);

        // Front Leg & Arm
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 48);
        ctx.lineTo(px + 12 + legSwing, py + 64);
        ctx.lineTo(px + 16 + legSwing * 1.3, py + 74);
        ctx.stroke();

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

  // --- OBSTACLE MANAGER & NEAR-MISS SYSTEM ---
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
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.x -= gameSpeed * dt;
        obs.animTime = (obs.animTime || 0) + dt;

        if (obs.type === 'DRONE') {
          obs.currentY = obs.baseY + Math.sin(obs.animTime * 5) * 8;
        }

        if (obs.x + obs.width < -50) {
          this.obstacles.splice(i, 1);
        }
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle(gameSpeed);
        const minGap = 1.3;
        const speedFactor = Math.max(0.65, 450 / gameSpeed);
        this.spawnTimer = (minGap * speedFactor) + Math.random() * 0.9;
      }
    }

    spawnObstacle(gameSpeed) {
      const isDrone = Math.random() > 0.52;
      if (isDrone) {
        const droneY = this.groundY - 84;
        this.obstacles.push({
          type: 'DRONE',
          x: this.width + 40,
          baseY: droneY,
          currentY: droneY,
          width: 52,
          height: 36,
          animTime: Math.random() * Math.PI,
          nearMissChecked: false
        });
      } else {
        const bHeight = 52;
        this.obstacles.push({
          type: 'BARRIER',
          x: this.width + 40,
          y: this.groundY - bHeight,
          width: 44 + (Math.random() > 0.6 ? 18 : 0),
          height: bHeight,
          animTime: 0,
          nearMissChecked: false
        });
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        ctx.save();
        if (obs.type === 'BARRIER') {
          // Pillars
          ctx.fillStyle = '#0e172a';
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2.5;

          ctx.fillRect(obs.x, obs.y, 10, obs.height);
          ctx.strokeRect(obs.x, obs.y, 10, obs.height);
          ctx.fillRect(obs.x + obs.width - 10, obs.y, 10, obs.height);
          ctx.strokeRect(obs.x + obs.width - 10, obs.y, 10, obs.height);

          // Beams
          const beamPulse = 0.7 + Math.sin(obs.animTime * 18) * 0.3;
          ctx.strokeStyle = `rgba(255, 0, 85, ${beamPulse})`;
          ctx.lineWidth = 4;
          for (let ly = obs.y + 10; ly < obs.y + obs.height - 6; ly += 14) {
            ctx.beginPath();
            ctx.moveTo(obs.x + 8, ly);
            ctx.lineTo(obs.x + obs.width - 8, ly);
            ctx.stroke();
          }

          // Danger Warning Icon
          ctx.fillStyle = '#ffe600';
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y + 6);
          ctx.lineTo(obs.x + obs.width / 2 - 6, obs.y + 20);
          ctx.lineTo(obs.x + obs.width / 2 + 6, obs.y + 20);
          ctx.closePath();
          ctx.fill();

        } else if (obs.type === 'DRONE') {
          const dy = obs.currentY;

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

          // Eye & Rotors
          ctx.fillStyle = '#ff0055';
          ctx.beginPath();
          ctx.arc(obs.x + 26, dy + 18, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(obs.x + 2, dy + 12, 6, 3);
          ctx.fillRect(obs.x + obs.width - 8, dy + 12, 6, 3);

          // Lightweight scanning cone without per-frame gradient allocation
          ctx.fillStyle = 'rgba(255, 0, 85, 0.15)';
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

    // Direct collision check without object allocation
    getCollisions(box) {
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        const ox = obs.x + 4;
        const oy = (obs.type === 'BARRIER' ? obs.y : obs.currentY) + 4;
        const ow = obs.width - 8;
        const oh = obs.height - (obs.type === 'BARRIER' ? 4 : 8);

        if (box.x < ox + ow && box.x + box.width > ox && box.y < oy + oh && box.y + box.height > oy) {
          return obs;
        }
      }
      return null;
    }

    // Check for near-miss (tight dodges) to reward player
    checkNearMiss(box) {
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        if (obs.nearMissChecked) continue;

        // Passed just behind the player
        if (obs.x + obs.width < box.x && obs.x + obs.width > box.x - 35) {
          obs.nearMissChecked = true;
          return { x: obs.x + obs.width / 2, y: obs.type === 'BARRIER' ? obs.y : obs.currentY };
        }
      }
      return null;
    }
  }

  // --- DATA-CHIPS COLLECTIBLES ---
  class DataChipManager {
    constructor(canvasWidth, groundY) {
      this.width = canvasWidth;
      this.groundY = groundY;
      this.chips = [];
      this.spawnTimer = 2.0;
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
        if (c.x + c.size < -30) this.chips.splice(i, 1);
      }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnPattern();
        this.spawnTimer = 2.8 + Math.random() * 2.2;
      }
    }

    spawnPattern() {
      const isHighArc = Math.random() < 0.5;
      const count = isHighArc ? 4 : 3;
      const startX = this.width + 60;
      for (let i = 0; i < count; i++) {
        const y = isHighArc
          ? this.groundY - 80 - Math.sin((i / (count - 1)) * Math.PI) * 95
          : this.groundY - 25;
        this.chips.push({ x: startX + i * 42, y, size: 14, animTime: i * 0.4 });
      }
    }

    checkCollection(box, soundSynth, particles) {
      let collected = 0;
      let lastCollectPos = null;
      for (let i = this.chips.length - 1; i >= 0; i--) {
        const c = this.chips[i];
        if (box.x < c.x + c.size && box.x + box.width > c.x - c.size && box.y < c.y + c.size && box.y + box.height > c.y - c.size) {
          soundSynth.playCollect();
          particles.emitChipCollect(c.x, c.y);
          lastCollectPos = { x: c.x, y: c.y };
          this.chips.splice(i, 1);
          collected++;
        }
      }
      return { count: collected, pos: lastCollectPos };
    }

    draw(ctx) {
      for (let i = 0; i < this.chips.length; i++) {
        const c = this.chips[i];
        ctx.save();
        const pulse = 1 + Math.sin(c.animTime) * 0.15;
        const rotation = c.animTime * 1.5;

        ctx.translate(c.x, c.y);
        ctx.scale(pulse, pulse);

        // Rotating hexagon
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

      this.V_WIDTH = 1280;
      this.V_HEIGHT = 720;
      this.GROUND_Y = 575;

      this.synth = new SoundSynth();
      this.particles = new ParticleSystem();
      this.city = new ParallaxCity(this.V_WIDTH, this.V_HEIGHT, this.GROUND_Y);
      this.runner = new CyberRunner(this.GROUND_Y);
      this.obstacles = new ObstacleManager(this.V_WIDTH, this.GROUND_Y);
      this.chipsManager = new DataChipManager(this.V_WIDTH, this.GROUND_Y);

      // States: 'START', 'RUNNING', 'PAUSED', 'GAMEOVER'
      this.state = 'START';

      this.baseSpeed = 420;
      this.gameSpeed = this.baseSpeed;
      this.distance = 0;
      this.score = 0;
      this.chipsCollected = 0;
      this.highScore = parseInt(localStorage.getItem('cyber_runner_hi_score') || '0', 10);

      this.lastTime = 0;
      this.screenShakeTime = 0;

      // DOM Elements Cache
      this.dom = {
        score: document.getElementById('score-display'),
        dist: document.getElementById('dist-display'),
        speed: document.getElementById('speed-display'),
        chips: document.getElementById('chips-display'),
        high: document.getElementById('high-display'),
        soundBtn: document.getElementById('sound-btn'),
        soundIcon: document.getElementById('sound-icon'),
        pauseBtn: document.getElementById('pause-btn'),
        pauseIcon: document.getElementById('pause-icon'),
        startScreen: document.getElementById('start-screen'),
        startBtn: document.getElementById('start-btn'),
        pauseScreen: document.getElementById('pause-screen'),
        resumeBtn: document.getElementById('resume-btn'),
        gameOverScreen: document.getElementById('game-over-screen'),
        restartBtn: document.getElementById('restart-btn'),
        finalScore: document.getElementById('final-score'),
        finalDistance: document.getElementById('final-distance'),
        finalChips: document.getElementById('final-chips'),
        finalHighscore: document.getElementById('final-highscore'),
        newHighBadge: document.getElementById('new-high-badge'),
        touchJump: document.getElementById('touch-jump'),
        touchSlide: document.getElementById('touch-slide'),
        notifications: document.getElementById('floating-notifications')
      };

      this.init();
    }

    init() {
      this.handleResize();
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        if (resizeTimer) cancelAnimationFrame(resizeTimer);
        resizeTimer = requestAnimationFrame(() => this.handleResize());
      });

      this.updateHighscoreUI();
      this.bindEvents();
      requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleResize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }
    }

    bindEvents() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const key = e.key;

        if (e.code === 'Space' || e.code === 'ArrowUp' || key === 'w' || key === 'W') {
          e.preventDefault();
          this.handleJumpInput();
        } else if (e.code === 'ArrowDown' || key === 's' || key === 'S') {
          e.preventDefault();
          this.handleSlideInput();
        } else if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          this.togglePause();
        } else if (e.code === 'KeyM') {
          this.toggleSound();
        } else if (e.code === 'KeyR' && this.state === 'GAMEOVER') {
          this.restartGame();
        }
      });

      // Canvas click to jump / slide (top 60% jump, bottom 40% slide)
      this.canvas.addEventListener('pointerdown', (e) => {
        if (this.state === 'RUNNING') {
          const rect = this.canvas.getBoundingClientRect();
          const relativeY = (e.clientY - rect.top) / rect.height;
          if (relativeY > 0.6) this.handleSlideInput();
          else this.handleJumpInput();
        } else if (this.state === 'START') {
          this.startGame();
        } else if (this.state === 'GAMEOVER') {
          this.restartGame();
        }
      });

      // UI Buttons
      this.dom.startBtn.addEventListener('click', () => this.startGame());
      this.dom.restartBtn.addEventListener('click', () => this.restartGame());
      this.dom.resumeBtn.addEventListener('click', () => this.togglePause());
      this.dom.pauseBtn.addEventListener('click', () => this.togglePause());
      this.dom.soundBtn.addEventListener('click', () => this.toggleSound());

      // Touch Buttons
      this.dom.touchJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleJumpInput();
      });
      this.dom.touchSlide.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleSlideInput();
      });

      // Visibility change handling
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'RUNNING') {
          this.togglePause();
        }
      });
    }

    toggleSound() {
      this.synth.init();
      const isMuted = this.synth.toggleMute();
      this.dom.soundIcon.textContent = isMuted ? '🔇' : '🔊';
      this.synth.playClick();
    }

    togglePause() {
      if (this.state === 'RUNNING') {
        this.state = 'PAUSED';
        this.synth.stopBgm();
        this.dom.pauseIcon.textContent = '▶';
        this.dom.pauseScreen.classList.add('active');
      } else if (this.state === 'PAUSED') {
        this.state = 'RUNNING';
        this.lastTime = performance.now();
        this.synth.startBgm();
        this.dom.pauseIcon.textContent = '⏸';
        this.dom.pauseScreen.classList.remove('active');
      }
    }

    handleJumpInput() {
      this.synth.init();
      if (this.state === 'START') this.startGame();
      else if (this.state === 'RUNNING') this.runner.jump(this.synth, this.particles);
      else if (this.state === 'GAMEOVER') this.restartGame();
    }

    handleSlideInput() {
      this.synth.init();
      if (this.state === 'RUNNING') {
        if (!this.runner.isGrounded) this.runner.fastDrop(this.synth, this.particles);
        else this.runner.slide(this.synth, this.particles);
      }
    }

    spawnFloatingText(text, x, y, className) {
      if (!this.dom.notifications) return;
      const el = document.createElement('div');
      el.className = `floating-text ${className}`;
      el.textContent = text;

      // Map from virtual coordinates to container percentage
      const leftPct = (x / this.V_WIDTH) * 100;
      const topPct = (y / this.V_HEIGHT) * 100;
      el.style.left = `${leftPct}%`;
      el.style.top = `${topPct}%`;

      this.dom.notifications.appendChild(el);
      setTimeout(() => el.remove(), 900);
    }

    startGame() {
      this.synth.init();
      this.synth.playClick();
      this.synth.startBgm();

      this.state = 'RUNNING';
      this.dom.startScreen.classList.remove('active');
      this.dom.gameOverScreen.classList.remove('active');
      this.dom.pauseScreen.classList.remove('active');

      this.resetStats();
    }

    restartGame() {
      this.synth.init();
      this.synth.playClick();
      this.synth.startBgm();

      this.state = 'RUNNING';
      this.dom.gameOverScreen.classList.remove('active');
      this.dom.pauseScreen.classList.remove('active');

      this.resetStats();
      this.runner.reset();
      this.obstacles.reset();
      this.chipsManager.reset();
      this.particles.clear();
      if (this.dom.notifications) this.dom.notifications.innerHTML = '';
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

      const isNewRecord = this.score > this.highScore;
      if (isNewRecord) {
        this.highScore = Math.floor(this.score);
        localStorage.setItem('cyber_runner_hi_score', this.highScore.toString());
        this.dom.newHighBadge.classList.remove('hidden');
      } else {
        this.dom.newHighBadge.classList.add('hidden');
      }

      this.dom.finalScore.textContent = Math.floor(this.score).toLocaleString();
      this.dom.finalDistance.textContent = `${Math.floor(this.distance)} m`;
      this.dom.finalChips.textContent = this.chipsCollected;
      this.dom.finalHighscore.textContent = this.highScore.toLocaleString();

      this.updateHighscoreUI();
      setTimeout(() => this.dom.gameOverScreen.classList.add('active'), 450);
    }

    updateHighscoreUI() {
      this.dom.high.textContent = `HI: ${this.highScore.toString().padStart(6, '0')}`;
    }

    updateHud() {
      this.dom.score.textContent = Math.floor(this.score).toString().padStart(6, '0');
      this.dom.dist.textContent = `${Math.floor(this.distance)} m`;
      this.dom.speed.textContent = `${(this.gameSpeed / this.baseSpeed).toFixed(1)}x`;
      this.dom.chips.textContent = `⬡ ${this.chipsCollected.toString().padStart(2, '0')}`;
    }

    gameLoop(currentTime) {
      if (!this.lastTime) this.lastTime = currentTime;
      let dt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      if (dt > 0.1) dt = 0.1;

      if (this.state !== 'PAUSED') {
        this.update(dt);
      }
      this.render();

      requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
      if (this.state === 'RUNNING') {
        this.gameSpeed = Math.min(840, this.baseSpeed + this.distance * 0.18);
        const distDelta = (this.gameSpeed * dt) * 0.15;
        this.distance += distDelta;
        this.score += distDelta * 8;

        this.city.update(dt, this.gameSpeed);
        this.runner.update(dt, this.synth, this.particles);
        this.obstacles.update(dt, this.gameSpeed);
        this.chipsManager.update(dt, this.gameSpeed);

        // Chip Collection
        const chipHit = this.chipsManager.checkCollection(this.runner.getHitbox(), this.synth, this.particles);
        if (chipHit.count > 0) {
          this.chipsCollected += chipHit.count;
          const points = chipHit.count * 150;
          this.score += points;
          if (chipHit.pos) {
            this.spawnFloatingText(`+${points}`, chipHit.pos.x, chipHit.pos.y - 10, 'floating-chip');
          }
        }

        // Near-Miss Reward Check
        const nearMiss = this.obstacles.checkNearMiss(this.runner.getHitbox());
        if (nearMiss) {
          this.score += 50;
          this.synth.playNearMiss();
          this.spawnFloatingText('CLOSE CALL +50', nearMiss.x, nearMiss.y - 20, 'floating-nearmiss');
        }

        // Collision Check
        if (this.obstacles.getCollisions(this.runner.getHitbox())) {
          this.triggerGameOver();
        }

        this.updateHud();
      } else {
        this.city.update(dt, 80);
      }

      this.particles.update(dt);
      if (this.screenShakeTime > 0) this.screenShakeTime -= dt;
    }

    render() {
      const ctx = this.ctx;
      ctx.save();
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Scale to virtual resolution (1280x720)
      ctx.scale(this.canvas.width / this.V_WIDTH, this.canvas.height / this.V_HEIGHT);

      if (this.screenShakeTime > 0) {
        const mag = this.screenShakeTime * 18;
        ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
      }

      this.city.draw(ctx);
      this.chipsManager.draw(ctx);
      this.obstacles.draw(ctx);

      if (this.state !== 'GAMEOVER' || this.screenShakeTime <= 0.3) {
        this.runner.draw(ctx);
      }

      this.particles.draw(ctx);
      ctx.restore();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new CyberRunnerGame();
  });
})();
