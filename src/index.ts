import {DaikinMonitoringService} from './daikin_monitoring_service.js';


// ============================================================================
// Read OIDC client credentials as environment variables.
// ============================================================================

const {OIDC_CLIENT_ID, OIDC_CLIENT_SECRET} = process.env;

// ============================================================================
// Configure the monitoring service
// ============================================================================

const config = {
    oidcClientId: OIDC_CLIENT_ID || '',
    oidcClientSecret: OIDC_CLIENT_SECRET || '',
    updateInterval: parseInt(process.env.UPDATE_INTERVAL || '30'), // 30 seconds by default
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '3001'), // port 3001 by default
    // Path configurations
    certPath: process.env.CERT_PATH || './cert',
    cacheFilePath: process.env.CACHE_FILE_PATH || './daikin-cache.json',
    tokenFilePath: process.env.TOKEN_FILE_PATH || './daikin-controller-cloud-tokenset',
    oidcCallbackServerPort: parseInt(process.env.OIDC_CALLBACK_SERVER_PORT || '59748'),
    oidcCallbackServerExternalAddress: process.env.OIDC_CALLBACK_SERVER_EXTERNAL_ADDRESS || undefined,
    enableNodeMetrics: process.env.ENABLE_NODE_METRICS === 'true',
};

// ============================================================================
// Configuration validation and logging
// ============================================================================

console.log('🔧 Starting Daikin Cloud Exporter...');
console.log('📋 Configuration Summary:');
console.log('├── OIDC Configuration:');
console.log(`│   ├── Client ID: ${config.oidcClientId ? `${config.oidcClientId.substring(0, 8)}***` : '❌ NOT SET'}`);
console.log(`│   ├── Client Secret: ${config.oidcClientSecret ? `${config.oidcClientSecret.substring(0, 8)}***` : '❌ NOT SET'}`);
console.log(`│   └── Callback Port: ${config.oidcCallbackServerPort}`);
if (config.oidcCallbackServerExternalAddress) {
    console.log(`│   └── Callback External Address: ${config.oidcCallbackServerExternalAddress}`);
}
console.log('├── Monitoring Configuration:');
console.log(`│   ├── Update Interval: ${config.updateInterval}s (${Math.round(config.updateInterval/60)}min)`);
console.log(`│   ├── Prometheus Port: ${config.prometheusPort}`);
console.log(`│   └── Node.js Default Metrics: ${config.enableNodeMetrics ? 'ENABLED' : 'DISABLED'}`);
console.log('├── File Paths:');
console.log(`│   ├── Certificates: ${config.certPath}`);
console.log(`│   ├── Cache File: ${config.cacheFilePath}`);
console.log(`│   └── Token File: ${config.tokenFilePath}`);
console.log('└── Rate Limiting:');
const dailyCalls = Math.floor(24 * 60 * 60 / config.updateInterval);
const remainingCalls = Math.max(0, 200 - dailyCalls);
console.log(`    ├── Expected daily calls: ~${dailyCalls}`);
console.log(`    └── API calls reserved: ${remainingCalls} (for testing/manual ops)`);

// Validation warnings
if (config.updateInterval < 300) {
    console.warn('⚠️  Warning: Update interval < 5min may exceed daily API limits');
}
if (dailyCalls > 180) {
    console.warn('⚠️  Warning: Current interval may exceed recommended daily usage');
}

console.log('');

// ============================================================================
// Validate required configuration
// ============================================================================

if (!OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET) {
    console.error('❌ Please set the OIDC_CLIENT_ID and OIDC_CLIENT_SECRET environment variables');
    process.exit(1);
}

// ============================================================================
// Start the monitoring service
// ============================================================================

async function main() {
    const service = new DaikinMonitoringService(config);

    // Graceful shutdown handler
    const shutdownHandler = async (signal: string) => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        try {
            await service.stop();
            console.log('✅ Service stopped successfully');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    try {
        await service.start();
    } catch (error) {
        console.error('💥 Service failed to start:', error);
        process.exit(1);
    }
}

// Start the application
main().catch(error => {
    console.error('💥 Unhandled error in main:', error);
    process.exit(1);
});
