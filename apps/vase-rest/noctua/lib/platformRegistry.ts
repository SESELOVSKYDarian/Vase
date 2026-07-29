import { PedidosYaAdapter } from '@/services/adapters/pedidosya.adapter';
import { RappiAdapter } from '@/services/adapters/rappi.adapter';
import { GlovoAdapter } from '@/services/adapters/glovo.adapter';
import { UberEatsAdapter } from '@/services/adapters/ubereats.adapter';
import type { IPlatformAdapter } from '@/services/platformAdapter.interface';
import type { PlatformId } from '@/types';

const registry = new Map<PlatformId, IPlatformAdapter>([
  ['pedidosya', new PedidosYaAdapter()],
  ['rappi', new RappiAdapter()],
  ['glovo', new GlovoAdapter()],
  ['ubereats', new UberEatsAdapter()],
]);

export const platformRegistry = registry;
