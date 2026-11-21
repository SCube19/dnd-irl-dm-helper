# Layer orchestrator

Each map system (fog, grid, tokens, HUD) is a layer component rendered inside
`<LayerOrchestrator>`. Layers don't import each other; they share data through:

- **Store**: `useLayerStore(key)`, a `useState`-like slot declared once with
  `defineLayerKey(id, defaultState)`. Any layer may read or write any key.
- **Events**: `useLayerInteraction({ tap, dragEnd, ... })` receives typed input
  from `OrchestratedInteractionConnector` (`LayerEventMap`).
- **Persistence**: `useLayerPersistence(key, { serialize, deserialize, storage? })`
  persists a layer through the orchestrator's `storage` (`LayerStorage`) or a
  per-layer `storage` override (file, IndexedDB, REST API, etc.). Both codecs
  and storage methods may be sync or async. Trigger saves/reloads via
  `useLayerPersistenceControls()` (`saveAll`, `loadAll`).

To add a layer: define its key, write the component using the hooks above,
give it an entry in `../zOrder.ts`, and render it in `MapScreen`.
