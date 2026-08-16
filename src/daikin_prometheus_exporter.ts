import { register, Gauge, Counter, collectDefaultMetrics } from 'prom-client';
import express from 'express';
import { DaikinDataParser, ParsedDaikinData } from './daikin_data_parser.js';

// Mappings for string enums to numeric values
const OPERATION_MODE_MAP: Record<string, number> = {
  auto: 0,
  dry: 1,
  cooling: 2,
  heating: 3,
  fanOnly: 4
};

const FAN_SPEED_MAP: Record<string, number> = {
  auto: 0,
  fixed: 1,
  quiet: 2
};

const FAN_DIRECTION_MAP: Record<string, number> = {
  stop: 0,
  swing: 1
};

function getOperationModeValue(mode: string): number {
  return OPERATION_MODE_MAP[mode] !== undefined ? OPERATION_MODE_MAP[mode] : -1;
}

function getFanSpeedValue(fanSpeed: string): number {
  return FAN_SPEED_MAP[fanSpeed] !== undefined ? FAN_SPEED_MAP[fanSpeed] : -1;
}

function getFanDirectionValue(direction: string): number {
  return FAN_DIRECTION_MAP[direction] !== undefined ? FAN_DIRECTION_MAP[direction] : -1;
}

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
  private operationModeGauge!: Gauge<string>;
  private holidayModeGauge!: Gauge<string>;
  private errorCodeGauge!: Gauge<string>;
  private powerfulModeGauge!: Gauge<string>;
  private errorStateGauge!: Gauge<string>;
  private warningStateGauge!: Gauge<string>;
  private cautionStateGauge!: Gauge<string>;
  private fanSpeedGauge!: Gauge<string>;
  private fanSpeedCurrentModeGauge!: Gauge<string>;
  private fanSpeedFixedLevelGauge!: Gauge<string>;
  private fanDirectionGauge!: Gauge<string>;
  private fanDirectionHorizontalGauge!: Gauge<string>;
  private fanDirectionVerticalGauge!: Gauge<string>;
  private scheduleEnabledGauge!: Gauge<string>;
  private scheduleCurrentGauge!: Gauge<string>;
  private gatewayInfoGauge!: Gauge<string>;
  private gatewayFirmwareUpdateSupportedGauge!: Gauge<string>;
  private indoorUnitInfoGauge!: Gauge<string>;
  private deviceLastUpdatedGauge!: Gauge<string>;
  private consumptionHeatingHourGauge!: Gauge<string>;
  private consumptionHeatingTodayGauge!: Gauge<string>;
  private consumptionHeatingWeekGauge!: Gauge<string>;
  private consumptionHeatingMonthGauge!: Gauge<string>;
  private consumptionHeatingYearGauge!: Gauge<string>;
  private consumptionCoolingHourGauge!: Gauge<string>;
  private consumptionCoolingTodayGauge!: Gauge<string>;
  private consumptionCoolingWeekGauge!: Gauge<string>;
  private consumptionCoolingMonthGauge!: Gauge<string>;
  private consumptionCoolingYearGauge!: Gauge<string>;
  private dataUpdateCounter!: Counter<string>;

  constructor(collectNodeMetrics: boolean = true) {
    this.app = express();
    // Metriche di default di Node.js (attive solo se non disattivate via flag)
    if (collectNodeMetrics) {
      collectDefaultMetrics();
    }
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
      help: 'Target temperature in Celsius for active mode',
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

    this.operationModeGauge = new Gauge({
      name: 'daikin_operation_mode',
      help: 'Active operation mode (0 = auto, 1 = dry, 2 = cooling, 3 = heating, 4 = fanOnly)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'operation_mode']
    });

    this.holidayModeGauge = new Gauge({
      name: 'daikin_holiday_mode',
      help: 'Holiday mode status (1 = on, 0 = off)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.errorCodeGauge = new Gauge({
      name: 'daikin_error_code',
      help: 'Device error code (1 = current code)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'error_code']
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

    this.cautionStateGauge = new Gauge({
      name: 'daikin_caution_state',
      help: 'Device caution state (1 = caution, 0 = no caution)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id']
    });

    this.fanSpeedGauge = new Gauge({
      name: 'daikin_fan_speed',
      help: 'Active mode fan speed (0 = auto, 1 = fixed, 2 = quiet)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode', 'fan_speed']
    });

    this.fanSpeedCurrentModeGauge = new Gauge({
      name: 'daikin_fan_speed_current_mode',
      help: 'Active mode fan speed setting (0 = auto, 1 = fixed, 2 = quiet)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode', 'current_mode']
    });

    this.fanSpeedFixedLevelGauge = new Gauge({
      name: 'daikin_fan_speed_fixed_level',
      help: 'Active mode fan speed fixed level (numeric value)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode']
    });

    this.fanDirectionGauge = new Gauge({
      name: 'daikin_fan_direction',
      help: 'Active mode fan direction (0 = stop, 1 = swing)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode', 'orientation', 'direction']
    });

    this.fanDirectionHorizontalGauge = new Gauge({
      name: 'daikin_fan_direction_horizontal',
      help: 'Active mode horizontal fan direction (0 = stop, 1 = swing)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode', 'direction']
    });

    this.fanDirectionVerticalGauge = new Gauge({
      name: 'daikin_fan_direction_vertical',
      help: 'Active mode vertical fan direction (0 = stop, 1 = swing)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'mode', 'direction']
    });

    this.scheduleEnabledGauge = new Gauge({
      name: 'daikin_schedule_enabled',
      help: 'Schedule enabled status (1 = enabled, 0 = disabled)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'schedule_mode']
    });

    this.scheduleCurrentGauge = new Gauge({
      name: 'daikin_schedule_current',
      help: 'Current active schedule (1 = current schedule)',
      labelNames: ['device_id', 'device_model', 'device_name', 'control_id', 'schedule_mode', 'schedule_id']
    });

    this.gatewayInfoGauge = new Gauge({
      name: 'daikin_gateway_info',
      help: 'Gateway information',
      labelNames: ['device_id', 'device_model', 'gateway_name', 'gateway_id', 'ip_address', 'mac_address', 'firmware_version', 'model_info']
    });

    this.gatewayFirmwareUpdateSupportedGauge = new Gauge({
      name: 'daikin_gateway_firmware_update_supported',
      help: 'Gateway firmware update supported status (1 = supported, 0 = not supported)',
      labelNames: ['device_id', 'device_model', 'gateway_name', 'gateway_id']
    });

    this.indoorUnitInfoGauge = new Gauge({
      name: 'daikin_indoor_unit_info',
      help: 'Indoor unit information',
      labelNames: ['device_id', 'device_model', 'unit_name', 'unit_id', 'software_version']
    });

    this.deviceLastUpdatedGauge = new Gauge({
      name: 'daikin_device_last_updated_timestamp_seconds',
      help: 'Device last updated timestamp from Daikin Cloud in seconds since Unix epoch',
      labelNames: ['device_id', 'device_model']
    });

    this.consumptionHeatingHourGauge = new Gauge({
      name: 'daikin_consumption_heating_hour_kwh',
      help: 'Heating energy consumption in current hour in kWh (data is a 2 hour average)',
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

    this.consumptionCoolingHourGauge = new Gauge({
      name: 'daikin_consumption_cooling_hour_kwh',
      help: 'Cooling energy consumption in current hour in kWh (data is a 2 hour average)',
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

    // Timestamp ultimo aggiornamento dal cloud
    if (device.timestamp) {
      const timestampSeconds = Math.floor(new Date(device.timestamp).getTime() / 1000);
      if (!isNaN(timestampSeconds)) {
        this.deviceLastUpdatedGauge.set(deviceLabels, timestampSeconds);
      }
    }

    // Gateway info e supporto aggiornamento firmware
    device.gateways.forEach(gateway => {
      this.gatewayInfoGauge.set(
        {
          ...deviceLabels,
          gateway_name: gateway.name,
          gateway_id: gateway.id,
          ip_address: gateway.ipAddress || '',
          mac_address: gateway.macAddress || '',
          firmware_version: gateway.firmwareVersion || '',
          model_info: gateway.modelInfo || ''
        },
        1
      );

      this.gatewayFirmwareUpdateSupportedGauge.set(
        {
          ...deviceLabels,
          gateway_name: gateway.name,
          gateway_id: gateway.id
        },
        gateway.isFirmwareUpdateSupported ? 1 : 0
      );
    });

    // Indoor Unit info
    device.indoorUnits.forEach(unit => {
      this.indoorUnitInfoGauge.set(
        {
          ...deviceLabels,
          unit_name: unit.name,
          unit_id: unit.id,
          software_version: unit.softwareVersion || ''
        },
        1
      );
    });

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

      // Modalità operativa attiva (esposta per active mode con valore numerico mappato: auto=0, dry=1, cooling=2, heating=3, fanOnly=4)
      this.operationModeGauge.set(
        {
          ...controlLabels,
          operation_mode: control.mode
        },
        getOperationModeValue(control.mode)
      );

      // Target temperature per la modalità attiva
      if (control.targetTemperature !== undefined) {
        this.targetTemperatureGauge.set(controlWithModeLabels, control.targetTemperature);
      }

      // Error code (stringa mappata su metrica con valore 1 e label error_code)
      if (control.errorCode !== undefined) {
        this.errorCodeGauge.set(
          {
            ...controlLabels,
            error_code: control.errorCode
          },
          1
        );
      }

      // Holiday mode (1 = on/attivo, 0 = off/disattivo)
      this.holidayModeGauge.set(controlLabels, control.isHolidayModeActive ? 1 : 0);

      // Schedule mode ed abilitazione
      if (control.scheduleMode !== undefined) {
        if (control.scheduleEnabled !== undefined) {
          this.scheduleEnabledGauge.set(
            {
              ...controlLabels,
              schedule_mode: control.scheduleMode
            },
            control.scheduleEnabled ? 1 : 0
          );
        }

        if (control.scheduleId !== undefined) {
          this.scheduleCurrentGauge.set(
            {
              ...controlLabels,
              schedule_mode: control.scheduleMode,
              schedule_id: control.scheduleId
            },
            1
          );
        }
      }

      // Stati del device
      this.devicePowerGauge.set(controlWithModeLabels, control.isOn ? 1 : 0);
      this.powerfulModeGauge.set(controlLabels, control.powerfulMode ? 1 : 0);
      this.errorStateGauge.set(controlLabels, control.isInErrorState ? 1 : 0);
      this.warningStateGauge.set(controlLabels, control.isInWarningState ? 1 : 0);
      this.cautionStateGauge.set(controlLabels, control.isInCautionState ? 1 : 0);

      // Ventola per la modalità attiva (valori mappati: auto=0, fixed=1, quiet=2; stop=0, swing=1)
      if (control.fanSpeed) {
        const fanSpeedNum = getFanSpeedValue(control.fanSpeed);
        this.fanSpeedGauge.set({ ...controlWithModeLabels, fan_speed: control.fanSpeed }, fanSpeedNum);
        this.fanSpeedCurrentModeGauge.set({ ...controlWithModeLabels, current_mode: control.fanSpeed }, fanSpeedNum);
      }

      if (control.fanSpeedLevel !== undefined) {
        this.fanSpeedFixedLevelGauge.set(controlWithModeLabels, control.fanSpeedLevel);
      }

      if (control.fanDirectionHorizontal) {
        const horizDirNum = getFanDirectionValue(control.fanDirectionHorizontal);
        this.fanDirectionHorizontalGauge.set({ ...controlWithModeLabels, direction: control.fanDirectionHorizontal }, horizDirNum);
        this.fanDirectionGauge.set({ ...controlWithModeLabels, orientation: 'horizontal', direction: control.fanDirectionHorizontal }, horizDirNum);
      }

      if (control.fanDirectionVertical) {
        const vertDirNum = getFanDirectionValue(control.fanDirectionVertical);
        this.fanDirectionVerticalGauge.set({ ...controlWithModeLabels, direction: control.fanDirectionVertical }, vertDirNum);
        this.fanDirectionGauge.set({ ...controlWithModeLabels, orientation: 'vertical', direction: control.fanDirectionVertical }, vertDirNum);
      }

      // Consumi energetici
      if (control.consumptionHeatingHour !== undefined) {
        this.consumptionHeatingHourGauge.set(controlLabels, control.consumptionHeatingHour);
      }

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

      if (control.consumptionCoolingHour !== undefined) {
        this.consumptionCoolingHourGauge.set(controlLabels, control.consumptionCoolingHour);
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
    this.operationModeGauge.reset();
    this.holidayModeGauge.reset();
    this.errorCodeGauge.reset();
    this.powerfulModeGauge.reset();
    this.errorStateGauge.reset();
    this.warningStateGauge.reset();
    this.cautionStateGauge.reset();
    this.fanSpeedGauge.reset();
    this.fanSpeedCurrentModeGauge.reset();
    this.fanSpeedFixedLevelGauge.reset();
    this.fanDirectionGauge.reset();
    this.fanDirectionHorizontalGauge.reset();
    this.fanDirectionVerticalGauge.reset();
    this.scheduleEnabledGauge.reset();
    this.scheduleCurrentGauge.reset();
    this.gatewayInfoGauge.reset();
    this.gatewayFirmwareUpdateSupportedGauge.reset();
    this.indoorUnitInfoGauge.reset();
    this.deviceLastUpdatedGauge.reset();
    this.consumptionHeatingHourGauge.reset();
    this.consumptionHeatingTodayGauge.reset();
    this.consumptionHeatingWeekGauge.reset();
    this.consumptionHeatingMonthGauge.reset();
    this.consumptionHeatingYearGauge.reset();
    this.consumptionCoolingHourGauge.reset();
    this.consumptionCoolingTodayGauge.reset();
    this.consumptionCoolingWeekGauge.reset();
    this.consumptionCoolingMonthGauge.reset();
    this.consumptionCoolingYearGauge.reset();
  }

  startServer(port: number): void {
    this.server = this.app.listen(port, '::', () => {
      console.log(`📊 Prometheus exporter listening on http://[::]:${port}`);
      console.log(`📈 Metrics available at http://[::]:${port}/metrics`);
      console.log(`🏥 Health check at http://[::]:${port}/health`);
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