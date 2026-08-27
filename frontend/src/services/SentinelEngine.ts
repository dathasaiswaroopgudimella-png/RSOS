/**
 * RoadSOS Sentinel Omniscient Engine (v6.0)
 * High-frequency kinetic anomaly detection, real physical accelerometer monitoring,
 * multi-vehicle sensitivity profiles (Bike / Car / Truck / Test), and crash simulation studio.
 */

import { KineticTelemetry, SentinelAlert } from '../types';

export type AnomalyCallback = (alert: SentinelAlert) => void;
export type TelemetryCallback = (telemetry: KineticTelemetry) => void;
export type VehicleProfile = 'BIKE' | 'CAR' | 'TRUCK' | 'TEST';

export interface ProfileThresholds {
  impactG: number;
  tiltAngleDeg: number;
  speedDropKmh: number;
  label: string;
}

export const SENSITIVITY_PROFILES: Record<VehicleProfile, ProfileThresholds> = {
  BIKE: {
    impactG: 3.2,
    tiltAngleDeg: 52,
    speedDropKmh: 25,
    label: 'Motorcycle / 2-Wheeler'
  },
  CAR: {
    impactG: 3.8,
    tiltAngleDeg: 65,
    speedDropKmh: 35,
    label: 'Passenger Car / Sedan'
  },
  TRUCK: {
    impactG: 4.8,
    tiltAngleDeg: 75,
    speedDropKmh: 45,
    label: 'Heavy Commercial / Bus'
  },
  TEST: {
    impactG: 2.2,
    tiltAngleDeg: 45,
    speedDropKmh: 15,
    label: 'High-Sensitivity Demo Mode'
  }
};

class SentinelEngine {
  private active: boolean = false;
  private anomalyCb: AnomalyCallback | null = null;
  private telemetryCb: TelemetryCallback | null = null;
  private profile: VehicleProfile = 'CAR';

  // Kinetic state
  private currentTelemetry: KineticTelemetry = {
    g_force: 1.00,
    accel_x: 0.0,
    accel_y: 0.0,
    accel_z: 9.8,
    speed_kmh: 0,
    delta_speed_kmh: 0,
    tilt_angle_deg: 0,
    anomaly_type: null,
    timestamp: Date.now(),
  };

  private peakGForce: number = 1.0;
  private lastSpeedKmh: number = 0;
  private lastSpeedTimestamp: number = 0;
  private sensor: any = null;
  private watchId: number | null = null;
  private telemetryInterval: any = null;
  private isMotionPermissionGranted: boolean = false;
  private isHardwareSensorActive: boolean = false;

  constructor() {
    this.initSensors();
  }

  private initSensors() {
    if (typeof window !== 'undefined' && 'LinearAccelerationSensor' in window) {
      try {
        this.sensor = new (window as any).LinearAccelerationSensor({ frequency: 60 });
        this.sensor.addEventListener('reading', () => this.handleLinearSensor());
      } catch (_) {}
    }
  }

  public setVehicleProfile(p: VehicleProfile) {
    this.profile = p;
    console.log(`[SENTINEL] Vehicle profile switched to: ${p} (${SENSITIVITY_PROFILES[p].label})`);
  }

  public getVehicleProfile(): VehicleProfile {
    return this.profile;
  }

  public getProfileThresholds(): ProfileThresholds {
    return SENSITIVITY_PROFILES[this.profile];
  }

  public async requestMotionPermission(): Promise<boolean> {
    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      try {
        const state = await (DeviceMotionEvent as any).requestPermission();
        this.isMotionPermissionGranted = state === 'granted';
        if (this.isMotionPermissionGranted) {
          this.isHardwareSensorActive = true;
        }
        return this.isMotionPermissionGranted;
      } catch (e) {
        console.warn('[SENTINEL] Motion permission request error:', e);
        return false;
      }
    }
    this.isMotionPermissionGranted = true;
    this.isHardwareSensorActive = true;
    return true;
  }

  public isHardwareConnected(): boolean {
    return this.isHardwareSensorActive;
  }

  public activate(onAnomaly: AnomalyCallback, onTelemetry?: TelemetryCallback) {
    this.anomalyCb = onAnomaly;
    if (onTelemetry) this.telemetryCb = onTelemetry;
    this.active = true;

    // 1. Hardware sensors
    if (this.sensor) {
      try {
        this.sensor.start();
        this.isHardwareSensorActive = true;
      } catch (_) {}
    } else if (typeof window !== 'undefined') {
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', this.handleOrientation, true);
    }
    this.startGpsTracking();

    // 2. High-frequency telemetry heartbeat loop (10Hz)
    this.telemetryInterval = setInterval(() => {
      if (!this.active) return;
      this.currentTelemetry.timestamp = Date.now();
      if (this.telemetryCb) {
        this.telemetryCb({ ...this.currentTelemetry });
      }
    }, 100);

    console.log('[SENTINEL] Sentinel Omniscient Engine v6.0 active.');
  }

  public deactivate() {
    this.active = false;
    if (this.sensor) {
      try {
        this.sensor.stop();
      } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleDeviceMotion);
      window.removeEventListener('deviceorientation', this.handleOrientation);
    }

    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }

    this.anomalyCb = null;
    this.telemetryCb = null;
  }

  private handleLinearSensor = () => {
    if (!this.active || !this.sensor) return;
    const { x = 0, y = 0, z = 0 } = this.sensor;
    this.isHardwareSensorActive = true;
    this.processAcceleration(x, y, z + 9.8);
  };

  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!this.active) return;
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel) return;

    this.isHardwareSensorActive = true;
    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = (accel.z !== null && accel.z !== undefined) ? accel.z : 9.8;
    this.processAcceleration(x, y, z);
  };

  private handleOrientation = (event: DeviceOrientationEvent) => {
    if (!this.active) return;
    const beta = Math.abs(event.beta || 0);
    const gamma = Math.abs(event.gamma || 0);
    const maxTilt = Math.max(beta, gamma);

    this.currentTelemetry.tilt_angle_deg = Math.round(maxTilt);

    // Rollover detection threshold based on active vehicle profile
    const threshold = SENSITIVITY_PROFILES[this.profile].tiltAngleDeg;
    if (maxTilt >= threshold) {
      this.triggerAlert('rollover', {
        ...this.currentTelemetry,
        anomaly_type: 'rollover',
      });
    }
  };

  private processAcceleration(x: number, y: number, z: number) {
    const rawMagnitude = Math.sqrt(x * x + y * y + z * z);
    const gForce = rawMagnitude / 9.80665;

    this.currentTelemetry.accel_x = Math.round(x * 10) / 10;
    this.currentTelemetry.accel_y = Math.round(y * 10) / 10;
    this.currentTelemetry.accel_z = Math.round(z * 10) / 10;
    this.currentTelemetry.g_force = Math.round(gForce * 100) / 100;

    if (gForce > this.peakGForce) {
      this.peakGForce = gForce;
    }

    // Impact threshold based on active vehicle profile
    const impactThreshold = SENSITIVITY_PROFILES[this.profile].impactG;
    if (gForce >= impactThreshold) {
      this.triggerAlert('impact', {
        ...this.currentTelemetry,
        anomaly_type: 'impact',
      });
    }
  }

  private startGpsTracking() {
    if (!('geolocation' in navigator)) return;

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const speedMs = pos.coords.speed || 0;
          const speedKmh = Math.max(0, Math.round(speedMs * 3.6));
          const now = Date.now();

          if (this.lastSpeedTimestamp > 0) {
            const timeDeltaSec = (now - this.lastSpeedTimestamp) / 1000;
            if (timeDeltaSec > 0 && timeDeltaSec < 3.0) {
              const deltaSpeed = this.lastSpeedKmh - speedKmh;
              this.currentTelemetry.delta_speed_kmh = deltaSpeed;

              const dropThreshold = SENSITIVITY_PROFILES[this.profile].speedDropKmh;
              // Sudden crash stop detection
              if (this.lastSpeedKmh > dropThreshold && speedKmh < 6 && deltaSpeed >= dropThreshold) {
                this.triggerAlert('sudden_stop', {
                  ...this.currentTelemetry,
                  speed_kmh: speedKmh,
                  delta_speed_kmh: deltaSpeed,
                  anomaly_type: 'sudden_stop',
                });
              }
            }
          }

          this.lastSpeedKmh = speedKmh;
          this.lastSpeedTimestamp = now;
          this.currentTelemetry.speed_kmh = speedKmh;
        },
        (err) => console.warn('[SENTINEL] GPS watch info:', err.message),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
      );
    } catch (e) {
      console.warn('[SENTINEL] GPS watch error:', e);
    }
  }

  private triggerAlert(type: SentinelAlert['type'], telemetry: KineticTelemetry) {
    if (this.anomalyCb) {
      this.anomalyCb({
        type,
        timestamp: Date.now(),
        telemetry: { ...telemetry, anomaly_type: type },
      });
    }
  }

  // --- Manual Kinetic Force Testing (for Desktop & Testing) ---
  public setManualGForce(g: number) {
    this.currentTelemetry.g_force = Math.round(g * 100) / 100;
    this.currentTelemetry.accel_x = Math.round((g * 4.8) * 10) / 10;
    this.currentTelemetry.accel_y = Math.round((g * 5.4) * 10) / 10;
    this.currentTelemetry.accel_z = Math.round((g * 6.5) * 10) / 10;
    if (this.telemetryCb) {
      this.telemetryCb({ ...this.currentTelemetry });
    }
    const impactThreshold = SENSITIVITY_PROFILES[this.profile].impactG;
    if (g >= impactThreshold) {
      this.triggerAlert('impact', this.currentTelemetry);
    }
  }

  // --- Kinetic Crash Simulation Studio Methods ---
  public simulateImpact(gMagnitude: number = 5.82) {
    const fakeTelemetry: KineticTelemetry = {
      g_force: gMagnitude,
      accel_x: Math.round(gMagnitude * 5.8 * 10) / 10,
      accel_y: Math.round(gMagnitude * 6.4 * 10) / 10,
      accel_z: Math.round(gMagnitude * 3.2 * 10) / 10,
      speed_kmh: 0,
      delta_speed_kmh: 58,
      tilt_angle_deg: 18,
      anomaly_type: 'impact',
      timestamp: Date.now(),
    };
    this.currentTelemetry = fakeTelemetry;
    if (this.telemetryCb) {
      this.telemetryCb({ ...fakeTelemetry });
    }
    this.triggerAlert('impact', fakeTelemetry);
  }

  public simulateSuddenStop() {
    const fakeTelemetry: KineticTelemetry = {
      g_force: 4.85,
      accel_x: 14.2,
      accel_y: 39.6,
      accel_z: 9.8,
      speed_kmh: 0,
      delta_speed_kmh: 65,
      tilt_angle_deg: 24,
      anomaly_type: 'sudden_stop',
      timestamp: Date.now(),
    };
    this.currentTelemetry = fakeTelemetry;
    if (this.telemetryCb) {
      this.telemetryCb({ ...fakeTelemetry });
    }
    this.triggerAlert('sudden_stop', fakeTelemetry);
  }

  public simulateRollover() {
    const fakeTelemetry: KineticTelemetry = {
      g_force: 3.42,
      accel_x: 24.5,
      accel_y: 11.2,
      accel_z: 1.5,
      speed_kmh: 28,
      delta_speed_kmh: 22,
      tilt_angle_deg: 94,
      anomaly_type: 'rollover',
      timestamp: Date.now(),
    };
    this.currentTelemetry = fakeTelemetry;
    if (this.telemetryCb) {
      this.telemetryCb({ ...fakeTelemetry });
    }
    this.triggerAlert('rollover', fakeTelemetry);
  }

  public getTelemetry(): KineticTelemetry {
    return { ...this.currentTelemetry };
  }
}

export const sentinelEngine = new SentinelEngine();
