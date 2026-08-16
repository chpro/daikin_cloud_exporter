// TypeScript interfaces for Daikin data
interface DaikinDevice {
  _id: string;
  deviceModel: string;
  managementPoints: ManagementPoint[];
  isCloudConnectionUp: {
    value: boolean;
  };
  timestamp: string;
}

interface ManagementPoint {
  embeddedId: string;
  managementPointType: string;
  managementPointSubType?: string;
  managementPointCategory?: string;
  name?: {
    value: string;
  };
  onOffMode?: {
    value: string;
  };
  operationMode?: {
    value: string;
    values?: string[];
  };
  powerfulMode?: {
    value: string;
  };
  isPowerfulModeActive?: {
    value: boolean;
  };
  isHolidayModeActive?: {
    value: boolean;
  };
  holidayMode?: {
    value: {
      enabled: boolean;
    };
  };
  errorCode?: {
    value: string;
  };
  sensoryData?: {
    value: {
      roomTemperature?: { value: number; unit?: string };
      roomHumidity?: { value: number; unit?: string };
      outdoorTemperature?: { value: number; unit?: string };
    };
  };
  temperatureControl?: {
    value: {
      operationModes?: {
        [key: string]: {
          setpoints?: {
            roomTemperature?: {
              value: number;
              unit?: string;
              minValue?: number;
              maxValue?: number;
              stepValue?: number;
            };
          };
        };
      };
    };
  };
  fanControl?: {
    value: {
      operationModes?: {
        [key: string]: {
          fanSpeed?: {
            currentMode?: { value: string };
            modes?: {
              fixed?: {
                value?: number;
                minValue?: number;
                maxValue?: number;
                stepValue?: number;
              };
            };
          };
          fanDirection?: {
            horizontal?: { currentMode?: { value: string } };
            vertical?: { currentMode?: { value: string } };
          };
        };
      };
    };
  };
  schedule?: {
    value?: {
      currentMode?: { value: string };
      modes?: {
        [key: string]: {
          currentSchedule?: { value: string };
          enabled?: { value: boolean };
        };
      };
    };
  };
  consumptionData?: {
    value: {
      electrical?: {
        unit?: string;
        heating?: {
          d?: (number | null)[];
          w?: (number | null)[];
          m?: (number | null)[];
          y?: (number | null)[];
        };
        cooling?: {
          d?: (number | null)[];
          w?: (number | null)[];
          m?: (number | null)[];
          y?: (number | null)[];
        };
        [key: string]: any;
      };
    };
  };
  isInErrorState?: { value: boolean };
  isInWarningState?: { value: boolean };
  isInCautionState?: { value: boolean };
  ipAddress?: { value: string };
  macAddress?: { value: string };
  firmwareVersion?: { value: string };
  modelInfo?: { value: string };
  isFirmwareUpdateSupported?: { value: boolean };
  softwareVersion?: { value: string };
}

interface OperationModeSettings {
  mode: string;
  targetTemperature?: number;
  fanSpeed?: string;
  fanSpeedLevel?: number;
  fanDirectionHorizontal?: string;
  fanDirectionVertical?: string;
}

interface ParsedGateway {
  id: string;
  name: string;
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
  modelInfo?: string;
  isFirmwareUpdateSupported: boolean;
}

interface ParsedIndoorUnit {
  id: string;
  name: string;
  softwareVersion?: string;
}

interface ParsedClimateControl {
  id: string;
  name: string;
  isOn: boolean;
  mode: string;
  errorCode?: string;
  isHolidayModeActive: boolean;
  roomTemperature?: number;
  roomHumidity?: number;
  outdoorTemperature?: number;
  targetTemperature?: number;
  fanSpeed?: string;
  fanSpeedLevel?: number;
  fanDirectionHorizontal?: string;
  fanDirectionVertical?: string;
  powerfulMode: boolean;
  isInErrorState: boolean;
  isInWarningState: boolean;
  isInCautionState: boolean;
  scheduleEnabled?: boolean;
  scheduleMode?: string;
  scheduleId?: string;
  operationModes: OperationModeSettings[];
  consumptionHeatingHour?: number;
  consumptionHeatingToday?: number;
  consumptionHeatingThisWeek?: number;
  consumptionHeatingThisMonth?: number;
  consumptionHeatingThisYear?: number;
  consumptionCoolingHour?: number;
  consumptionCoolingToday?: number;
  consumptionCoolingThisWeek?: number;
  consumptionCoolingThisMonth?: number;
  consumptionCoolingThisYear?: number;
}

interface ParsedDaikinData {
  deviceId: string;
  deviceModel: string;
  isOnline: boolean;
  timestamp?: string;
  gateways: ParsedGateway[];
  indoorUnits: ParsedIndoorUnit[];
  climateControls: ParsedClimateControl[];
}

export class DaikinDataParser {
  static parseDevices(devices: any[]): ParsedDaikinData[] {
    return devices.map(device => this.parseDevice(device));
  }

  static parseDevice(device: any): ParsedDaikinData {
    const gateways: ParsedGateway[] = [];
    const indoorUnits: ParsedIndoorUnit[] = [];
    const climateControls: ParsedClimateControl[] = [];

    const managementPoints: any[] = device.managementPoints || [];

    for (const mp of managementPoints) {
      if (mp.managementPointType === 'gateway') {
        gateways.push({
          id: mp.embeddedId || 'gateway',
          name: mp.name?.value || 'Gateway',
          ipAddress: mp.ipAddress?.value,
          macAddress: mp.macAddress?.value,
          firmwareVersion: mp.firmwareVersion?.value,
          modelInfo: mp.modelInfo?.value,
          isFirmwareUpdateSupported: mp.isFirmwareUpdateSupported?.value ?? false
        });
      } else if (mp.managementPointType === 'indoorUnit') {
        indoorUnits.push({
          id: mp.embeddedId || 'indoorUnit',
          name: mp.name?.value || 'Indoor Unit',
          softwareVersion: mp.softwareVersion?.value
        });
      } else if (mp.managementPointType === 'climateControl') {
        const sensoryData = mp.sensoryData?.value;
        const tempControl = mp.temperatureControl?.value;
        const fanControl = mp.fanControl?.value;
        const consumptionData = mp.consumptionData?.value;
        const schedule = mp.schedule?.value;

        // Calculate hourly, daily, weekly, monthly, and yearly consumption values per electrical operation mode
        let consumptionHeatingHour: number | undefined;
        let consumptionHeatingToday: number | undefined;
        let consumptionHeatingThisWeek: number | undefined;
        let consumptionHeatingThisMonth: number | undefined;
        let consumptionHeatingThisYear: number | undefined;

        let consumptionCoolingHour: number | undefined;
        let consumptionCoolingToday: number | undefined;
        let consumptionCoolingThisWeek: number | undefined;
        let consumptionCoolingThisMonth: number | undefined;
        let consumptionCoolingThisYear: number | undefined;

        const electricalData = consumptionData?.electrical;
        if (electricalData && typeof electricalData === 'object') {
          const currentMonthIndex = new Date().getMonth(); // 0..11 (January = 0, December = 11)

          const extractPeriodSum = (periodData?: (number | null)[], periodType?: 'h' | 'd' | 'w' | 'm' | 'y'): number => {
            if (!Array.isArray(periodData) || periodData.length === 0) return 0;
            const energyValues = periodData.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));

            let startIndex = 0;
            let endIndex = energyValues.length;

            if (periodType === 'h') {
              const currentHour = new Date().getHours();
              const slotOffset = Math.floor(currentHour / 2);
              const targetIndex = energyValues.length > 12 ? 12 + slotOffset : slotOffset;
              if (energyValues.length > targetIndex) {
                startIndex = targetIndex;
                endIndex = targetIndex + 1;
              } else {
                startIndex = energyValues.length - 1;
                endIndex = energyValues.length;
              }
            } else if (periodType === 'd') {
              startIndex = energyValues.length > 12 ? 12 : 0;
            } else if (periodType === 'w') {
              startIndex = energyValues.length > 7 ? 7 : 0;
            } else if (periodType === 'm') {
              const targetIndex = 12 + currentMonthIndex;
              if (energyValues.length > targetIndex) {
                startIndex = targetIndex;
                endIndex = targetIndex + 1;
              } else {
                startIndex = energyValues.length - 1;
                endIndex = energyValues.length;
              }
            } else if (periodType === 'y') {
              startIndex = energyValues.length > 1 ? 1 : 0;
            }
            const sum = energyValues.slice(startIndex, endIndex).reduce((acc, val) => acc + val, 0);
            console.log(`🕒 extractPeriodSum: date=${new Date()}, periodType=${periodType}, startIndex=${startIndex}, endIndex=${endIndex}, arrayLength=${energyValues.length}, sum=${sum}`);

            return sum;
          };

          const calculateModeSums = (modeData?: {
            d?: (number | null)[];
            w?: (number | null)[];
            m?: (number | null)[];
            y?: (number | null)[];
          }) => {
            if (!modeData || typeof modeData !== 'object') return null;
            const isArray = Array.isArray(modeData.d) || Array.isArray(modeData.w) || Array.isArray(modeData.m) || Array.isArray(modeData.y);
            if (!isArray) return null;

            const h = extractPeriodSum(modeData.d, 'h');
            const t = extractPeriodSum(modeData.d, 'd');
            const w = extractPeriodSum(modeData.w, 'w');
            const m = extractPeriodSum(modeData.m, 'm');

            let y = 0;
            if (Array.isArray(modeData.y) && modeData.y.length > 0) {
              y = extractPeriodSum(modeData.y, 'y');
            } else if (Array.isArray(modeData.m) && modeData.m.length > 0) {
              const energyValues = modeData.m.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));
              const startIdx = energyValues.length > 12 ? 12 : 0;
              const endIdx = energyValues.length > (12 + currentMonthIndex) ? 12 + currentMonthIndex + 1 : energyValues.length;
              y = energyValues.slice(startIdx, endIdx).reduce((acc, val) => acc + val, 0);
            }

            return { hour: h, today: t, week: w, month: m, year: y };
          };

          for (const [key, value] of Object.entries(electricalData)) {
            if (key === 'unit' || !value || typeof value !== 'object') continue;

            const modeData = value as {
              d?: (number | null)[];
              w?: (number | null)[];
              m?: (number | null)[];
              y?: (number | null)[];
            };
            const sums = calculateModeSums(modeData);
            if (sums) {
              if (key === 'heating') {
                consumptionHeatingHour = Math.round(sums.hour * 1000) / 1000;
                consumptionHeatingToday = Math.round(sums.today * 1000) / 1000;
                consumptionHeatingThisWeek = Math.round(sums.week * 1000) / 1000;
                consumptionHeatingThisMonth = Math.round(sums.month * 1000) / 1000;
                consumptionHeatingThisYear = Math.round(sums.year * 1000) / 1000;
              } else if (key === 'cooling') {
                consumptionCoolingHour = Math.round(sums.hour * 1000) / 1000;
                consumptionCoolingToday = Math.round(sums.today * 1000) / 1000;
                consumptionCoolingThisWeek = Math.round(sums.week * 1000) / 1000;
                consumptionCoolingThisMonth = Math.round(sums.month * 1000) / 1000;
                consumptionCoolingThisYear = Math.round(sums.year * 1000) / 1000;
              }
            }
          }
        }

        const operationMode = mp.operationMode?.value || 'unknown';

        // Collect all configured operation modes from values list, temperatureControl, and fanControl
        const modeNames = new Set<string>();
        if (Array.isArray(mp.operationMode?.values)) {
          mp.operationMode.values.forEach((m: string) => modeNames.add(m));
        }
        if (tempControl?.operationModes) {
          Object.keys(tempControl.operationModes).forEach(m => modeNames.add(m));
        }
        if (fanControl?.operationModes) {
          Object.keys(fanControl.operationModes).forEach(m => modeNames.add(m));
        }
        if (modeNames.size === 0 && operationMode) {
          modeNames.add(operationMode);
        }

        const operationModes: OperationModeSettings[] = [];
        for (const m of modeNames) {
          const tempMode = tempControl?.operationModes?.[m];
          const fanMode = fanControl?.operationModes?.[m];
          const setpoint = tempMode?.setpoints?.roomTemperature;

          operationModes.push({
            mode: m,
            targetTemperature: setpoint?.value,
            fanSpeed: fanMode?.fanSpeed?.currentMode?.value,
            fanSpeedLevel: fanMode?.fanSpeed?.modes?.fixed?.value,
            fanDirectionHorizontal: fanMode?.fanDirection?.horizontal?.currentMode?.value,
            fanDirectionVertical: fanMode?.fanDirection?.vertical?.currentMode?.value
          });
        }

        // Current mode values
        const currentTempData = tempControl?.operationModes?.[operationMode]?.setpoints?.roomTemperature;
        const currentFanData = fanControl?.operationModes?.[operationMode || 'cooling'];

        // Schedule parsing
        const scheduleCurrentMode = schedule?.currentMode?.value;
        const scheduleModeObj = scheduleCurrentMode && schedule?.modes?.[scheduleCurrentMode];
        const scheduleEnabled = scheduleModeObj?.enabled !== undefined ? scheduleModeObj.enabled.value : undefined;
        const scheduleId = scheduleModeObj?.currentSchedule?.value;

        // Holiday mode parsing
        const isHolidayModeActive = mp.isHolidayModeActive?.value === true || mp.holidayMode?.value?.enabled === true;

        climateControls.push({
          id: mp.embeddedId || 'climateControl',
          name: mp.name?.value || 'Unnamed Device',
          isOn: mp.onOffMode?.value === 'on',
          mode: operationMode,
          errorCode: mp.errorCode?.value,
          isHolidayModeActive,
          roomTemperature: sensoryData?.roomTemperature?.value,
          roomHumidity: sensoryData?.roomHumidity?.value,
          outdoorTemperature: sensoryData?.outdoorTemperature?.value,
          targetTemperature: currentTempData?.value,
          fanSpeed: currentFanData?.fanSpeed?.currentMode?.value,
          fanSpeedLevel: currentFanData?.fanSpeed?.modes?.fixed?.value,
          fanDirectionHorizontal: currentFanData?.fanDirection?.horizontal?.currentMode?.value,
          fanDirectionVertical: currentFanData?.fanDirection?.vertical?.currentMode?.value,
          powerfulMode: mp.powerfulMode?.value === 'on' || mp.isPowerfulModeActive?.value === true,
          isInErrorState: mp.isInErrorState?.value || false,
          isInWarningState: mp.isInWarningState?.value || false,
          isInCautionState: mp.isInCautionState?.value || false,
          scheduleEnabled,
          scheduleMode: scheduleCurrentMode,
          scheduleId,
          operationModes,
          consumptionHeatingHour,
          consumptionHeatingToday,
          consumptionHeatingThisWeek,
          consumptionHeatingThisMonth,
          consumptionHeatingThisYear,
          consumptionCoolingHour,
          consumptionCoolingToday,
          consumptionCoolingThisWeek,
          consumptionCoolingThisMonth,
          consumptionCoolingThisYear
        });
      }
    }

    return {
      deviceId: device._id,
      deviceModel: device.deviceModel,
      isOnline: device.isCloudConnectionUp?.value || false,
      timestamp: device.timestamp,
      gateways,
      indoorUnits,
      climateControls
    };
  }
}

export type {
  DaikinDevice,
  ManagementPoint,
  ParsedDaikinData,
  ParsedGateway,
  ParsedIndoorUnit,
  ParsedClimateControl,
  OperationModeSettings
};


