/**
 * The bridge, and the only thing that tells the renderer which host it is in.
 *
 * A page served over the network has no `window.deck` at all, so the renderer
 * asks the host for its capability set instead. Nothing in the renderer tests
 * for Electron, a user agent or `window.require`; each of those is wrong the
 * first time it changes.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { DeckState } from './shared/types.js';
import type { DeckAction } from './shared/store-state.js';

const api = {
  capabilities: (): Promise<unknown> => ipcRenderer.invoke('deck:capabilities'),

  workspaces: {
    list: (): Promise<unknown> => ipcRenderer.invoke('deck:workspaces:list'),
    add: (): Promise<unknown> => ipcRenderer.invoke('deck:workspaces:add'),
    remove: (id: string): Promise<unknown> => ipcRenderer.invoke('deck:workspaces:remove', id),
    open: (id: string): Promise<unknown> => ipcRenderer.invoke('deck:workspaces:open', id),
  },

  state: {
    get: (): Promise<DeckState> => ipcRenderer.invoke('deck:state:get') as Promise<DeckState>,
    dispatch: (action: DeckAction): Promise<DeckState> =>
      ipcRenderer.invoke('deck:state:dispatch', action) as Promise<DeckState>,
    /** Returns its own unsubscribe, so a window cannot leak a listener. */
    subscribe: (fn: (state: DeckState) => void): (() => void) => {
      const handler = (_event: unknown, state: DeckState): void => fn(state);
      ipcRenderer.on('deck:state', handler);
      void ipcRenderer.invoke('deck:state:resend');
      return () => {
        ipcRenderer.removeListener('deck:state', handler);
      };
    },
  },

  windows: {
    role: (): Promise<unknown> => ipcRenderer.invoke('deck:window:role'),
    openPanel: (address: string): Promise<unknown> => ipcRenderer.invoke('deck:window:open-panel', address),
    /** Every other window and display, for a throw (TASK-0055). */
    list: (): Promise<unknown> => ipcRenderer.invoke('deck:windows:list'),
    /**
     * A note handed to a window, a display or the tablet (FEAT-0023). The
     * request names its act, `move` or `show`, and the answer comes when the
     * destination has said it is showing the note, or when it will not.
     */
    throw: (request: unknown): Promise<unknown> => ipcRenderer.invoke('deck:window:throw', request),
    /** The notes that arrived in THIS window and are waiting to be shown. */
    pendingArrivals: (): Promise<unknown> => ipcRenderer.invoke('deck:handoff:pending'),
    /** Told when a note arrives in this window. Returns its own unsubscribe. */
    onArrival: (fn: (arrival: unknown) => void): (() => void) => {
      const handler = (_event: unknown, arrival: unknown): void => fn(arrival);
      ipcRenderer.on('deck:handoff:arrived', handler);
      return () => {
        ipcRenderer.removeListener('deck:handoff:arrived', handler);
      };
    },
    /** Told when the window a note arrived from has closed, so "send back" has nowhere to go. */
    onSourceClosed: (fn: (gone: unknown) => void): (() => void) => {
      const handler = (_event: unknown, gone: unknown): void => fn(gone);
      ipcRenderer.on('deck:handoff:source-closed', handler);
      return () => {
        ipcRenderer.removeListener('deck:handoff:source-closed', handler);
      };
    },
    /** This window is showing an arrived note, or says why it cannot. */
    acknowledge: (answer: unknown): Promise<unknown> => ipcRenderer.invoke('deck:handoff:ack', answer),
    /** Send an arrived note back to the window it came from. */
    sendBack: (request: unknown): Promise<unknown> => ipcRenderer.invoke('deck:handoff:back', request),
  },

  clipboard: {
    write: (text: string): Promise<unknown> => ipcRenderer.invoke('deck:clipboard:write', text),
    read: (): Promise<unknown> => ipcRenderer.invoke('deck:clipboard:read'),
  },

  /**
   * The one route a change to a note travels.
   *
   * It ends in the MAIN PROCESS making a loopback request to the sidecar,
   * because the sidecar authorises a write by the fact that it came from
   * loopback (ADR-0003). This bridge does not exist on a served page, so a
   * tablet cannot reach any of it — which is why `write` is false there as a
   * statement of fact and not only as a decision.
   */
  write: {
    transition: (request: unknown): Promise<unknown> => ipcRenderer.invoke('deck:write:transition', request),
    tick: (request: unknown): Promise<unknown> => ipcRenderer.invoke('deck:write:tick', request),
  },
};

contextBridge.exposeInMainWorld('deck', api);

export type DeckBridge = typeof api;
