import type { Connector } from '@/types/chat';

/**
 * Composio is the single external connector runtime.
 *
 * Individual apps must NOT be hardcoded here. Composio discovers the user's
 * connected toolkits and tools dynamically at runtime.
 */
export const NATIVE_CONNECTORS: Connector[] = [];

export function cloneNativeConnectors(): Connector[] {
  return [];
}
