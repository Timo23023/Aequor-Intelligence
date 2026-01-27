
import { useState, useEffect } from 'react';
import { Visibility } from '../../domain/constants';

const STORAGE_KEY = 'workspace_mode';

type Mode = 'public' | 'private';

// Simple implementation using a custom event for cross-component sync if needed, 
// or just a simple hook that initializes from persistent storage.
// For this app, components that care about mode will just read it or listen to it.
// To avoid global state complexity, we'll let AppShell drive the mode and pass it down via context?
// No, constraints say "accessible via hook", "no global state libraries".
// We can use a simple event bus pattern for the hook.

const listeners = new Set<(mode: Mode) => void>();

let currentMode: Mode = (localStorage.getItem(STORAGE_KEY) as Mode) || 'public';

const setMode = (mode: Mode) => {
    currentMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    listeners.forEach(l => l(mode));
};

export const useWorkspaceMode = () => {
    const [mode, setLocalMode] = useState<Mode>(currentMode);

    useEffect(() => {
        const handler = (m: Mode) => setLocalMode(m);
        listeners.add(handler);
        return () => { listeners.delete(handler); };
    }, []);

    return {
        mode,
        visibility: mode === 'public' ? Visibility.Public : Visibility.Private,
        toggleMode: () => setMode(mode === 'public' ? 'private' : 'public'),
        setPublic: () => setMode('public'),
        setPrivate: () => setMode('private')
    };
};
