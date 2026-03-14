
import { useState, useEffect } from 'react';
import type { Visibility } from '../../domain/constants';

const STORAGE_KEY = 'workspace_mode';

type Mode = 'public' | 'private';

// ... (existing helper code)

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
        visibility: mode === 'public' ? 'public' as Visibility : 'private' as Visibility,
        toggleMode: () => setMode(mode === 'public' ? 'private' : 'public'),
        setPublic: () => setMode('public'),
        setPrivate: () => setMode('private')
    };
};
