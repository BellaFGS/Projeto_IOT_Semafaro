/**
 * Configuração do Node-RED do Semáforo Inteligente.
 * Rode com `npm start` dentro desta pasta. Editor em http://localhost:1880
 */
const path = require('path');

// Caminhos usados pelos nós (via ${SEMAFORO_DB} e ${SEMAFORO_SCHEMA} no flows.json)
process.env.SEMAFORO_DB = process.env.SEMAFORO_DB || path.resolve(__dirname, '../database/semaforo.db');
process.env.SEMAFORO_SCHEMA = path.resolve(__dirname, '../database/schema.sql');

module.exports = {
  uiPort: Number(process.env.PORT) || 1880,
  userDir: __dirname,
  flowFile: 'flows.json',
  flowFilePretty: true,

  // O fluxo não guarda senhas; não precisa de chave de criptografia.
  credentialSecret: false,

  // O dashboard (Vite, porta 5173) consome a API HTTP deste Node-RED.
  httpNodeCors: {
    origin: '*',
    methods: 'GET,OPTIONS',
  },

  functionGlobalContext: {},
  exportGlobalContextKeys: false,

  logging: {
    console: { level: 'info', metrics: false, audit: false },
  },

  editorTheme: {
    projects: { enabled: false },
    tours: false,
  },

  diagnostics: { enabled: false },
  telemetry: { enabled: false },
};
