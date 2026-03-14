/**
 * scripts/verify_state_spine.ts — Phase 9
 * Verifies URL state helpers, WatchlistService, and filter URL round-trips.
 * Run: npx tsx scripts/verify_state_spine.ts
 */

// ── Minimal localStorage shim ──────────────────────────────────────────────
const _store: Record<string, string> = {};
(global as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => _store[k] ?? null,
    setItem: (k: string, v: string) => { _store[k] = v; },
    removeItem: (k: string) => { delete _store[k]; },
    clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
};

// Dynamic imports after shim is in place
async function run() {
    const { parseGlobalParams, serializeGlobalParams, needsCanonical, applyGlobalParams,
        parseMarketFilters, serializeMarketFilters, applyMarketFilters, DEFAULTS }
        = await import('../services/AppStateService');

    const WL = await import('../services/WatchlistService');

    let pass = 0, fail = 0;
    const ok = (msg: string) => { console.log(`  ✓ ${msg}`); pass++; };
    const fail_ = (msg: string, got?: unknown, exp?: unknown) => {
        console.error(`  ✗ ${msg}${got !== undefined ? ` — got: ${JSON.stringify(got)}, expected: ${JSON.stringify(exp)}` : ''}`);
        fail++;
    };
    const section = (t: string) => console.log(`\n── ${t} ──`);

    // ── 1. parseGlobalParams defaults ─────────────────────────────────
    section('parseGlobalParams — defaults');
    {
        const sp = new URLSearchParams('');
        const p = parseGlobalParams(sp);
        p.fuel === DEFAULTS.fuel ? ok('fuel defaults to e_methanol') : fail_('fuel default', p.fuel, DEFAULTS.fuel);
        p.currency === DEFAULTS.currency ? ok('currency defaults to USD') : fail_('currency default', p.currency, DEFAULTS.currency);
        p.basis === DEFAULTS.basis ? ok('basis defaults to posted') : fail_('basis default', p.basis, DEFAULTS.basis);
    }

    // ── 2. parseGlobalParams valid values ─────────────────────────────
    section('parseGlobalParams — valid values');
    {
        const sp = new URLSearchParams('fuel=e_ammonia&ccy=EUR&basis=dap');
        const p = parseGlobalParams(sp);
        p.fuel === 'e_ammonia' ? ok('fuel=e_ammonia parsed') : fail_('fuel parse', p.fuel, 'e_ammonia');
        p.currency === 'EUR' ? ok('ccy=EUR parsed') : fail_('ccy parse', p.currency, 'EUR');
        p.basis === 'dap' ? ok('basis=dap parsed') : fail_('basis parse', p.basis, 'dap');
    }

    // ── 3. parseGlobalParams invalid values fall back to defaults ─────
    section('parseGlobalParams — invalid values → defaults');
    {
        const sp = new URLSearchParams('fuel=diesel&ccy=GBP&basis=fob');
        const p = parseGlobalParams(sp);
        p.fuel === DEFAULTS.fuel ? ok('invalid fuel → default') : fail_('invalid fuel', p.fuel, DEFAULTS.fuel);
        p.currency === DEFAULTS.currency ? ok('invalid ccy → default') : fail_('invalid ccy', p.currency, DEFAULTS.currency);
        p.basis === DEFAULTS.basis ? ok('invalid basis → default') : fail_('invalid basis', p.basis, DEFAULTS.basis);
    }

    // ── 4. serializeGlobalParams round-trip ───────────────────────────
    section('serializeGlobalParams — round-trip');
    {
        const original = { fuel: 'vlsfo' as const, currency: 'EUR' as const, basis: 'dap' as const };
        const serialised = serializeGlobalParams(original);
        const sp = new URLSearchParams(serialised);
        const parsed = parseGlobalParams(sp);
        parsed.fuel === original.fuel ? ok('fuel round-trip') : fail_('fuel round-trip', parsed.fuel, original.fuel);
        parsed.currency === original.currency ? ok('currency round-trip') : fail_('ccy round-trip', parsed.currency, original.currency);
        parsed.basis === original.basis ? ok('basis round-trip') : fail_('basis round-trip', parsed.basis, original.basis);
    }

    // ── 5. needsCanonical ─────────────────────────────────────────────
    section('needsCanonical');
    {
        needsCanonical(new URLSearchParams('')) ? ok('empty SP needs canonical') : fail_('empty SP should need canonical');
        needsCanonical(new URLSearchParams('fuel=e_methanol&ccy=USD&basis=posted')) === false ? ok('full SP does not need canonical') : fail_('full SP should not need canonical');
        needsCanonical(new URLSearchParams('fuel=e_methanol')) ? ok('partial SP needs canonical') : fail_('partial SP should need canonical');
    }

    // ── 6. applyGlobalParams preserves other keys ─────────────────────
    section('applyGlobalParams — preserves other URL keys');
    {
        const sp = new URLSearchParams('sel=NLRTM&q=available');
        const next = applyGlobalParams(sp, { fuel: 'mgo', currency: 'USD', basis: 'posted' });
        next.get('sel') === 'NLRTM' ? ok('sel key preserved') : fail_('sel preserved', next.get('sel'), 'NLRTM');
        next.get('q') === 'available' ? ok('q key preserved') : fail_('q preserved', next.get('q'), 'available');
        next.get('fuel') === 'mgo' ? ok('fuel written') : fail_('fuel written', next.get('fuel'), 'mgo');
    }

    // ── 7. parseMarketFilters ─────────────────────────────────────────
    section('parseMarketFilters — full round-trip');
    {
        const sp = new URLSearchParams('q=available|conf75&avail=limited|available&region=north_europe,mediterranean&ci=A,B&minSup=3&priceMin=900&priceMax=1100&sort=avgPrice&dir=desc&sel=DEHAM');
        const f = parseMarketFilters(sp);
        f.quickFilter.includes('available') && f.quickFilter.includes('conf75') ? ok('quickFilter parsed') : fail_('quickFilter', f.quickFilter);
        f.avail.includes('limited') && f.avail.includes('available') ? ok('avail parsed') : fail_('avail', f.avail);
        f.region.includes('north_europe') && f.region.includes('mediterranean') ? ok('region parsed') : fail_('region', f.region);
        f.ci.includes('A') && f.ci.includes('B') ? ok('ci parsed') : fail_('ci', f.ci);
        f.minSup === 3 ? ok('minSup parsed') : fail_('minSup', f.minSup, 3);
        f.priceMin === '900' ? ok('priceMin parsed') : fail_('priceMin', f.priceMin, '900');
        f.sort === 'avgPrice' ? ok('sort parsed') : fail_('sort', f.sort, 'avgPrice');
        f.dir === 'desc' ? ok('dir parsed') : fail_('dir', f.dir, 'desc');
        f.sel === 'DEHAM' ? ok('sel parsed') : fail_('sel', f.sel, 'DEHAM');
    }

    // ── 8. WatchlistService basic operations ──────────────────────────
    section('WatchlistService — basic operations');
    {
        // Start fresh
        _store[Object.keys(_store).find(k => k.includes('watchlist')) ?? 'x'] = '';
        localStorage.setItem('aequor_watchlist_v1', '[]');

        WL.isWatched('NLRTM') === false ? ok('NLRTM not watched initially') : fail_('initial state');
        const result = WL.toggleWatchlist('NLRTM');
        result === true ? ok('toggleWatchlist returns true (now watching)') : fail_('toggle return', result, true);
        WL.isWatched('NLRTM') === true ? ok('NLRTM now watched') : fail_('watched after toggle');

        WL.addToWatchlist('BEANR');
        const wl = WL.getWatchlist();
        wl.includes('NLRTM') && wl.includes('BEANR') ? ok('getWatchlist returns both ports') : fail_('getWatchlist', wl);

        const sorted = [...wl].sort();
        JSON.stringify(wl) === JSON.stringify(sorted) ? ok('watchlist sorted alpha') : fail_('sorted', wl, sorted);

        WL.removeFromWatchlist('NLRTM');
        WL.isWatched('NLRTM') === false ? ok('NLRTM removed') : fail_('removed');
        WL.isWatched('BEANR') === true ? ok('BEANR still watched') : fail_('beanr still');
    }

    // ── 9. WatchlistService subscribe/notify ──────────────────────────
    section('WatchlistService — subscribe/notify');
    {
        let notified = 0;
        const unsub = WL.subscribe(() => notified++);
        WL.toggleWatchlist('DEHAM');
        WL.toggleWatchlist('DEHAM');
        unsub();
        WL.toggleWatchlist('SGSIN'); // after unsubscribe — should not increment
        notified === 2 ? ok('subscriber called twice, not after unsubscribe') : fail_('notify count', notified, 2);
    }

    // ── 10. applyMarketFilters preserves global params ─────────────────
    section('applyMarketFilters — preserves global params');
    {
        const sp = new URLSearchParams('fuel=e_ammonia&ccy=EUR&basis=dap');
        const f = { quickFilter: ['available'] as string[], avail: [], region: [], ci: [], minSup: 0, priceMin: '', priceMax: '', sort: 'portName', dir: 'asc' as const, sel: '' };
        const next = applyMarketFilters(sp, f);
        next.get('fuel') === 'e_ammonia' ? ok('fuel preserved after filter apply') : fail_('fuel preserved', next.get('fuel'), 'e_ammonia');
        next.get('q') === 'available' ? ok('q filter written') : fail_('q filter', next.get('q'), 'available');
    }

    // ── Summary ───────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Phase 9 verify: ${pass} passed, ${fail} failed`);
    if (fail > 0) { console.error('FAIL'); process.exit(1); }
    else { console.log('ALL PASS ✓'); }
}

run().catch(e => { console.error(e); process.exit(1); });
