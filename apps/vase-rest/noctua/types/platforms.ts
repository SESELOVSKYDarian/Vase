export type PlatformId = 'pedidosya' | 'rappi' | 'glovo' | 'ubereats';

export interface Platform {
  id: PlatformId;
  displayName: string;
  color: string;
  icon: string;
  isConnected: boolean;
  lastSync: Date;
}
