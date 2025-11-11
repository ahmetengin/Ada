/**
 * NMEA2000Parser - Parse NMEA 2000 marine data
 * Converts CAN bus data (PGN format) to JSON
 */

import { NMEA2000Data } from '../../../core/types.js';

export interface ParsedNMEAData {
  pgn: number;
  pgnName: string;
  source: string;
  timestamp: Date;
  fields: Record<string, any>;
}

export class NMEA2000Parser {
  // Common PGN (Parameter Group Number) definitions
  private static PGN_DEFINITIONS: Record<number, { name: string; fields: string[] }> = {
    127250: { name: 'Vessel Heading', fields: ['heading', 'deviation', 'variation', 'reference'] },
    127251: { name: 'Rate of Turn', fields: ['rate'] },
    127257: { name: 'Attitude', fields: ['yaw', 'pitch', 'roll'] },
    128259: { name: 'Speed', fields: ['speedWaterReferenced', 'speedGroundReferenced'] },
    128267: { name: 'Water Depth', fields: ['depth', 'offset'] },
    129025: { name: 'Position Rapid Update', fields: ['latitude', 'longitude'] },
    129026: { name: 'COG & SOG Rapid Update', fields: ['cog', 'sog'] },
    129029: { name: 'GNSS Position Data', fields: ['latitude', 'longitude', 'altitude', 'gnssType'] },
    130306: { name: 'Wind Data', fields: ['windSpeed', 'windAngle', 'reference'] },
    130310: { name: 'Environmental Parameters', fields: ['waterTemperature', 'outsideAmbientAirTemperature', 'atmosphericPressure'] },
    130311: { name: 'Environmental Parameters', fields: ['temperature', 'humidity', 'pressure'] },
    127488: { name: 'Engine Parameters, Rapid Update', fields: ['engineSpeed', 'engineBoostPressure', 'engineTilt'] },
    127489: { name: 'Engine Parameters, Dynamic', fields: ['oilPressure', 'oilTemperature', 'coolantTemperature', 'fuelRate', 'engineHours'] },
    127505: { name: 'Fluid Level', fields: ['type', 'level', 'capacity'] },
    127508: { name: 'Battery Status', fields: ['batteryInstance', 'voltage', 'current', 'temperature'] },
  };

  /**
   * Parse NMEA2000 data to JSON
   */
  parse(data: NMEA2000Data): ParsedNMEAData | null {
    const pgnDef = NMEA2000Parser.PGN_DEFINITIONS[data.pgn];

    if (!pgnDef) {
      console.warn(`Unknown PGN: ${data.pgn}`);
      return null;
    }

    // In a real implementation, this would parse the actual binary data
    // For now, we'll assume data.data is already parsed or provide structure
    const fields = this.parseFieldsFromBuffer(data.pgn, data.data);

    return {
      pgn: data.pgn,
      pgnName: pgnDef.name,
      source: data.deviceId,
      timestamp: data.timestamp,
      fields,
    };
  }

  /**
   * Parse specific PGN fields from buffer
   * This is a simplified version - real implementation would handle binary parsing
   */
  private parseFieldsFromBuffer(pgn: number, data: any): Record<string, any> {
    // If data is already an object, return it
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return data;
    }

    // Simplified parsing - in production, this would decode actual CAN bus binary data
    const pgnDef = NMEA2000Parser.PGN_DEFINITIONS[pgn];
    const fields: Record<string, any> = {};

    if (pgnDef) {
      pgnDef.fields.forEach((field, index) => {
        fields[field] = null; // Would extract from buffer in real implementation
      });
    }

    return fields;
  }

  /**
   * Convert parsed data to human-readable format
   */
  toHumanReadable(parsed: ParsedNMEAData): string {
    const lines = [
      `${parsed.pgnName} (PGN ${parsed.pgn})`,
      `Source: ${parsed.source}`,
      `Time: ${parsed.timestamp.toISOString()}`,
      'Data:',
    ];

    Object.entries(parsed.fields).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        lines.push(`  ${key}: ${value}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Aggregate multiple NMEA messages into a vessel state
   */
  aggregateToVesselState(messages: ParsedNMEAData[]): Record<string, any> {
    const state: Record<string, any> = {
      timestamp: new Date(),
      navigation: {},
      environment: {},
      engine: {},
      systems: {},
    };

    messages.forEach(msg => {
      switch (msg.pgn) {
        case 127250: // Vessel Heading
          state.navigation.heading = msg.fields.heading;
          state.navigation.deviation = msg.fields.deviation;
          state.navigation.variation = msg.fields.variation;
          break;

        case 129025: // Position
        case 129029: // GNSS Position
          state.navigation.latitude = msg.fields.latitude;
          state.navigation.longitude = msg.fields.longitude;
          if (msg.fields.altitude) state.navigation.altitude = msg.fields.altitude;
          break;

        case 128259: // Speed
          state.navigation.speedWater = msg.fields.speedWaterReferenced;
          state.navigation.speedGround = msg.fields.speedGroundReferenced;
          break;

        case 129026: // COG & SOG
          state.navigation.cog = msg.fields.cog;
          state.navigation.sog = msg.fields.sog;
          break;

        case 128267: // Water Depth
          state.navigation.depth = msg.fields.depth;
          break;

        case 130306: // Wind Data
          state.environment.windSpeed = msg.fields.windSpeed;
          state.environment.windAngle = msg.fields.windAngle;
          break;

        case 130310: // Environmental Parameters
        case 130311:
          state.environment.waterTemperature = msg.fields.waterTemperature || msg.fields.temperature;
          state.environment.airTemperature = msg.fields.outsideAmbientAirTemperature;
          state.environment.pressure = msg.fields.atmosphericPressure || msg.fields.pressure;
          state.environment.humidity = msg.fields.humidity;
          break;

        case 127488: // Engine Parameters Rapid
        case 127489: // Engine Parameters Dynamic
          if (!state.engine.parameters) state.engine.parameters = {};
          Object.assign(state.engine.parameters, msg.fields);
          break;

        case 127505: // Fluid Level
          if (!state.systems.fluids) state.systems.fluids = {};
          state.systems.fluids[msg.fields.type] = {
            level: msg.fields.level,
            capacity: msg.fields.capacity,
          };
          break;

        case 127508: // Battery Status
          if (!state.systems.batteries) state.systems.batteries = [];
          state.systems.batteries.push({
            instance: msg.fields.batteryInstance,
            voltage: msg.fields.voltage,
            current: msg.fields.current,
            temperature: msg.fields.temperature,
          });
          break;
      }
    });

    return state;
  }

  /**
   * Check for alerts and warnings
   */
  checkAlerts(vesselState: Record<string, any>): Array<{ severity: string; message: string }> {
    const alerts = [];

    // Check depth
    if (vesselState.navigation?.depth && vesselState.navigation.depth < 2) {
      alerts.push({ severity: 'warning', message: `Shallow water: ${vesselState.navigation.depth}m` });
    }

    // Check battery
    if (vesselState.systems?.batteries) {
      vesselState.systems.batteries.forEach((battery: any) => {
        if (battery.voltage < 11.5) {
          alerts.push({ severity: 'warning', message: `Low battery voltage: ${battery.voltage}V` });
        }
      });
    }

    // Check engine temperature
    if (vesselState.engine?.parameters?.coolantTemperature > 95) {
      alerts.push({
        severity: 'critical',
        message: `High engine temperature: ${vesselState.engine.parameters.coolantTemperature}°C`,
      });
    }

    return alerts;
  }
}
