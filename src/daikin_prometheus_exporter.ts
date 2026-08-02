import { register, Gauge, Counter, collectDefaultMetrics } from 'prom-client';
import express from 'express';
import { DaikinDataParser, ParsedDaikinData } from './daikin_data_parser.js';

// Abilita metriche di default di Node.js
collectDefaultMetrics();

export class DaikinPrometheusExporter {
  private app: express.Application;
  private server: any;

  // Metriche Prometheus - inizializzate nel costruttore
  private roomTemperatureGauge!: Gauge<string>;
  private roomHumidityGauge!: Gauge<string>;
  private outdoorTemperatureGauge!: Gauge<string>;
  private targetTemperatureGauge!: Gauge<string>;
  private deviceOnlineGauge!: Gauge<string>;
  private devicePowerGauge!: Gauge<string>;
  private powerfulModeGauge!: Gauge<string>;
  private errorStateGauge!: Gauge<string>;
  private warningStateGauge!: Gauge<string>;
  private consumptionTodayGauge!: Gauge<string>;
  private consumptionWeekGauge!: Gauge<string>;
  private consumptionMonthGauge!: Gauge<string>;
  private consumptionYearGauge!: Gauge<string>;
  private dataUpdateCounter!: Counter<string>;

  constructor() {
    this.app = express();
    this.initializeMetrics();
    this.setupRoutes();
  }

  private initializeMetrics(): void {
    this.roomTemperatureGauge = new Gauge({
      name: 'daikin_room_temperature_celsius',
      help: 'Room temperature in Celsius',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.roomHumidityGauge = new Gauge({
      name: 'daikin_room_humidity_percent',
      help: 'Room humidity in percent',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.outdoorTemperatureGauge = new Gauge({
      name: 'daikin_outdoor_temperature_celsius',
      help: 'Outdoor temperature in Celsius',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.targetTemperatureGauge = new Gauge({
      name: 'daikin_target_temperature_celsius',
      help: 'Target temperature in Celsius',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode']
    });

    this.deviceOnlineGauge = new Gauge({
      name: 'daikin_device_online',
      help: 'Device online status (1 = online, 0 = offline)',
      labelNames: ['device_id', 'device_model']
    });

    this.devicePowerGauge = new Gauge({
      name: 'daikin_device_power_on',
      help: 'Device power status (1 = on, 0 = off)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode']
    });

    this.powerfulModeGauge = new Gauge({
      name: 'daikin_powerful_mode',
      help: 'Powerful mode status (1 = on, 0 = off)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.errorStateGauge = new Gauge({
      name: 'daikin_error_state',
      help: 'Device error state (1 = error, 0 = no error)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.warningStateGauge = new Gauge({
      name: 'daikin_warning_state',
      help: 'Device warning state (1 = warning, 0 = no warning)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionTodayGauge = new Gauge({
      name: 'daikin_consumption_today_kwh',
      help: 'Today energy consumption in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionWeekGauge = new Gauge({
      name: 'daikin_consumption_week_kwh',
      help: 'This week energy consumption in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionMonthGauge = new Gauge({
      name: 'daikin_consumption_month_kwh',
      help: 'This month energy consumption in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionYearGauge = new Gauge({
      name: 'daikin_consumption_year_kwh',
      help: 'This year energy consumption in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.dataUpdateCounter = new Counter({
      name: 'daikin_data_updates_total',
      help: 'Total number of data updates from Daikin Cloud',
      labelNames: ['status']
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.end(metrics);
      } catch (error) {
        res.status(500).end(error);
      }
    });
  }

  updateDevices(devices: any[]): void {
    try {
      // Parse dei dati usando il parser separato
      const parsedDevices = DaikinDataParser.parseDevices(devices);

      // Reset delle metriche esistenti
      this.clearMetrics();

      // Aggiorna le metriche per ogni device
      parsedDevices.forEach(device => this.updateDeviceMetrics(device));

      this.dataUpdateCounter.inc({ status: 'success' });
      console.log(`✅ Updated metrics for ${parsedDevices.length} devices`);
    } catch (error) {
      this.dataUpdateCounter.inc({ status: 'error' });
      console.error('❌ Error updating device metrics:', error);
    }
  }

  private updateDeviceMetrics(device: ParsedDaikinData): void {
    const deviceLabels = {
      device_id: device.deviceId,
      device_model: device.deviceModel
    };

    // Stato online del device
    this.deviceOnlineGauge.set(deviceLabels, device.isOnline ? 1 : 0);

    // Metriche per ogni climate control
    device.climateControls.forEach(control => {
      const controlLabels = {
        ...deviceLabels,
        device_name: control.name,
        control_id: control.id
      };

      const controlWithModeLabels = {
        ...controlLabels,
        mode: control.mode
      };

      // Temperature e umidità
      if (control.roomTemperature !== undefined) {
        this.roomTemperatureGauge.set(controlLabels, control.roomTemperature);
      }

      if (control.roomHumidity !== undefined) {
        this.roomHumidityGauge.set(controlLabels, control.roomHumidity);
      }

      if (control.outdoorTemperature !== undefined) {
        this.outdoorTemperatureGauge.set(controlLabels, control.outdoorTemperature);
      }

      if (control.targetTemperature !== undefined) {
        this.targetTemperatureGauge.set(controlWithModeLabels, control.targetTemperature);
      }

      // Stati del device
      this.devicePowerGauge.set(controlWithModeLabels, control.isOn ? 1 : 0);
      this.powerfulModeGauge.set(controlLabels, control.powerfulMode ? 1 : 0);
      this.errorStateGauge.set(controlLabels, control.isInErrorState ? 1 : 0);
      this.warningStateGauge.set(controlLabels, control.isInWarningState ? 1 : 0);

      // Consumi energetici
      if (control.consumptionToday !== undefined) {
        this.consumptionTodayGauge.set(controlLabels, control.consumptionToday);
      }

      if (control.consumptionThisWeek !== undefined) {
        this.consumptionWeekGauge.set(controlLabels, control.consumptionThisWeek);
      }

      if (control.consumptionThisMonth !== undefined) {
        this.consumptionMonthGauge.set(controlLabels, control.consumptionThisMonth);
      }

      if (control.consumptionThisYear !== undefined) {
        this.consumptionYearGauge.set(controlLabels, control.consumptionThisYear);
      }
    });
  }

  private clearMetrics(): void {
    // Reset delle metriche per evitare dati stale
    this.roomTemperatureGauge.reset();
    this.roomHumidityGauge.reset();
    this.outdoorTemperatureGauge.reset();
    this.targetTemperatureGauge.reset();
    this.deviceOnlineGauge.reset();
    this.devicePowerGauge.reset();
    this.powerfulModeGauge.reset();
    this.errorStateGauge.reset();
    this.warningStateGauge.reset();
    this.consumptionTodayGauge.reset();
    this.consumptionWeekGauge.reset();
    this.consumptionMonthGauge.reset();
    this.consumptionYearGauge.reset();
  }

  startServer(port: number): void {
    this.server = this.app.listen(port, '0.0.0.0', () => {
      console.log(`📊 Prometheus exporter listening on http://0.0.0.0:${port}`);
      console.log(`📈 Metrics available at http://0.0.0.0:${port}/metrics`);
      console.log(`🏥 Health check at http://0.0.0.0:${port}/health`);
    });
  }

  stopServer(): void {
    if (this.server) {
      this.server.close(() => {
        console.log('📊 Prometheus exporter server stopped');
      });
    }
  }
}