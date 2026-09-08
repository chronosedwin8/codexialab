<template>
  <div class="editor-texto" ref="editorContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as monaco from 'monaco-editor';

const props = defineProps<{
  lenguaje: 'python' | 'javascript';
  codigo_inicial?: string;
  readonly?: boolean;
  comandos_hint?: string[];
}>();

const emit = defineEmits<{
  'code-changed': [code: string];
}>();

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

onMounted(() => {
  if (!editorContainer.value) return;

  // Tema personalizado Codexia
  monaco.editor.defineTheme('beSmartDark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C084FC' },
      { token: 'string', foreground: '86EFAC' },
      { token: 'number', foreground: 'FCD34D' },
    ],
    colors: {
      'editor.background': '#0F172A',
      'editor.foreground': '#E2E8F0',
      'editorLineNumber.foreground': '#4B5563',
      'editorCursor.foreground': '#8B5CF6',
      'editor.selectionBackground': '#4C1D9540',
      'editor.lineHighlightBackground': '#1E293B',
    },
  });

  // Autocompletado de métodos de heroe
  if (props.comandos_hint && props.comandos_hint.length > 0) {
    monaco.languages.registerCompletionItemProvider(props.lenguaje, {
      provideCompletionItems: (model, position) => {
        const wordInfo = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        };

        const suggestions: monaco.languages.CompletionItem[] = (props.comandos_hint ?? []).map((cmd) => ({
          label: `heroe.${cmd}()`,
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: `heroe.${cmd}()`,
          range,
          detail: `Comando del héroe: ${cmd}`,
        }));

        return { suggestions };
      },
    });
  }

  editor = monaco.editor.create(editorContainer.value, {
    value: props.codigo_inicial ?? '// Escribe tu código aquí\n',
    language: props.lenguaje,
    theme: 'beSmartDark',
    readOnly: props.readonly,
    fontSize: 14,
    fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: false },
    automaticLayout: true,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 12 },
    suggest: { showKeywords: true },
    tabSize: 2,
    renderLineHighlight: 'gutter',
  });

  editor.onDidChangeModelContent(() => {
    // En modo readonly (Mixto), Monaco solo muestra el código de Blockly — no emite
    if (!props.readonly) {
      emit('code-changed', editor?.getValue() ?? '');
    }
  });
});

watch(() => props.readonly, (val) => {
  editor?.updateOptions({ readOnly: val });
});

watch(() => props.codigo_inicial, (val) => {
  if (editor && val && editor.getValue() !== val) {
    editor.setValue(val);
  }
});

onUnmounted(() => {
  editor?.dispose();
  editor = null;
});
</script>

<style scoped>
.editor-texto {
  flex: 1;
  min-height: 250px;
  height: 100%;
}
</style>
