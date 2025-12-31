
import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Player, Enemy, Bullet, Particle, PowerUp } from '../types';
import { audio } from '../services/audio';

interface GameProps {
  gameState: GameState;
  onGameOver: (score: number) => void;
  onLevelUp: (level: number) => void;
  onScoreUpdate: (score: number) => void;
}

const Game: React.FC<GameProps> = ({ gameState, onGameOver, onLevelUp, onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  
  const playerRef = useRef<Player>({
    x: 0, y: 0, width: 30, height: 30, color: '#38bdf8', health: 100, score: 0, lastShot: 0, powerUp: null, powerUpTimer: 0
  });
  const enemiesRef = useRef<Enemy[]>([]);
  const bossRef = useRef<Enemy | null>(null);
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<Bullet[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const levelRef = useRef(1);
  const mousePos = useRef({ x: 0, y: 0 });
  const shakeRef = useRef(0);

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const startX = canvas.width / 2;
    const startY = canvas.height - 80;

    playerRef.current = {
      x: startX,
      y: startY,
      width: 40,
      height: 40,
      color: '#38bdf8',
      health: 100,
      score: 0,
      lastShot: 0,
      powerUp: null,
      powerUpTimer: 0
    };
    enemiesRef.current = [];
    bossRef.current = null;
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    levelRef.current = 1;
    shakeRef.current = 0;
    mousePos.current = { x: startX, y: startY };
  }, []);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      initGame();
    }
  }, [gameState, initGame]);

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, 
        width: Math.random() * 3 + 1, 
        height: Math.random() * 3 + 1, 
        color,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 0,
        maxLife: 20 + Math.random() * 30
      });
    }
  };

  const spawnPowerUp = (x: number, y: number) => {
    const type = Math.random() > 0.5 ? 'triple' : 'shield';
    powerUpsRef.current.push({
      x, y, width: 30, height: 30, color: type === 'triple' ? '#fbbf24' : '#a855f7',
      type, speed: 2.5
    });
  };

  const spawnBoss = (canvasWidth: number) => {
    const size = 140;
    const hp = levelRef.current * 200;
    bossRef.current = {
      x: canvasWidth / 2 - size / 2,
      y: -size,
      width: size,
      height: size,
      color: '#f472b6',
      type: 'boss',
      health: hp,
      maxHealth: hp,
      speed: 1.2,
      lastShot: 0,
      state: 0 
    };
    shakeRef.current = 25;
  };

  const spawnEnemy = (canvasWidth: number) => {
    if (bossRef.current) return;
    const typeRoll = Math.random();
    let type: Enemy['type'] = 'basic';
    let color = '#f87171';
    let health = 1 + Math.floor(levelRef.current / 2);
    let speed = 2.5 + Math.random() * 2;
    let size = 35;

    if (typeRoll > 0.88) {
      type = 'heavy';
      color = '#ef4444';
      health *= 5;
      speed *= 0.4;
      size = 55;
    } else if (typeRoll > 0.75) {
      type = 'fast';
      color = '#fbbf24';
      health *= 0.6;
      speed *= 1.8;
      size = 28;
    }

    enemiesRef.current.push({
      x: Math.random() * (canvasWidth - size),
      y: -size,
      width: size,
      height: size,
      color,
      type,
      health,
      maxHealth: health,
      speed
    });
  };

  const update = (canvas: HTMLCanvasElement, time: number) => {
    if (gameState !== GameState.PLAYING) return;

    if (shakeRef.current > 0.1) shakeRef.current *= 0.85; else shakeRef.current = 0;

    const dx = (mousePos.current.x - playerRef.current.x - playerRef.current.width/2) * 0.18;
    const dy = (mousePos.current.y - playerRef.current.y - playerRef.current.height/2) * 0.18;
    playerRef.current.x += dx;
    playerRef.current.y += dy;

    if (playerRef.current.powerUpTimer > 0) {
      playerRef.current.powerUpTimer -= 16;
      if (playerRef.current.powerUpTimer <= 0) {
        playerRef.current.powerUp = null;
      }
    }

    const fireRate = playerRef.current.powerUp === 'triple' ? 110 : 170;
    if (time - playerRef.current.lastShot > fireRate) {
      if (playerRef.current.powerUp === 'triple') {
        const angles = [-0.2, 0, 0.2];
        angles.forEach(angle => {
          bulletsRef.current.push({
            x: playerRef.current.x + playerRef.current.width / 2 - 2,
            y: playerRef.current.y,
            width: 5, height: 18, color: '#fbbf24', speed: 14, damage: 1,
            vx: Math.sin(angle) * 14, vy: -Math.cos(angle) * 14
          });
        });
      } else {
        bulletsRef.current.push({
          x: playerRef.current.x + playerRef.current.width / 2 - 2,
          y: playerRef.current.y,
          width: 5, height: 18, color: '#7dd3fc', speed: 14, damage: 1
        });
      }
      playerRef.current.lastShot = time;
      audio.playShoot();
    }

    bulletsRef.current.forEach((b, i) => {
      if (b.vx !== undefined && b.vy !== undefined) {
        b.x += b.vx;
        b.y += b.vy;
      } else {
        b.y -= b.speed;
      }
      if (b.y < -30 || b.x < -30 || b.x > canvas.width + 30) bulletsRef.current.splice(i, 1);
    });

    enemyBulletsRef.current.forEach((b, i) => {
      if (b.vx !== undefined && b.vy !== undefined) {
        b.x += b.vx;
        b.y += b.vy;
      } else {
        b.y += b.speed;
      }

      const hitX = b.x < playerRef.current.x + playerRef.current.width && b.x + b.width > playerRef.current.x;
      const hitY = b.y < playerRef.current.y + playerRef.current.height && b.y + b.height > playerRef.current.y;

      if (hitX && hitY) {
        if (playerRef.current.powerUp !== 'shield') {
          playerRef.current.health -= 12;
          shakeRef.current = 10;
          audio.playDamage();
        } else {
          createParticles(b.x, b.y, '#a855f7', 4);
        }
        enemyBulletsRef.current.splice(i, 1);
        createParticles(b.x, b.y, b.color, 6);
        if (playerRef.current.health <= 0) onGameOver(playerRef.current.score);
      }

      if (b.y > canvas.height + 50 || b.y < -100 || b.x < -100 || b.x > canvas.width + 100) {
        enemyBulletsRef.current.splice(i, 1);
      }
    });

    powerUpsRef.current.forEach((p, i) => {
      p.y += p.speed;
      if (p.x < playerRef.current.x + playerRef.current.width && p.x + p.width > playerRef.current.x && p.y < playerRef.current.y + playerRef.current.height && p.y + p.height > playerRef.current.y) {
        playerRef.current.powerUp = p.type;
        playerRef.current.powerUpTimer = 10000;
        audio.playPowerUp();
        createParticles(p.x + p.width / 2, p.y + p.height / 2, p.color, 25);
        powerUpsRef.current.splice(i, 1);
      }
      if (p.y > canvas.height) powerUpsRef.current.splice(i, 1);
    });

    if (levelRef.current % 5 === 0 && !bossRef.current) {
      spawnBoss(canvas.width);
    }

    if (bossRef.current) {
      const boss = bossRef.current;
      if (boss.y < 120) boss.y += 1.2;
      else {
        boss.state = (boss.state || 0) + 0.012;
        boss.x = (canvas.width / 2 - boss.width / 2) + Math.sin(boss.state) * (canvas.width / 2.5);
      }

      const attackDelay = Math.max(400, 1600 - (levelRef.current * 120));
      if (time - (boss.lastShot || 0) > attackDelay) {
        boss.lastShot = time;
        audio.playBossShoot();
        const cX = boss.x + boss.width / 2;
        const cY = boss.y + boss.height / 2;

        if (Math.random() > 0.45) {
          for (let i = -4; i <= 4; i++) {
            const angle = Math.PI / 2 + (i * 0.22);
            enemyBulletsRef.current.push({
              x: cX, y: cY, width: 12, height: 12, color: '#f472b6', speed: 4.5, damage: 10,
              vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5
            });
          }
        } else {
          const angle = Math.atan2(playerRef.current.y - cY, playerRef.current.x - cX);
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              if (bossRef.current) {
                enemyBulletsRef.current.push({
                  x: cX, y: cY, width: 14, height: 14, color: '#ec4899', speed: 9, damage: 15,
                  vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9
                });
              }
            }, i * 110);
          }
        }
      }

      bulletsRef.current.forEach((b, bi) => {
        if (b.x < boss.x + boss.width && b.x + b.width > boss.x && b.y < boss.y + boss.height && b.y + b.height > boss.y) {
          boss.health -= b.damage;
          bulletsRef.current.splice(bi, 1);
          createParticles(b.x, b.y, '#f472b6', 4);
          if (boss.health <= 0) {
            playerRef.current.score += 7500;
            onScoreUpdate(playerRef.current.score);
            createParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.color, 150);
            audio.playExplosion(true);
            shakeRef.current = 50;
            bossRef.current = null;
            levelRef.current += 1;
            onLevelUp(levelRef.current);
            audio.playLevelUp();
          }
        }
      });
    }

    if (!bossRef.current && Math.random() < 0.022 + (levelRef.current * 0.006)) {
      spawnEnemy(canvas.width);
    }

    enemiesRef.current.forEach((e, ei) => {
      e.y += e.speed;
      const hitX = e.x < playerRef.current.x + playerRef.current.width && e.x + e.width > playerRef.current.x;
      const hitY = e.y < playerRef.current.y + playerRef.current.height && e.y + e.height > playerRef.current.y;
      
      if (hitX && hitY) {
        if (playerRef.current.powerUp !== 'shield') {
          playerRef.current.health -= 25;
          shakeRef.current = 18;
          audio.playDamage();
        } else {
           playerRef.current.powerUpTimer -= 1500;
        }
        createParticles(e.x + e.width / 2, e.y + e.height / 2, e.color, 20);
        enemiesRef.current.splice(ei, 1);
        if (playerRef.current.health <= 0) onGameOver(playerRef.current.score);
      }

      bulletsRef.current.forEach((b, bi) => {
        if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
          e.health -= b.damage;
          bulletsRef.current.splice(bi, 1);
          if (e.health <= 0) {
            playerRef.current.score += 35 * levelRef.current;
            onScoreUpdate(playerRef.current.score);
            createParticles(e.x + e.width / 2, e.y + e.height / 2, e.color, 30);
            audio.playExplosion(false);
            if (Math.random() < 0.12) spawnPowerUp(e.x, e.y);
            enemiesRef.current.splice(ei, 1);
            
            if (playerRef.current.score >= levelRef.current * 2500) {
              levelRef.current += 1;
              onLevelUp(levelRef.current);
              audio.playLevelUp();
            }
          }
        }
      });
      if (e.y > canvas.height) enemiesRef.current.splice(ei, 1);
    });

    particlesRef.current.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.life > p.maxLife) particlesRef.current.splice(i, 1);
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.save();
    if (shakeRef.current > 0.5) {
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
    }
    ctx.clearRect(-100, -100, canvas.width + 200, canvas.height + 200);

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 70; i++) {
        const x = (Math.sin(i * 123) * 0.5 + 0.5) * canvas.width;
        const y = ((Date.now() * 0.07 + i * 220) % canvas.height);
        const s = (i % 3) + 1;
        ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#334155';
        ctx.fillRect(x, y, s, s);
    }

    if (gameState !== GameState.PLAYING) {
      ctx.restore();
      return;
    }

    powerUpsRef.current.forEach(p => {
      ctx.shadowBlur = 20; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x + p.width/2, p.y + p.height/2, p.width/2, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(p.type === 'triple' ? 'T' : 'S', p.x + p.width/2, p.y + p.height/2 + 5);
      ctx.shadowBlur = 0;
    });

    if (bossRef.current) {
      const b = bossRef.current;
      const cX = b.x + b.width / 2; const cY = b.y + b.height / 2;
      ctx.shadowBlur = 40; ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI * 2) / 10 + (Date.now() * 0.001);
        const r = (b.width / 2) + Math.sin(Date.now() * 0.006 + i) * 15;
        const px = cX + Math.cos(angle) * r; const py = cY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cX, cY, 25 + Math.sin(Date.now() * 0.008) * 10, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      const hpW = canvas.width * 0.75; const hpX = (canvas.width - hpW) / 2;
      ctx.fillStyle = '#1e293b'; ctx.fillRect(hpX, 45, hpW, 14);
      ctx.fillStyle = '#f472b6'; ctx.fillRect(hpX, 45, (b.health / b.maxHealth) * hpW, 14);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(hpX, 45, hpW, 14);
    }

    if (playerRef.current.powerUp === 'shield') {
      ctx.shadowBlur = 25; ctx.shadowColor = '#a855f7';
      ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(playerRef.current.x + playerRef.current.width/2, playerRef.current.y + playerRef.current.height/2, 45, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    ctx.shadowBlur = 25; ctx.shadowColor = playerRef.current.color; ctx.fillStyle = playerRef.current.color;
    ctx.beginPath();
    ctx.moveTo(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y);
    ctx.lineTo(playerRef.current.x, playerRef.current.y + playerRef.current.height);
    ctx.lineTo(playerRef.current.x + playerRef.current.width, playerRef.current.y + playerRef.current.height);
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;

    [...bulletsRef.current, ...enemyBulletsRef.current].forEach(b => {
      ctx.fillStyle = b.color; ctx.shadowBlur = 10; ctx.shadowColor = b.color;
      ctx.fillRect(b.x, b.y, b.width, b.height); ctx.shadowBlur = 0;
    });

    enemiesRef.current.forEach(e => {
      ctx.fillStyle = e.color; ctx.shadowBlur = 15; ctx.shadowColor = e.color;
      if (e.type === 'heavy') {
        ctx.fillRect(e.x, e.y, e.width, e.height);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(e.x + 6, e.y + 6, e.width - 12, e.height - 12);
      } else if (e.type === 'fast') {
        ctx.beginPath(); ctx.moveTo(e.x + e.width / 2, e.y + e.height); ctx.lineTo(e.x, e.y); ctx.lineTo(e.x + e.width, e.y); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(e.x + e.width/2, e.y + e.height/2, e.width/2, 0, Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    });

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = 1 - (p.life / p.maxLife);
      ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.width, p.height); ctx.globalAlpha = 1;
    });

    const bW = 90, bH = 8;
    const bX = playerRef.current.x + playerRef.current.width/2 - bW/2;
    const bY = playerRef.current.y + playerRef.current.height + 18;
    ctx.fillStyle = '#1e293b'; ctx.fillRect(bX, bY, bW, bH);
    ctx.fillStyle = playerRef.current.health > 45 ? '#4ade80' : playerRef.current.health > 20 ? '#fbbf24' : '#f87171';
    ctx.fillRect(bX, bY, (playerRef.current.health / 100) * bW, bH);
    
    ctx.restore();
  };

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    update(canvas, time);
    draw(ctx, canvas);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      mousePos.current = { x, y };
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleMove, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleMove);
      window.removeEventListener('touchmove', handleMove);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 touch-none block" />;
};

export default Game;
