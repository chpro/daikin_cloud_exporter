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
  name?: {
    value: string;
  };
  onOffMode?: {
    value: string;
  };
  operationMode?: {
    value: string;
  };
  powerfulMode?: {
    value: string;
  };
  sensoryData?: {
    value: {
      roomTemperature: { value: number; unit: string };
      roomHumidity: { value: number; unit: string };
      outdoorTemperature: { value: number; unit: string };
    };
  };
  temperatureControl?: {
    value: {
      operationModes: {
        cooling: {
          setpoints: {
            roomTemperature: { value: number; unit: string };
          };
        };
        heating: {
          setpoints: {
            roomTemperature: { value: number; unit: string };
          };
        };
        auto: {
          setpoints: {
            roomTemperature: { value: number; unit: string };
          };
        };
      };
    };
  };
  fanControl?: {
    value: {
      operationModes: {
        [key: string]: {
          fanSpeed?: {
            currentMode: { value: string };
          };
          fanDirection?: {
            horizontal: { currentMode: { value: string } };
            vertical: { currentMode: { value: string } };
          };
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
}

interface ParsedDaikinData {
  deviceId: string;
  deviceModel: string;
  isOnline: boolean;
  climateControls: Array<{
    id: string;
    name: string;
    isOn: boolean;
    mode: string;
    roomTemperature?: number;
    roomHumidity?: number;
    outdoorTemperature?: number;
    targetTemperature?: number;
    fanSpeed?: string;
    fanDirectionHorizontal?: string;
    fanDirectionVertical?: string;
    powerfulMode: boolean;
    isInErrorState: boolean;
    isInWarningState: boolean;
    isInCautionState: boolean;
    consumptionToday?: number;
    consumptionThisWeek?: number;
    consumptionThisMonth?: number;
    consumptionThisYear?: number;
  }>;
}

export class DaikinDataParser {
  static parseDevices(devices: any[]): ParsedDaikinData[] {
    return devices.map(device => this.parseDevice(device));
  }

  static parseDevice(device: any): ParsedDaikinData {
    const climateControls: ParsedDaikinData['climateControls'] = [];

    // Find all management points of type climateControl
    const climateControlPoints = device.managementPoints?.filter(
      (mp: any) => mp.managementPointType === 'climateControl'
    ) || [];

    for (const controlPoint of climateControlPoints) {
      const sensoryData = controlPoint.sensoryData?.value;
      const tempControl = controlPoint.temperatureControl?.value;
      const fanControl = controlPoint.fanControl?.value;
      const consumptionData = controlPoint.consumptionData?.value;

      // Calculate daily, weekly, monthly, and yearly consumption values across all electrical operation modes
      // (heating, cooling, etc.) following daikin_onecta (Home Assistant integration) logic:
      // - d (daily): slots 12 to end (today's hours)
      // - w (weekly): slots 7 to end (this week's days)
      // - m (monthly): slot 12 + currentMonthIndex (this month)
      // - y (yearly): slot 12 to 12 + currentMonthIndex (this year's months from m) or slot 1 to end (this year from y)
      let consumptionToday: number | undefined;
      let consumptionThisWeek: number | undefined;
      let consumptionThisMonth: number | undefined;
      let consumptionThisYear: number | undefined;

      const electricalData = consumptionData?.electrical;
      if (electricalData && typeof electricalData === 'object') {
        let todaySum = 0;
        let weekSum = 0;
        let monthSum = 0;
        let yearSum = 0;
        let hasData = false;

        const currentMonthIndex = new Date().getMonth(); // 0..11 (January = 0, December = 11)

        const extractPeriodSum = (periodData?: (number | null)[], periodType?: 'd' | 'w' | 'm' | 'y'): number => {
          if (!Array.isArray(periodData) || periodData.length === 0) return 0;
          const energyValues = periodData.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));

          let startIndex = 0;
          let endIndex = energyValues.length;

          if (periodType === 'd') {
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

          return energyValues.slice(startIndex, endIndex).reduce((acc, val) => acc + val, 0);
        };

        for (const [key, value] of Object.entries(electricalData)) {
          if (key === 'unit' || !value || typeof value !== 'object') continue;

          const modeData = value as {
            d?: (number | null)[];
            w?: (number | null)[];
            m?: (number | null)[];
            y?: (number | null)[];
          };
          if (Array.isArray(modeData.d) || Array.isArray(modeData.w) || Array.isArray(modeData.m) || Array.isArray(modeData.y)) {
            hasData = true;
            todaySum += extractPeriodSum(modeData.d, 'd');
            weekSum += extractPeriodSum(modeData.w, 'w');
            monthSum += extractPeriodSum(modeData.m, 'm');

            if (Array.isArray(modeData.y) && modeData.y.length > 0) {
              yearSum += extractPeriodSum(modeData.y, 'y');
            } else if (Array.isArray(modeData.m) && modeData.m.length > 0) {
              const energyValues = modeData.m.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));
              const startIdx = energyValues.length > 12 ? 12 : 0;
              const endIdx = energyValues.length > (12 + currentMonthIndex) ? 12 + currentMonthIndex + 1 : energyValues.length;
              yearSum += energyValues.slice(startIdx, endIdx).reduce((acc, val) => acc + val, 0);
            }
          }
        }

        if (hasData) {
          consumptionToday = Math.round(todaySum * 1000) / 1000;
          consumptionThisWeek = Math.round(weekSum * 1000) / 1000;
          consumptionThisMonth = Math.round(monthSum * 1000) / 1000;
          consumptionThisYear = Math.round(yearSum * 1000) / 1000;
        }
      }

      // Determine target temperature based on operation mode
      let targetTemperature: number | undefined;
      const operationMode = controlPoint.operationMode?.value;
      if (tempControl?.operationModes && operationMode) {
        targetTemperature = tempControl.operationModes[operationMode]?.setpoints?.roomTemperature?.value;
      }

      // Extract fan data for current mode
      const currentFanData = fanControl?.operationModes?.[operationMode || 'cooling'];

      climateControls.push({
        id: controlPoint.embeddedId,
        name: controlPoint.name?.value || 'Unnamed Device',
        isOn: controlPoint.onOffMode?.value === 'on',
        mode: operationMode || 'unknown',
        roomTemperature: sensoryData?.roomTemperature?.value,
        roomHumidity: sensoryData?.roomHumidity?.value,
        outdoorTemperature: sensoryData?.outdoorTemperature?.value,
        targetTemperature,
        fanSpeed: currentFanData?.fanSpeed?.currentMode?.value,
        fanDirectionHorizontal: currentFanData?.fanDirection?.horizontal?.currentMode?.value,
        fanDirectionVertical: currentFanData?.fanDirection?.vertical?.currentMode?.value,
        powerfulMode: controlPoint.powerfulMode?.value === 'on',
        isInErrorState: controlPoint.isInErrorState?.value || false,
        isInWarningState: controlPoint.isInWarningState?.value || false,
        isInCautionState: controlPoint.isInCautionState?.value || false,
        consumptionToday,
        consumptionThisWeek,
        consumptionThisMonth,
        consumptionThisYear
      });
    }

    return {
      deviceId: device._id,
      deviceModel: device.deviceModel,
      isOnline: device.isCloudConnectionUp?.value || false,
      climateControls
    };
  }
}

export type { DaikinDevice, ManagementPoint, ParsedDaikinData };
