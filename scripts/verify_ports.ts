
import { PortService } from '../services/PortService';
import { DummyAdapter } from '../adapters/dummy/DummyAdapter';

const verifyPorts = async () => {
    console.log("Starting Port Verification...");
    const adapter = new DummyAdapter();
    const service = new PortService(adapter);

    // 1. Search "rot" (should match Rotterdam)
    const res1 = await service.searchPorts('rot');
    console.log(`Search 'rot' found ${res1.length} ports.`);
    if (res1.find(p => p.name === 'Rotterdam')) {
        console.log("  -> PASS: Found Rotterdam");
    } else {
        console.error("  -> FAIL: Rotterdam not found");
    }

    // 2. Search "SGSIN" (code match)
    const res2 = await service.searchPorts('SGSIN');
    if (res2.find(p => p.name === 'Singapore')) {
        console.log("  -> PASS: Found Singapore via code");
    } else {
        console.error("  -> FAIL: Singapore not found via code");
    }
};

verifyPorts();
