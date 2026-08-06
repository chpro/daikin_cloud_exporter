import { DaikinCloudController } from "daikin-controller-cloud";
import { OnectaRateLimitStatus } from "daikin-controller-cloud/dist/onecta/oidc-utils.js";
import { DaikinPrometheusExporter } from './daikin_prometheus_exporter.js';
import { DaikinDataCache } from './daikin_data_cache.js';
import { resolve } from 'node:path';

interface DaikinConfig {
  oidcClientId: string;
  oidcClientSecret: string;
  updateInterval: number; // in secondi
  prometheusPort: number;
  // Path configurations
  certPath: string;
  cacheFilePath: string;
  tokenFilePath: string;
  oidcCallbackServerPort: number;
  oidcCallbackServerExternalAddress?: string;
  enableNodeMetrics?: boolean;
}

export class DaikinMonitoringService {
  private exporter: DaikinPrometheusExporter;
  private config: DaikinConfig;
  private updateTimer?: NodeJS.Timeout;
  private controller: DaikinCloudController;
  private cache: DaikinDataCache;

  constructor(config: DaikinConfig) {
    this.config = config;
    this.exporter = new DaikinPrometheusExporter(config.enableNodeMetrics);
    this.cache = new DaikinDataCache(config.cacheFilePath);

    // Inizializza il controller Daikin usando i path configurabili
    this.controller = new DaikinCloudController({
      oidcClientId: config.oidcClientId,
      oidcClientSecret: config.oidcClientSecret,
      oidcTokenSetFilePath: config.tokenFilePath,
      oidcAuthorizationTimeoutS: 120,
      oidcCallbackServerPort: config.oidcCallbackServerPort,
      ...(config.oidcCallbackServerExternalAddress ? { oidcCallbackServerExternalAddress: config.oidcCallbackServerExternalAddress } : {}),
      certificatePathKey: resolve(config.certPath, 'cert.key'),
      certificatePathCert: resolve(config.certPath, 'cert.pem'),
    });

    // Setup eventi del controller
    this.setupControllerEvents();
  }

  private setupControllerEvents(): void {
    this.controller.on('authorization_request', (url: string) => {
      console.log(`
🔐 Authorization Required!
Please make sure that ${url} is set as "Redirect URL" in your Daikin Developer Portal account for the used Client!
 
Then please open the URL ${url} in your browser and accept the security warning for the self signed certificate (if you open this for the first time).
 
Afterwards you are redirected to Daikin to approve the access and then redirected back.`);
    });

    this.controller.on('rate_limit_status', (rateLimitStatus: OnectaRateLimitStatus) => {
      console.log('🚦 Rate limit status:', rateLimitStatus);
    });
  }

  async start(): Promise<void> {
    try {
      console.log('🏠 Starting Daikin Monitoring Service...');

      // Mostra info sulla cache esistente
      const cacheInfo = await this.cache.getCacheInfo();
      if (cacheInfo.exists) {
        console.log(`💾 Found existing cache: ${cacheInfo.age}s old, ${cacheInfo.valid ? 'valid' : 'stale'}`);
      }

      // Primo aggiornamento dati (che inizializza anche la connessione)
      await this.updateData();

      // Avvia il server Prometheus
      this.exporter.startServer(this.config.prometheusPort);

      // Configura aggiornamenti periodici
      this.scheduleUpdates();

      console.log(`✅ Monitoring service started successfully`);
      console.log(`📊 Prometheus metrics: http://localhost:${this.config.prometheusPort}/metrics`);
      console.log(`🏥 Health check: http://localhost:${this.config.prometheusPort}/health`);

    } catch (error) {
      console.error('❌ Failed to start monitoring service:', error);
      throw error;
    }
  }

  private async updateData(): Promise<void> {
    try {
      console.log('🔄 Checking for data...');

      // Prima prova a caricare i dati dalla cache
      let devices = await this.cache.loadData(this.config.updateInterval);

      if (!devices) {
        // Cache non valida o non presente - fetch dai server Daikin
        console.log('🌐 Fetching fresh data from Daikin Cloud...');
        devices = await this.controller.getCloudDeviceDetails();

        // Salva i dati nella cache
        await this.cache.saveData(devices, this.config.updateInterval);
      }

      // Aggiorna le metriche Prometheus
      this.exporter.updateDevices(devices);

      console.log(`✅ Updated metrics for ${devices.length} devices`);

    } catch (error) {
      console.error('❌ Error updating data:', error);
      throw error;
    }
  }

  private scheduleUpdates(): void {
    console.log(`⏰ Scheduling updates every ${this.config.updateInterval} seconds`);
    this.updateTimer = setInterval(
      () => this.updateData().catch(error => {
        console.error('❌ Scheduled update failed:', error);
      }),
      this.config.updateInterval * 1000
    );
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Daikin Monitoring Service...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.exporter.stopServer();

    console.log('✅ Service stopped');
  }
}
