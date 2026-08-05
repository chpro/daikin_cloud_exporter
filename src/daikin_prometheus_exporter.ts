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
  private consumptionHeatingTodayGauge!: Gauge<string>;
  private consumptionHeatingWeekGauge!: Gauge<string>;
  private consumptionHeatingMonthGauge!: Gauge<string>;
  private consumptionHeatingYearGauge!: Gauge<string>;
  private consumptionCoolingTodayGauge!: Gauge<string>;
  private consumptionCoolingWeekGauge!: Gauge<string>;
  private consumptionCoolingMonthGauge!: Gauge<string>;
  private consumptionCoolingYearGauge!: Gauge<string>;
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

    this.consumptionHeatingTodayGauge = new Gauge({
      name: 'daikin_consumption_heating_today_kwh',
      help: 'Heating energy consumption today in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionHeatingWeekGauge = new Gauge({
      name: 'daikin_consumption_heating_week_kwh',
      help: 'Heating energy consumption this week in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionHeatingMonthGauge = new Gauge({
      name: 'daikin_consumption_heating_month_kwh',
      help: 'Heating energy consumption this month in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionHeatingYearGauge = new Gauge({
      name: 'daikin_consumption_heating_year_kwh',
      help: 'Heating energy consumption this year in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionCoolingTodayGauge = new Gauge({
      name: 'daikin_consumption_cooling_today_kwh',
      help: 'Cooling energy consumption today in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionCoolingWeekGauge = new Gauge({
      name: 'daikin_consumption_cooling_week_kwh',
      help: 'Cooling energy consumption this week in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionCoolingMonthGauge = new Gauge({
      name: 'daikin_consumption_cooling_month_kwh',
      help: 'Cooling energy consumption this month in kWh',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.consumptionCoolingYearGauge = new Gauge({
      name: 'daikin_consumption_cooling_year_kwh',
      help: 'Cooling energy consumption this year in kWh',
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
      if (control.consumptionHeatingToday !== undefined) {
        this.consumptionHeatingTodayGauge.set(controlLabels, control.consumptionHeatingToday);
      }

      if (control.consumptionHeatingThisWeek !== undefined) {
        this.consumptionHeatingWeekGauge.set(controlLabels, control.consumptionHeatingThisWeek);
      }

      if (control.consumptionHeatingThisMonth !== undefined) {
        this.consumptionHeatingMonthGauge.set(controlLabels, control.consumptionHeatingThisMonth);
      }

      if (control.consumptionHeatingThisYear !== undefined) {
        this.consumptionHeatingYearGauge.set(controlLabels, control.consumptionHeatingThisYear);
      }

      if (control.consumptionCoolingToday !== undefined) {
        this.consumptionCoolingTodayGauge.set(controlLabels, control.consumptionCoolingToday);
      }

      if (control.consumptionCoolingThisWeek !== undefined) {
        this.consumptionCoolingWeekGauge.set(controlLabels, control.consumptionCoolingThisWeek);
      }

      if (control.consumptionCoolingThisMonth !== undefined) {
        this.consumptionCoolingMonthGauge.set(controlLabels, control.consumptionCoolingThisMonth);
      }

      if (control.consumptionCoolingThisYear !== undefined) {
        this.consumptionCoolingYearGauge.set(controlLabels, control.consumptionCoolingThisYear);
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
    this.consumptionHeatingTodayGauge.reset();
    this.consumptionHeatingWeekGauge.reset();
    this.consumptionHeatingMonthGauge.reset();
    this.consumptionHeatingYearGauge.reset();
    this.consumptionCoolingTodayGauge.reset();
    this.consumptionCoolingWeekGauge.reset();
    this.consumptionCoolingMonthGauge.reset();
    this.consumptionCoolingYearGauge.reset();
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