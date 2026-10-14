export type LightState = 'RED' | 'YELLOW' | 'GREEN';

export interface TrafficData {
  lightState: LightState;
  remainingTime: number; // segundos no estado atual
  vehicleDetected: boolean;
  vehicleCount: number;
  ultrasonicDistanceCm: number; // Leitura do HC-SR04
  pedestrianRequested: boolean; // Leitura do botao
  servoAngle: number; // 0 (fechada) a 90 (aberta)
  mode: 'AUTOMATICO' | 'PEDESTRE' | 'ATENCAO';
  alert: string | null;
}
