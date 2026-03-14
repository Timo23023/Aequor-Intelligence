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
import EFuelMapPage from '../ui/pages/EFuelMapPage';
import DocsPage from '../ui/pages/DocsPage';
import PortTerminalPage from '../ui/pages/PortTerminalPage';
import CompareTerminalPage from '../ui/pages/CompareTerminalPage';
import TradingChartPage from '../ui/pages/TradingChartPage';
import { AppShell } from '../ui/layout/AppShell';
import '../ui/theme/tokens.css';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppShell />}>
                    <Route index element={<Navigate to="/efuels" replace />} />
                    <Route path="efuels" element={<EFuelMapPage />} />
                    <Route path="market" element={<MarketOverviewPage />} />
                    <Route path="indicators" element={<IndicatorsPage />} />
                    <Route path="docs" element={<DocsPage />} />
                    <Route path="voyage" element={<VoyageCalculatorPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="port/:locode" element={<PortTerminalPage />} />
                    <Route path="compare" element={<CompareTerminalPage />} />
                    <Route path="chart/:instrument" element={<TradingChartPage />} />
                    {/* Intel Map removed — redirect to Port Intelligence Terminal */}
                    <Route path="map" element={<Navigate to="/efuels" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
