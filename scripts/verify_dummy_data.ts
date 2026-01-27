import { DummyAdapter } from '../adapters/dummy/DummyAdapter';
import { Visibility } from '../domain/constants';

async function verify() {
    console.log('Starting verification of DummyAdapter...');
    const adapter = new DummyAdapter();

    try {
        // 1. Validate listEvents
        const events = await adapter.listEvents({ limit: 10, visibility: Visibility.Public });
        if (events.length === 0) throw new Error('No events returned');
        console.log(`listEvents returned ${events.length} events.`);

        // 2. Validate getEvent
        const firstId = events[0].id;
        const singleEvent = await adapter.getEvent(firstId);
        if (!singleEvent) throw new Error(`getEvent(${firstId}) returned null`);
        if (singleEvent.id !== firstId) throw new Error('ID mismatch');
        console.log('getEvent validated.');

        // 3. Validate listPorts
        const ports = await adapter.listPorts({});
        if (ports.length < 20) throw new Error('Not enough ports seeded');
        console.log(`listPorts returned ${ports.length} ports.`);

        // 4. Validate listIndicators
        const indicators = await adapter.listIndicators({});
        if (indicators.length < 10) throw new Error('Not enough indicators seeded');
        console.log(`listIndicators returned ${indicators.length} indicators.`);

        console.log('validated: OK');
    } catch (err: any) {
        console.error('Verification Failed:', err.message);
        process.exit(1);
    }
}

verify();
