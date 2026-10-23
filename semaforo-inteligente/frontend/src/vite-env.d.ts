/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `websocket` (dados do Node-RED) ou `simulation` (ESP32 fictício no navegador). */
  readonly VITE_DATA_SOURCE?: string;
  /** Endpoint do nó "websocket out" do Node-RED. */
  readonly VITE_NODE_RED_WS_URL?: string;
  /** API HTTP do Node-RED (histórico do banco). */
  readonly VITE_NODE_RED_HTTP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
