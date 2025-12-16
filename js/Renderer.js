export default class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.time = 0;
    this.stars = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.08 + 0.02,
    }));
  }

  clear(width, height, camera) {
    const { ctx } = this;
    this.time += 0.016;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a1c3d');
    gradient.addColorStop(0.5, '#07102a');
    gradient.addColorStop(1, '#02040c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    this._drawStars(width, height, camera);
    this._drawNebula(width, height, camera);
    this._drawMountains(width, height, camera);
  }

  drawPlayer(player, camera) {
    const { ctx } = this;
    const screenPos = camera.worldToScreen(player.x, player.y);
    const centerX = screenPos.x + player.width / 2;
    const feetY = screenPos.y + player.height;
    const facing = player.facing || 1;
    const isAirborne = !player.isOnGround;
    const walkPhase = player.animationTime;
    const bob = player.isOnGround
      ? player.isMoving
        ? Math.sin(walkPhase * 2) * 1.5
        : 0
      : Math.sin(player.floatTime * 2) * 4;
    const armSwing = player.isMoving ? Math.sin(walkPhase * 2) * 12 : 0;
    const legSwing = player.isMoving ? Math.sin(walkPhase * 2) * 10 : 0;
    const floatOffset = isAirborne ? Math.sin(player.floatTime * 2.5) * 3 : 0;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(centerX, feetY + 6, player.width * 0.45, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(centerX, screenPos.y + player.height / 2 + bob - 4);
    ctx.scale(facing, 1);
    if (player.invulnerableTimer > 0) {
      ctx.globalAlpha = 0.6 + Math.sin((player.isMoving ? player.animationTime : player.floatTime) * 12) * 0.2;
    }

    const bodyWidth = 28;
    const bodyHeight = 34;
    const headRadius = 14;

    // Legs
    ctx.strokeStyle = '#07152a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, bodyHeight / 2 - 2);
    ctx.lineTo(-9 + legSwing * 0.4, bodyHeight / 2 + 16 + floatOffset);
    ctx.moveTo(9, bodyHeight / 2 - 2);
    ctx.lineTo(9 - legSwing * 0.4, bodyHeight / 2 + 16 - floatOffset);
    ctx.stroke();

    // Arms
    ctx.strokeStyle = '#0f2342';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-bodyWidth / 2 + 2, -6);
    ctx.lineTo(-bodyWidth / 2 - 8, -6 + armSwing * 0.15);
    ctx.moveTo(bodyWidth / 2 - 2, -6);
    ctx.lineTo(bodyWidth / 2 + 8, -6 - armSwing * 0.15);
    ctx.stroke();

    // Backpack
    ctx.fillStyle = '#142a4f';
    ctx.beginPath();
    this._roundRectPath(-bodyWidth / 2 - 8, -bodyHeight / 2 + 4, 8, bodyHeight - 8, 4);
    ctx.fill();

    // Torso
    const torsoGradient = ctx.createLinearGradient(-bodyWidth / 2, -bodyHeight / 2, bodyWidth / 2, bodyHeight / 2);
    torsoGradient.addColorStop(0, '#7af0ff');
    torsoGradient.addColorStop(0.5, '#4fc3ff');
    torsoGradient.addColorStop(1, '#2d6bff');
    ctx.fillStyle = torsoGradient;
    ctx.strokeStyle = '#0c2d4b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    this._roundRectPath(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(-bodyWidth / 2 + 4, -bodyHeight / 2 + 4, bodyWidth - 8, 8);

    // Head
    ctx.fillStyle = '#0f1930';
    ctx.beginPath();
    ctx.arc(0, -bodyHeight / 2 - headRadius + 6, headRadius, 0, Math.PI * 2);
    ctx.fill();

    const visorGradient = ctx.createLinearGradient(-headRadius, -bodyHeight / 2 - headRadius, headRadius, -bodyHeight / 2);
    visorGradient.addColorStop(0, '#9ff9ff');
    visorGradient.addColorStop(1, '#58c9ff');
    ctx.fillStyle = visorGradient;
    ctx.beginPath();
    ctx.ellipse(4, -bodyHeight / 2 - headRadius + 4, headRadius - 4, headRadius - 8, 0, Math.PI * 0.2, Math.PI * 0.9);
    ctx.lineTo(-6, -bodyHeight / 2 - headRadius + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(2, -bodyHeight / 2 - headRadius + 1, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawPlatforms(platforms, camera) {
    const { ctx } = this;
    const canvasHeight = ctx.canvas.height;
    const groundY = canvasHeight - 24;
    
    // Draw pits (dark areas between ground platforms)
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.5;
    
    // Find ground platforms and draw pits between them
    const groundPlatforms = platforms.filter(p => Math.abs(p.y - groundY) < 1);
    groundPlatforms.sort((a, b) => a.x - b.x);
    
    for (let i = 0; i < groundPlatforms.length - 1; i++) {
      const leftPlatform = groundPlatforms[i];
      const rightPlatform = groundPlatforms[i + 1];
      const gapStart = leftPlatform.x + leftPlatform.width;
      const gapEnd = rightPlatform.x;
      const gapWidth = gapEnd - gapStart;
      
      if (gapWidth > 0) {
        // Convert to screen coordinates
        const screenStart = camera.worldToScreen(gapStart, groundY);
        const screenEnd = camera.worldToScreen(gapEnd, groundY);
        
        // Only draw if visible
        if (screenEnd.x > 0 && screenStart.x < ctx.canvas.width) {
          // Draw pit
          ctx.fillRect(screenStart.x, screenStart.y, screenEnd.x - screenStart.x, canvasHeight - groundY);
          // Add some depth effect
          ctx.globalAlpha = 0.3;
          ctx.fillRect(screenStart.x, screenStart.y + 20, screenEnd.x - screenStart.x, canvasHeight - groundY - 20);
          ctx.globalAlpha = 0.5;
        }
      }
    }
    ctx.restore();
    
    // Draw platforms
    platforms.forEach((platform) => {
      const screenPos = camera.worldToScreen(platform.x, platform.y);
      // Only draw if platform is visible
      if (screenPos.x + platform.width < 0 || screenPos.x > ctx.canvas.width ||
          screenPos.y + platform.height < 0 || screenPos.y > ctx.canvas.height) {
        return;
      }
      ctx.fillStyle = platform.type === 'moving' ? '#c56cf0' : '#1dd1a1';
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      this._roundRectPath(screenPos.x, screenPos.y, platform.width, platform.height, 8);
      ctx.fill();
      ctx.stroke();
    });
  }

  drawCollectibles(items, camera) {
    const { ctx } = this;
    items.forEach((coin) => {
      if (coin.collected) return;
      const screenPos = camera.worldToScreen(coin.x, coin.y);
      // Only draw if visible
      if (screenPos.x < -50 || screenPos.x > ctx.canvas.width + 50 ||
          screenPos.y < -50 || screenPos.y > ctx.canvas.height + 50) {
        return;
      }
      const scale = 1 + Math.sin(coin.pulse) * 0.1;
      const bob = Math.sin(coin.pulse * 0.8) * 6;
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y + bob);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#feca57';
      ctx.strokeStyle = '#f6b93b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius * 1.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawEnemies(enemies, camera) {
    const { ctx } = this;
    enemies.forEach((enemy) => {
      const screenPos = camera.worldToScreen(enemy.x, enemy.y);
      // Only draw if visible
      if (screenPos.x + enemy.width < 0 || screenPos.x > ctx.canvas.width ||
          screenPos.y + enemy.height < 0 || screenPos.y > ctx.canvas.height) {
        return;
      }
      ctx.fillStyle = '#ff6b6b';
      ctx.strokeStyle = '#d63031';
      ctx.lineWidth = 3;
      ctx.beginPath();
      this._roundRectPath(screenPos.x, screenPos.y, enemy.width, enemy.height, 6);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      const eyeY = screenPos.y + enemy.height / 3;
      ctx.arc(screenPos.x + enemy.width / 3, eyeY, 4, 0, Math.PI * 2);
      ctx.arc(screenPos.x + (enemy.width * 2) / 3, eyeY, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawGoal(goal, camera) {
    const { ctx } = this;
    const screenPos = camera.worldToScreen(goal.x, goal.y);
    ctx.save();
    ctx.globalAlpha = 0.9;
    const gradient = ctx.createLinearGradient(screenPos.x, screenPos.y, screenPos.x + goal.width, screenPos.y);
    gradient.addColorStop(0, '#55efc4');
    gradient.addColorStop(1, '#81ecec');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    this._roundRectPath(screenPos.x, screenPos.y, goal.width, goal.height, 12);
    ctx.fill();
    ctx.restore();
  }

  drawHealthPickups(pickups, camera) {
    const { ctx } = this;
    pickups.forEach((pickup) => {
      if (pickup.collected) return;
      const screenPos = camera.worldToScreen(pickup.x, pickup.y);
      // Only draw if visible
      if (screenPos.x < -50 || screenPos.x > ctx.canvas.width + 50 ||
          screenPos.y < -50 || screenPos.y > ctx.canvas.height + 50) {
        return;
      }
      const scale = 1 + Math.sin(pickup.pulse) * 0.2;
      const bob = Math.sin(pickup.pulse * 0.8) * 8;
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y + bob);
      ctx.scale(scale, scale);
      
      // Draw health icon (heart/cross)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pickup.radius);
      gradient.addColorStop(0, '#ff6b9d');
      gradient.addColorStop(0.7, '#ff1744');
      gradient.addColorStop(1, '#c2185b');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw cross
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -pickup.radius * 0.6);
      ctx.lineTo(0, pickup.radius * 0.6);
      ctx.moveTo(-pickup.radius * 0.6, 0);
      ctx.lineTo(pickup.radius * 0.6, 0);
      ctx.stroke();
      
      // Glow effect
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ff6b9d';
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawNotes(notes, camera) {
    const { ctx } = this;
    notes.forEach((note) => {
      if (note.collected) return;
      const screenPos = camera.worldToScreen(note.x, note.y);
      // Only draw if visible
      if (screenPos.x < -50 || screenPos.x > ctx.canvas.width + 50 ||
          screenPos.y < -50 || screenPos.y > ctx.canvas.height + 50) {
        return;
      }
      const scale = 1 + Math.sin(note.pulse) * 0.15;
      const bob = Math.sin(note.pulse * 0.7) * 8;
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y + bob);
      ctx.scale(scale, scale);
      
      // Draw note icon (paper/document)
      ctx.fillStyle = '#fff9e6';
      ctx.strokeStyle = '#d4c5a9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-note.radius, -note.radius, note.radius * 2, note.radius * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw text lines
      ctx.fillStyle = '#8b7355';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('...', 0, 2);
      
      // Glow effect
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(0, 0, note.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawNotesOverlay(notes, width, height) {
    if (notes.length === 0) return;
    const { ctx } = this;
    const latestNote = notes[notes.length - 1];
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // Note card
    const cardWidth = Math.min(600, width - 80);
    const cardHeight = 200;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;
    
    ctx.fillStyle = '#fff9e6';
    ctx.strokeStyle = '#d4c5a9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    this._roundRectPath(cardX, cardY, cardWidth, cardHeight, 12);
    ctx.fill();
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#8b7355';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(latestNote.title, width / 2, cardY + 40);
    
    // Text (wrapped)
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    const maxWidth = cardWidth - 40;
    const words = latestNote.text.split(' ');
    let line = '';
    let y = cardY + 80;
    
    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, cardX + 20, y);
        line = word + ' ';
        y += 25;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, cardX + 20, y);
    
    // Close hint
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#999';
    ctx.fillText('Нажмите любую клавишу, чтобы закрыть', width / 2, cardY + cardHeight - 20);
    
    ctx.restore();
  }

  drawHUDOverlay({ status, width, height }) {
    if (!status) return;
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    
    // Story card
    const cardWidth = Math.min(700, width - 80);
    const cardHeight = 180;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;
    
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#64d9ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    this._roundRectPath(cardX, cardY, cardWidth, cardHeight, 12);
    ctx.fill();
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#64d9ff';
    ctx.font = 'bold 28px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(status.title, width / 2, cardY + 45);
    
    // Subtitle (wrapped)
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Segoe UI';
    ctx.textAlign = 'left';
    const maxWidth = cardWidth - 40;
    const words = status.subtitle.split(' ');
    let line = '';
    let y = cardY + 85;
    
    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, cardX + 20, y);
        line = word + ' ';
        y += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, cardX + 20, y);
    
    ctx.restore();
  }

  _drawStars(width, height, camera) {
    const { ctx, stars, time } = this;
    ctx.save();
    stars.forEach((star) => {
      const twinkle = (Math.sin(time * star.speed * 8 + star.x * 10) + 1) / 2;
      const size = star.size * (0.5 + twinkle * 0.6);
      const x = (star.x + time * star.speed * 0.01) % 1;
      const y = (star.y + time * star.speed * 0.02) % 1;
      ctx.globalAlpha = 0.5 + twinkle * 0.5;
      ctx.fillStyle = '#9ed9ff';
      ctx.beginPath();
      ctx.arc(x * width, y * height, size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  _drawNebula(width, height, camera) {
    const { ctx, time } = this;
    ctx.save();
    ctx.globalAlpha = 0.2;
    const nebulaX = (camera ? camera.x * 0.1 : 0) + width * 0.7;
    const gradient = ctx.createRadialGradient(
      nebulaX,
      height * 0.2,
      40 + Math.sin(time * 0.4) * 20,
      nebulaX - width * 0.1,
      height * 0.4,
      width * 0.6,
    );
    gradient.addColorStop(0, '#ff8efb');
    gradient.addColorStop(0.4, 'rgba(255, 142, 251, 0.4)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  _drawMountains(width, height, camera) {
    const { ctx, time } = this;
    const baseY = height * 0.8;
    const offsetX = camera ? camera.x * 0.3 : 0;
    ctx.save();
    ctx.fillStyle = '#09142d';
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = -offsetX % 120; x <= width + 120; x += 120) {
      ctx.lineTo(x + 60, baseY - 120);
      ctx.lineTo(x + 120, baseY);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0b1f46';
    ctx.beginPath();
    ctx.moveTo(0, baseY + 40);
    for (let x = -80 - (offsetX % 160); x <= width + 80; x += 160) {
      const peakHeight = 80 + Math.sin(time * 0.5 + (x + offsetX) * 0.01) * 25;
      ctx.lineTo(x + 80, baseY - peakHeight);
      ctx.lineTo(x + 160, baseY + 40);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _roundRectPath(x, y, width, height, radius) {
    const { ctx } = this;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

