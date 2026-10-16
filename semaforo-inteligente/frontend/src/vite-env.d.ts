/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `simulation` (padrão) ou `websocket`. */
  readonly VITE_DATA_SOURCE?: string;
  /** Endpoint do nó "websocket out" do Node-RED. */
  readonly VITE_NODE_RED_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
