import { Buffer } from 'buffer';
// @ts-ignore
globalThis.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MarketOverviewPage from '../ui/pages/MarketOverviewPage';
import IndicatorsPage from '../ui/pages/IndicatorsPage';
import VoyageCalculatorPage from '../ui/pages/VoyageCalculatorPage';
import AlertsPage from '../ui/pages/AlertsPage';
import DocsPage from '../ui/pages/DocsPage';
import PlaceholderPage from '../ui/pages/PlaceholderPage';
import { AppShell } from '../ui/layout/AppShell';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppShell />}>
                    <Route index element={<Navigate to="/market" replace />} />
                    <Route path="market" element={<MarketOverviewPage />} />
                    <Route path="indicators" element={<IndicatorsPage />} />
                    <Route path="docs" element={<DocsPage />} />
                    <Route path="voyage" element={<VoyageCalculatorPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
