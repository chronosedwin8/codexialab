export enum BandaEdad {
  Exploradores = 'exploradores',
  Aventureros = 'aventureros',
  Heroes = 'heroes',
}

export enum ModalidadCodigo {
  Bloques = 'bloques',
  BloquesTexto = 'bloques_texto',
  Texto = 'texto',
}

export interface AvatarConfig {
  color: string;
  sombrero: string | null;
  accesorio: string | null;
}

export interface TilePosition {
  x: number;
  y: number;
}

export interface Spawn extends TilePosition {
  dir: 'arriba' | 'abajo' | 'izquierda' | 'derecha';
}

export interface LevelObjective {
  id: string;
  tipo: 'alcanzar_celda' | 'recoger_item' | 'activar_palanca' | 'derrotar_enemigo';
  x: number;
  y: number;
  obligatorio: boolean;
}

export interface StarCriteria {
  objetivos: string[];
  max_bloques?: number;
  max_instrucciones?: number;
  tiempo_max_seg?: number;
}

export interface NivelConfig {
  version: number;
  id: string | number;
  nombre: string;
  mundo_id: number;
  banda_recomendada: BandaEdad;
  modalidades: ModalidadCodigo[];
  tilemap: number[][];
  spawn: Spawn;
  comandos_permitidos: string[];
  bloques_disponibles: string[];
  codigo_inicial: Record<string, string>;
  narracion: {
    intro: string | null;
    exito: string | null;
    url_audio_intro?: string | null;
    url_audio_exito?: string | null;
  };
  objetivos: LevelObjective[];
  criterios_estrella: {
    '1': StarCriteria;
    '2': StarCriteria;
    '3': StarCriteria;
  };
  pistas: Array<{ texto: string; url_audio?: string }>;
  recompensa: { monedas: number; gemas: number };
  tope_ejecucion: number;
}

export type DireccionCmd = 'avanzar' | 'girarDerecha' | 'girarIzquierda' | 'saltar' | 'activarPalanca';

export interface Accion {
  cmd: DireccionCmd | string;
  x?: number;
  y?: number;
  dir?: string;
  exito?: boolean;
  datos?: Record<string, unknown>;
}

export interface WorkerRequest {
  codigo: string;
  lenguaje: 'javascript' | 'python';
  apiPermitida: string[];
  tope_ejecucion: number;
  tilemap?: number[][];
  spawn?: { x: number; y: number; dir: string };
}

export interface WorkerResponse {
  ok: boolean;
  acciones?: Accion[];
  error?: {
    mensaje: string;
    linea?: number;
  };
  accionesParciales?: Accion[];
}

export interface IRenderer {
  loadLevel(config: NivelConfig): void;
  playAction(accion: Accion): Promise<void>;
  reset(): void;
  highlightTarget(id: string): void;
  destroy(): void;
}
