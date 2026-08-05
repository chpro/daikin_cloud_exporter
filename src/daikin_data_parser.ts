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
    consumptionHeatingToday?: number;
    consumptionHeatingThisWeek?: number;
    consumptionHeatingThisMonth?: number;
    consumptionHeatingThisYear?: number;
    consumptionCoolingToday?: number;
    consumptionCoolingThisWeek?: number;
    consumptionCoolingThisMonth?: number;
    consumptionCoolingThisYear?: number;
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

      // Calculate daily, weekly, monthly, and yearly consumption values per electrical operation mode
      // (heating, cooling) following daikin_onecta (Home Assistant integration) logic:
      // - d (daily): slots 12 to end (today's hours)
      // - w (weekly): slots 7 to end (this week's days)
      // - m (monthly): slot 12 + currentMonthIndex (this month)
      // - y (yearly): slot 12 to 12 + currentMonthIndex (this year's months from m) or slot 1 to end (this year from y)
      let consumptionHeatingToday: number | undefined;
      let consumptionHeatingThisWeek: number | undefined;
      let consumptionHeatingThisMonth: number | undefined;
      let consumptionHeatingThisYear: number | undefined;

      let consumptionCoolingToday: number | undefined;
      let consumptionCoolingThisWeek: number | undefined;
      let consumptionCoolingThisMonth: number | undefined;
      let consumptionCoolingThisYear: number | undefined;

      const electricalData = consumptionData?.electrical;
      if (electricalData && typeof electricalData === 'object') {
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

        const calculateModeSums = (modeData?: {
          d?: (number | null)[];
          w?: (number | null)[];
          m?: (number | null)[];
          y?: (number | null)[];
        }) => {
          if (!modeData || typeof modeData !== 'object') return null;
          const isArray = Array.isArray(modeData.d) || Array.isArray(modeData.w) || Array.isArray(modeData.m) || Array.isArray(modeData.y);
          if (!isArray) return null;

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

          return { today: t, week: w, month: m, year: y };
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
              consumptionHeatingToday = Math.round(sums.today * 1000) / 1000;
              consumptionHeatingThisWeek = Math.round(sums.week * 1000) / 1000;
              consumptionHeatingThisMonth = Math.round(sums.month * 1000) / 1000;
              consumptionHeatingThisYear = Math.round(sums.year * 1000) / 1000;
            } else if (key === 'cooling') {
              consumptionCoolingToday = Math.round(sums.today * 1000) / 1000;
              consumptionCoolingThisWeek = Math.round(sums.week * 1000) / 1000;
              consumptionCoolingThisMonth = Math.round(sums.month * 1000) / 1000;
              consumptionCoolingThisYear = Math.round(sums.year * 1000) / 1000;
            }
          }
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
        consumptionHeatingToday,
        consumptionHeatingThisWeek,
        consumptionHeatingThisMonth,
        consumptionHeatingThisYear,
        consumptionCoolingToday,
        consumptionCoolingThisWeek,
        consumptionCoolingThisMonth,
        consumptionCoolingThisYear
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
