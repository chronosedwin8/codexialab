import Phaser from 'phaser';
import type { IRenderer, NivelConfig, Accion } from './types';

const MAX_TILE = 52;     // tamaño ideal de casilla
const CANVAS_W = 800;
const CANVAS_H = 500;

const HERO_COLORS: Record<string, number> = {
  azul: 0x3B82F6, rojo: 0xEF4444, verde: 0x22C55E, dorado: 0xEAB308,
  morado: 0x8B5CF6, naranja: 0xF97316, rosa: 0xEC4899, cyan: 0x06B6D4,
};

const DIR_DEG: Record<string, number> = {
  derecha: 0, abajo: 90, izquierda: 180, arriba: 270,
};

export class PhaserRenderer implements IRenderer {
  private scene: Phaser.Scene;
  private heroGfx!: Phaser.GameObjects.Graphics;
  private heroDir = 'derecha';
  private heroTile = { x: 0, y: 0 };
  private spawnTile = { x: 0, y: 0 };
  private config!: NivelConfig;
  private heroColor: number;
  private sceneObjects: Phaser.GameObjects.GameObject[] = [];
  private offsetX = 0;
  private offsetY = 0;
  private tile = MAX_TILE;   // tamaño de casilla calculado para que el mapa quepa
  private s = 1;             // factor de escala respecto a MAX_TILE
  private collected = new Set<string>(); // ids de coleccionables ya recogidos en la corrida

  constructor(scene: Phaser.Scene, heroColor?: string) {
    this.scene = scene;
    this.heroColor = HERO_COLORS[heroColor ?? 'azul'] ?? 0x3B82F6;
  }

  private tileToScreen(tx: number, ty: number) {
    return {
      x: this.offsetX + tx * this.tile + this.tile / 2,
      y: this.offsetY + ty * this.tile + this.tile / 2,
    };
  }

  private clearScene() {
    this.sceneObjects.forEach((o) => { try { o.destroy(); } catch (_) { /* ya destruido */ } });
    this.sceneObjects = [];
    if (this.heroGfx) { try { this.heroGfx.destroy(); } catch (_) { /* ya destruido */ } }
  }

  loadLevel(config: NivelConfig): void {
    this.clearScene();
    this.config = config;
    this.collected = new Set();

    const cols = config.tilemap[0]?.length ?? 1;
    const rows = config.tilemap.length;

    // Tamaño de casilla dinámico: el mapa siempre cabe en el canvas (con margen)
    this.tile = Math.min(MAX_TILE, Math.floor((CANVAS_W - 24) / cols), Math.floor((CANVAS_H - 24) / rows));
    this.s = this.tile / MAX_TILE;
    const T = this.tile;

    this.offsetX = Math.floor((CANVAS_W - cols * T) / 2);
    this.offsetY = Math.floor((CANVAS_H - rows * T) / 2);

    // Fondo del grid
    const bg = this.scene.add.rectangle(
      this.offsetX + (cols * T) / 2,
      this.offsetY + (rows * T) / 2,
      cols * T + 12, rows * T + 12,
      0x0F172A
    ).setStrokeStyle(2, 0x334155);
    this.sceneObjects.push(bg);

    // Tiles
    config.tilemap.forEach((row, ty) => {
      row.forEach((cell, tx) => {
        const { x, y } = this.tileToScreen(tx, ty);
        if (cell === 0) {
          const floor = this.scene.add.rectangle(x, y, T - 2, T - 2, 0x1E3A5F).setStrokeStyle(1, 0x2D4A7A);
          this.sceneObjects.push(floor);
        } else {
          const wall = this.scene.add.rectangle(x, y, T - 2, T - 2, 0x374151).setStrokeStyle(1, 0x4B5563);
          const inset = this.scene.add.rectangle(x - 1, y - 1, T - 8, 2, 0x6B7280, 0.5);
          this.sceneObjects.push(wall, inset);
        }
      });
    });

    // Objetivos
    config.objetivos.forEach((obj) => {
      const { x, y } = this.tileToScreen(obj.x, obj.y);
      if (obj.tipo === 'alcanzar_celda' && obj.obligatorio) {
        const goalBg = this.scene.add.rectangle(x, y, T - 2, T - 2, 0x78350F).setStrokeStyle(2, 0xFBBF24);
        const star = this.scene.add.star(x, y - 2 * this.s, 5, 10 * this.s, 20 * this.s, 0xFBBF24)
          .setStrokeStyle(1, 0xF59E0B).setName(`obj_${obj.id}`);
        const lbl = this.scene.add.text(x, y + 18 * this.s, 'META', {
          fontSize: `${Math.max(7, Math.round(8 * this.s))}px`, color: '#FCD34D', fontFamily: 'Nunito', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.sceneObjects.push(goalBg, star, lbl);
        this.scene.tweens.add({ targets: star, scaleX: 1.2, scaleY: 1.2, duration: 800, yoyo: true, repeat: -1 });
      } else {
        const coin = this.scene.add.circle(x, y, 13 * this.s, 0xFCD34D).setStrokeStyle(2, 0xF59E0B).setName(`obj_${obj.id}`);
        this.sceneObjects.push(coin);
      }
    });

    // Héroe
    this.spawnTile = { x: config.spawn.x, y: config.spawn.y };
    this.heroTile = { ...this.spawnTile };
    this.heroDir = config.spawn.dir;
    this.heroGfx = this.scene.add.graphics().setDepth(20);
    this._drawHero();
  }

  private _drawHero() {
    if (!this.heroGfx) return;
    this.heroGfx.clear();
    const s = this.s;
    const { x, y } = this.tileToScreen(this.heroTile.x, this.heroTile.y);
    this.heroGfx.setPosition(x, y);

    // Sombra
    this.heroGfx.fillStyle(0x000000, 0.35);
    this.heroGfx.fillCircle(3 * s, 4 * s, 16 * s);
    // Cuerpo
    this.heroGfx.fillStyle(this.heroColor, 1);
    this.heroGfx.fillCircle(0, 0, 17 * s);
    this.heroGfx.lineStyle(Math.max(2, 3 * s), 0xFFFFFF, 1);
    this.heroGfx.strokeCircle(0, 0, 17 * s);
    // Ojos
    this.heroGfx.fillStyle(0xFFFFFF, 1);
    this.heroGfx.fillCircle(-6 * s, -4 * s, 4 * s);
    this.heroGfx.fillCircle(6 * s, -4 * s, 4 * s);
    this.heroGfx.fillStyle(0x111827, 1);
    this.heroGfx.fillCircle(-5 * s, -3 * s, 2 * s);
    this.heroGfx.fillCircle(7 * s, -3 * s, 2 * s);
    // Indicador de dirección
    const deg = DIR_DEG[this.heroDir] ?? 0;
    const rad = (deg - 90) * Math.PI / 180;
    const tipX = Math.cos(rad) * 22 * s, tipY = Math.sin(rad) * 22 * s;
    const lRad = rad + Math.PI * 0.6, rRad = rad - Math.PI * 0.6;
    this.heroGfx.fillStyle(this.heroColor, 1);
    this.heroGfx.fillTriangle(tipX, tipY, Math.cos(lRad) * 9 * s, Math.sin(lRad) * 9 * s, Math.cos(rRad) * 9 * s, Math.sin(rRad) * 9 * s);
    this.heroGfx.lineStyle(Math.max(1, 2 * s), 0xFFFFFF, 0.8);
    this.heroGfx.strokeTriangle(tipX, tipY, Math.cos(lRad) * 9 * s, Math.sin(lRad) * 9 * s, Math.cos(rRad) * 9 * s, Math.sin(rRad) * 9 * s);
  }

  async playAction(accion: Accion): Promise<void> {
    return new Promise((resolve) => {
      const TURN_RIGHT: Record<string, string> = { derecha: 'abajo', abajo: 'izquierda', izquierda: 'arriba', arriba: 'derecha' };
      const TURN_LEFT: Record<string, string> = { derecha: 'arriba', arriba: 'izquierda', izquierda: 'abajo', abajo: 'derecha' };
      const DELTAS: Record<string, { dx: number; dy: number }> = {
        derecha: { dx: 1, dy: 0 }, izquierda: { dx: -1, dy: 0 }, abajo: { dx: 0, dy: 1 }, arriba: { dx: 0, dy: -1 },
      };
      const MOVE_DIR: Record<string, string> = {
        moverArriba: 'arriba', moverAbajo: 'abajo', moverIzquierda: 'izquierda', moverDerecha: 'derecha',
      };

      if (accion.cmd === 'avanzar' || accion.cmd in MOVE_DIR) {
        if (accion.cmd in MOVE_DIR) { this.heroDir = MOVE_DIR[accion.cmd]; this._drawHero(); }
        const delta = DELTAS[this.heroDir];
        const fromX = this.heroGfx.x, fromY = this.heroGfx.y;
        if (delta) { this.heroTile.x += delta.dx; this.heroTile.y += delta.dy; }
        const { x: toX, y: toY } = this.tileToScreen(this.heroTile.x, this.heroTile.y);

        const trail = this.scene.add.circle(fromX, fromY, 6 * this.s, this.heroColor, 0.3).setDepth(15);
        this.scene.tweens.add({ targets: trail, alpha: 0, scale: 0.3, delay: 300, duration: 250, onComplete: () => trail.destroy() });

        this.scene.tweens.add({
          targets: this.heroGfx, x: toX, y: toY, duration: 260, ease: 'Sine.easeInOut',
          onComplete: () => { this._spawnParticles(toX, toY); this._recogerEnCelda(); resolve(); },
        });
      } else if (accion.cmd === 'girarDerecha') {
        this.heroDir = TURN_RIGHT[this.heroDir] ?? this.heroDir;
        this.scene.tweens.add({ targets: this.heroGfx, scaleX: 0.75, duration: 80, yoyo: true, onComplete: () => { this._drawHero(); resolve(); } });
      } else if (accion.cmd === 'girarIzquierda') {
        this.heroDir = TURN_LEFT[this.heroDir] ?? this.heroDir;
        this.scene.tweens.add({ targets: this.heroGfx, scaleX: 0.75, duration: 80, yoyo: true, onComplete: () => { this._drawHero(); resolve(); } });
      } else if (accion.cmd === 'saltar') {
        this.scene.tweens.add({ targets: this.heroGfx, y: this.heroGfx.y - 30 * this.s, duration: 200, yoyo: true, ease: 'Power2', onComplete: () => resolve() });
      } else if (accion.cmd === 'activarPalanca') {
        this.scene.tweens.add({ targets: this.heroGfx, scaleX: 1.3, scaleY: 1.3, duration: 120, yoyo: true, onComplete: () => { this._spawnParticles(this.heroGfx.x, this.heroGfx.y); resolve(); } });
      } else {
        this.scene.time.delayedCall(80, () => resolve());
      }
    });
  }

  // Anima la recolección de un coleccionable (moneda/gema) cuando el héroe llega a su celda
  private _recogerEnCelda() {
    if (!this.config) return;
    const obj = this.config.objetivos.find(
      (o) => o.tipo === 'recoger_item' && o.x === this.heroTile.x && o.y === this.heroTile.y && !this.collected.has(o.id)
    );
    if (!obj) return;
    this.collected.add(obj.id);
    const coin = this.sceneObjects.find((o) => (o as any).name === `obj_${obj.id}`);
    if (coin) {
      this.scene.tweens.add({
        targets: coin, y: (coin as any).y - 24 * this.s, scaleX: 1.6, scaleY: 1.6, alpha: 0,
        duration: 350, ease: 'Power2', onComplete: () => coin.destroy(),
      });
    }
    this._spawnParticles(this.heroGfx.x, this.heroGfx.y);
  }

  private _spawnParticles(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      const p = this.scene.add.circle(x, y, Phaser.Math.Between(2, 4) * this.s, this.heroColor).setDepth(18);
      const a = (Math.PI * 2 * i) / 5;
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * Phaser.Math.Between(10, 20) * this.s,
        y: y + Math.sin(a) * Phaser.Math.Between(10, 20) * this.s,
        alpha: 0, scale: 0.2, duration: 380, onComplete: () => p.destroy(),
      });
    }
  }

  reset(): void {
    if (!this.config) return;
    // Redibuja todo el nivel: héroe en el spawn y coleccionables restaurados.
    this.scene.tweens.killTweensOf(this.heroGfx);
    this.loadLevel(this.config);
  }

  highlightTarget(id: string): void {
    const target = this.sceneObjects.find((o) => (o as any).name === `obj_${id}`);
    if (target) this.scene.tweens.add({ targets: target, scaleX: 1.5, scaleY: 1.5, duration: 250, yoyo: true });
  }

  destroy(): void {
    this.clearScene();
  }
}
