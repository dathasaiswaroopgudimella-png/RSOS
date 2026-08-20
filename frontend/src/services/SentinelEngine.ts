/**
 * RoadSOS Sentinel Engine (v5.0)
 * High-frequency kinetic anomaly detection & physics monitoring.
 */

import { KineticTelemetry, SentinelAlert } from '../types';

export type AnomalyCallback = (alert: SentinelAlert) => void;
export type TelemetryCallback = (telemetry: KineticTelemetry) => void;

class SentinelEngine {
  private active: boolean = false;
  private anomalyCb: AnomalyCallback | null = null;
  private telemetryCb: TelemetryCallback | null = null;

  // Kinetic state
  private currentTelemetry: KineticTelemetry = {
    g_force: 1.0,
    accel_x: 0,
    accel_y: 0,
    accel_z: 9.8,
    speed_kmh: 0,
    delta_speed_kmh: 0,
    tilt_angle_deg: 0,
    anomaly_type: null,
    timestamp: Date.now(),
  };

  private lastSpeedKmh: number = 0;
  private lastSpeedTimestamp: number = 0;
  private sensor: any = null;
  private watchId: number | null = null;
  private telemetryInterval: any = null;

  constructor() {
    this.initSensors();
  }

  private initSensors() {
    if ('LinearAccelerationSensor' in window) {
      try {
        this.sensor = new (window as any).LinearAccelerationSensor({ frequency: 60 });
        this.sensor.addEventListener('reading', () => this.handleLinearSensor());
      } catch (e) {
        console.warn('[SENTINEL] LinearAccelerationSensor not supported, falling back to devicemotion');
      }
    }
  }

  public activate(onAnomaly: AnomalyCallback, onTelemetry?: TelemetryCallback) {
    this.anomalyCb = onAnomaly;
    if (onTelemetry) this.telemetryCb = onTelemetry;
    this.active = true;

    if (this.sensor) {
      try {
        this.sensor.start();
      } catch (_) {}
    } else {
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
    }

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    this.startGpsTracking();

    // Start 10Hz telemetry emission for smooth UI HUD rendering
    this.telemetryInterval = setInterval(() => {
      this.currentTelemetry.timestamp = Date.now();
      if (this.telemetryCb) {
        this.telemetryCb({ ...this.currentTelemetry });
      }
    }, 100);

    console.log('[SENTINEL] Sentinel Omniscient Engine activated.');
  }

  public deactivate() {
    this.active = false;
    if (this.sensor) {
      try {
        this.sensor.stop();
      } catch (_) {}
    }
    window.removeEventListener('devicemotion', this.handleDeviceMotion);
    window.removeEventListener('deviceorientation', this.handleOrientation);

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
    console.log('[SENTINEL] Sentinel Omniscient Engine paused.');
  }

  private handleLinearSensor = () => {
    if (!this.active || !this.sensor) return;
    const { x = 0, y = 0, z = 0 } = this.sensor;
    this.processAcceleration(x, y, z);
  };

  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!this.active) return;
    const accel = event.accelerationIncludingGravity || event.acceleration;
    if (!accel) return;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = (accel.z !== null && accel.z !== undefined) ? accel.z : 9.8;
    this.processAcceleration(x, y, z);
  };

  private handleOrientation = (event: DeviceOrientationEvent) => {
    if (!this.active) return;
    const beta = Math.abs(event.beta || 0);   // Pitch (-180 to 180)
    const gamma = Math.abs(event.gamma || 0); // Roll (-90 to 90)
    const maxTilt = Math.max(beta, gamma);

    this.currentTelemetry.tilt_angle_deg = Math.round(maxTilt);

    // Rollover detection threshold (> 70 degrees tilt)
    if (maxTilt > 70) {
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

    // Severe Impact Threshold (> 4.5G = 44.1 m/s^2)
    if (gForce > 4.5) {
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

              // Sudden stop / Crash: speed dropped > 35 km/h in under 1.5 seconds
              if (this.lastSpeedKmh > 35 && speedKmh < 5 && deltaSpeed > 30) {
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
        (err) => console.warn('[SENTINEL] GPS tracking warning:', err.message),
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

  // --- Kinetic Crash Simulation Studio Methods (for testing & demonstration) ---
  public simulateImpact(gMagnitude: number = 5.8) {
    const fakeTelemetry: KineticTelemetry = {
      g_force: gMagnitude,
      accel_x: Math.round(gMagnitude * 6.5),
      accel_y: Math.round(gMagnitude * 7.2),
      accel_z: Math.round(gMagnitude * 4.1),
      speed_kmh: this.currentTelemetry.speed_kmh || 58,
      delta_speed_kmh: 45,
      tilt_angle_deg: 18,
      anomaly_type: 'impact',
      timestamp: Date.now(),
    };
    this.currentTelemetry = fakeTelemetry;
    this.triggerAlert('impact', fakeTelemetry);
  }

  public simulateSuddenStop() {
    const fakeTelemetry: KineticTelemetry = {
      g_force: 4.8,
      accel_x: 12.4,
      accel_y: 38.2,
      accel_z: 9.8,
      speed_kmh: 0,
      delta_speed_kmh: 62,
      tilt_angle_deg: 24,
      anomaly_type: 'sudden_stop',
      timestamp: Date.now(),
    };
    this.currentTelemetry = fakeTelemetry;
    this.triggerAlert('sudden_stop', fakeTelemetry);
  }

  public simulateRollover() {
    const fakeTelemetry: KineticTelemetry = {
      g_force: 3.4,
      accel_x: 22.0,
      accel_y: 8.5,
      accel_z: 1.2,
      speed_kmh: 35,
      delta_speed_kmh: 25,
      tilt_angle_deg: 92,
      anomaly_type: 'rollover',
      timestamp: Date.now(),
    };
    this.currentTelemetry = fakeTelemetry;
    this.triggerAlert('rollover', fakeTelemetry);
  }

  public getTelemetry(): KineticTelemetry {
    return { ...this.currentTelemetry };
  }
}

export const sentinelEngine = new SentinelEngine();
