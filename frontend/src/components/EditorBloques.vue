<template>
  <div class="editor-bloques">
    <div ref="blocklyDiv" class="blockly-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

const props = defineProps<{
  comandos_disponibles: string[];
  lenguaje?: 'python' | 'javascript';
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'code-changed': [code: string];
}>();

const blocklyDiv = ref<HTMLElement | null>(null);
let workspace: Blockly.WorkspaceSvg | null = null;

function triggerResize() {
  if (workspace) Blockly.svgResize(workspace);
}
defineExpose({ triggerResize });

// Helper: define un bloque de instrucción (statement) cuyo generador devuelve un STRING.
// IMPORTANTE: los statement blocks deben devolver un string, NO un array [code, order]
// (eso es solo para value blocks). Devolver array rompe workspaceToCode y la cadena de bloques.
function defineStatementBlock(
  type: string,
  label: string,
  colour: number,
  code: string,
  tooltip: string
) {
  Blockly.Blocks[type] = {
    init() {
      this.appendDummyInput().appendField(label);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(colour);
      this.setTooltip(tooltip);
    },
  };
  javascriptGenerator.forBlock[type] = () => code;
}

function defineCustomBlocks() {
  // --- Movimiento direccional (intuitivo para niños: arriba/abajo/izquierda/derecha) ---
  defineStatementBlock('heroe_mover_arriba', '⬆️ mover Arriba', 120, 'heroe.moverArriba();\n', 'Mueve al héroe una casilla hacia arriba');
  defineStatementBlock('heroe_mover_abajo', '⬇️ mover Abajo', 120, 'heroe.moverAbajo();\n', 'Mueve al héroe una casilla hacia abajo');
  defineStatementBlock('heroe_mover_izquierda', '⬅️ mover Izquierda', 120, 'heroe.moverIzquierda();\n', 'Mueve al héroe una casilla a la izquierda');
  defineStatementBlock('heroe_mover_derecha', '➡️ mover Derecha', 120, 'heroe.moverDerecha();\n', 'Mueve al héroe una casilla a la derecha');

  // --- Movimiento relativo (avanzar + girar) ---
  defineStatementBlock('heroe_avanzar', '🚶 avanzar', 160, 'heroe.avanzar();\n', 'Mueve al héroe un paso hacia donde mira');
  defineStatementBlock('heroe_girar_derecha', '↩ girar Derecha', 210, 'heroe.girarDerecha();\n', 'Gira al héroe 90° a la derecha');
  defineStatementBlock('heroe_girar_izquierda', '↪ girar Izquierda', 210, 'heroe.girarIzquierda();\n', 'Gira al héroe 90° a la izquierda');
  defineStatementBlock('heroe_saltar', '⏫ saltar', 65, 'heroe.saltar();\n', 'El héroe salta');
  defineStatementBlock('heroe_palanca', '🔧 activar Palanca', 330, 'heroe.activarPalanca();\n', 'Activa la palanca cercana');

  // repetir N veces (bucle)
  Blockly.Blocks['heroe_repetir'] = {
    init() {
      this.appendValueInput('VECES').setCheck('Number').appendField('🔁 repetir');
      this.appendDummyInput().appendField('veces');
      this.appendStatementInput('CUERPO').appendField('hacer:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(180);
      this.setTooltip('Repite las acciones un número de veces');
    },
  };
  javascriptGenerator.forBlock['heroe_repetir'] = (block, generator) => {
    const veces = generator.valueToCode(block, 'VECES', Order.ATOMIC) || '0';
    const cuerpo = generator.statementToCode(block, 'CUERPO');
    return `for (let _i = 0; _i < ${veces}; _i++) {\n${cuerpo}}\n`;
  };

  // si (condicional)
  Blockly.Blocks['heroe_si'] = {
    init() {
      this.appendValueInput('CONDICION').setCheck('Boolean').appendField('❓ si');
      this.appendStatementInput('VERDADERO').appendField('hacer:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip('Si la condición es verdadera, hace las acciones');
    },
  };
  javascriptGenerator.forBlock['heroe_si'] = (block, generator) => {
    const cond = generator.valueToCode(block, 'CONDICION', Order.ATOMIC) || 'false';
    const cuerpo = generator.statementToCode(block, 'VERDADERO');
    return `if (${cond}) {\n${cuerpo}}\n`;
  };

  // mientras (bucle while)
  Blockly.Blocks['heroe_mientras'] = {
    init() {
      this.appendValueInput('CONDICION').setCheck('Boolean').appendField('🔄 mientras');
      this.appendStatementInput('CUERPO').appendField('hacer:');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(180);
      this.setTooltip('Repite las acciones MIENTRAS la condición sea verdadera');
    },
  };
  javascriptGenerator.forBlock['heroe_mientras'] = (block, generator) => {
    const cond = generator.valueToCode(block, 'CONDICION', Order.NONE) || 'false';
    const cuerpo = generator.statementToCode(block, 'CUERPO');
    return `while (${cond}) {\n${cuerpo}}\n`;
  };

  // puedeAvanzar (retorna boolean)
  Blockly.Blocks['heroe_puede_avanzar'] = {
    init() {
      this.appendDummyInput().appendField('➡️ puede avanzar?');
      this.setOutput(true, 'Boolean');
      this.setColour(0);
      this.setTooltip('Verdadero si el héroe puede avanzar (no hay pared adelante)');
    },
  };
  javascriptGenerator.forBlock['heroe_puede_avanzar'] = () => ['heroe.puedeAvanzar()', Order.FUNCTION_CALL];

  // detectarObstaculo (retorna boolean)
  Blockly.Blocks['heroe_detectar_obstaculo'] = {
    init() {
      this.appendDummyInput().appendField('🚧 hay obstáculo?');
      this.setOutput(true, 'Boolean');
      this.setColour(0);
      this.setTooltip('Verdadero si hay un obstáculo frente al héroe');
    },
  };
  javascriptGenerator.forBlock['heroe_detectar_obstaculo'] = () =>
    ['heroe.detectarObstaculo()', Order.FUNCTION_CALL];
}

function buildToolbox(): Blockly.utils.toolbox.ToolboxDefinition {
  const available = props.comandos_disponibles;

  const movimientoBlocks = [
    { cmd: 'moverArriba', blockType: 'heroe_mover_arriba' },
    { cmd: 'moverAbajo', blockType: 'heroe_mover_abajo' },
    { cmd: 'moverIzquierda', blockType: 'heroe_mover_izquierda' },
    { cmd: 'moverDerecha', blockType: 'heroe_mover_derecha' },
    { cmd: 'avanzar', blockType: 'heroe_avanzar' },
    { cmd: 'girarDerecha', blockType: 'heroe_girar_derecha' },
    { cmd: 'girarIzquierda', blockType: 'heroe_girar_izquierda' },
    { cmd: 'saltar', blockType: 'heroe_saltar' },
    { cmd: 'activarPalanca', blockType: 'heroe_palanca' },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCategories: any[] = [];

  const moveItems = movimientoBlocks
    .filter((b) => available.includes(b.cmd) || available.length === 0)
    .map((b) => ({ kind: 'block' as const, type: b.blockType }));

  if (moveItems.length > 0) {
    allCategories.push({
      kind: 'category',
      name: 'Movimiento',
      colour: '120',
      contents: moveItems,
    });
  }

  if (available.includes('repetir') || available.includes('mientras') || available.length === 0) {
    const controlBlocks: Array<{ kind: 'block'; type: string }> = [
      { kind: 'block', type: 'heroe_repetir' },
      { kind: 'block', type: 'heroe_si' },
    ];
    if (available.includes('mientras') || available.length === 0) {
      controlBlocks.push({ kind: 'block', type: 'heroe_mientras' });
    }
    allCategories.push({ kind: 'category', name: 'Control', colour: '180', contents: controlBlocks });
  }

  const sensores: Array<{ kind: 'block'; type: string }> = [{ kind: 'block', type: 'heroe_detectar_obstaculo' }];
  if (available.includes('mientras') || available.length === 0) {
    sensores.push({ kind: 'block', type: 'heroe_puede_avanzar' });
  }
  allCategories.push({ kind: 'category', name: 'Sensores', colour: '0', contents: sensores });

  allCategories.push({
    kind: 'category',
    name: 'Números',
    colour: '230',
    contents: [
      { kind: 'block', type: 'math_number' },
      { kind: 'block', type: 'math_arithmetic' },
    ],
  });

  // Categoría dinámica de Variables (Blockly la rellena: crear variable, asignar, leer, +1)
  if (available.includes('variables')) {
    allCategories.push({ kind: 'category', name: 'Variables', colour: '330', custom: 'VARIABLE' });
  }

  // Listas (crear lista y recorrerla con "para cada")
  if (available.includes('listas')) {
    allCategories.push({
      kind: 'category', name: 'Listas', colour: '260',
      contents: [
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'controls_forEach' },
      ],
    });
  }

  // Categoría dinámica de Funciones/Procedimientos (definir y llamar funciones, con parámetros)
  if (available.includes('funciones')) {
    allCategories.push({ kind: 'category', name: 'Funciones', colour: '290', custom: 'PROCEDURE' });
  }

  return { kind: 'categoryToolbox', contents: allCategories };
}

onMounted(() => {
  if (!blocklyDiv.value) return;

  defineCustomBlocks();

  workspace = Blockly.inject(blocklyDiv.value, {
    toolbox: buildToolbox(),
    scrollbars: true,
    trashcan: true,
    zoom: { controls: true, wheel: true, startScale: 0.9 },
    grid: { spacing: 20, length: 3, colour: '#2D3748', snap: true },
    theme: Blockly.Theme.defineTheme('beSmartTheme', {
      name: 'beSmartTheme',
      base: Blockly.Themes.Classic,
      componentStyles: {
        workspaceBackgroundColour: '#1A202C',
        toolboxBackgroundColour: '#2D3748',
        toolboxForegroundColour: '#E2E8F0',
        flyoutBackgroundColour: '#2D3748',
        flyoutForegroundColour: '#E2E8F0',
        scrollbarColour: '#4A5568',
      },
    } as any),
    readOnly: props.readonly,
  });

  workspace.addChangeListener((event: Blockly.Events.Abstract) => {
    if (!workspace) return;
    // Ignorar eventos puramente visuales (scroll, click, viewport) que no cambian el código
    if (event.type === Blockly.Events.VIEWPORT_CHANGE ||
        event.type === Blockly.Events.SELECTED ||
        event.type === Blockly.Events.CLICK ||
        event.type === Blockly.Events.TOOLBOX_ITEM_SELECT ||
        event.type === Blockly.Events.BUBBLE_OPEN) {
      return;
    }
    try {
      const code = javascriptGenerator.workspaceToCode(workspace);
      emit('code-changed', code);
    } catch (err) {
      console.error('Error generando código de bloques:', err);
    }
  });

  // Emitir el código inicial (vacío) para sincronizar el estado
  emit('code-changed', javascriptGenerator.workspaceToCode(workspace));
});

watch(() => props.readonly, (val) => {
  if (workspace) {
    workspace.options.readOnly = val ?? false;
  }
});

onUnmounted(() => {
  workspace?.dispose();
  workspace = null;
});
</script>

<style scoped>
.editor-bloques {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 250px;
}

.blockly-container {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 250px;
}
</style>
