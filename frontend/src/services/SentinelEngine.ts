/**
 * RoadSOS Sentinel Omniscient Engine (v5.1)
 * High-frequency kinetic anomaly detection, real-time accelerometer monitoring,
 * and multi-tier crash physics simulation.
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

  private lastSpeedKmh: number = 0;
  private lastSpeedTimestamp: number = 0;
  private sensor: any = null;
  private watchId: number | null = null;
  private telemetryInterval: any = null;

  // Desktop interactive mouse/touch velocity tracking
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMouseTime: number = 0;
  private mouseVelocityG: number = 0;

  constructor() {
    this.initSensors();
  }

  private initSensors() {
    if ('LinearAccelerationSensor' in window) {
      try {
        this.sensor = new (window as any).LinearAccelerationSensor({ frequency: 60 });
        this.sensor.addEventListener('reading', () => this.handleLinearSensor());
      } catch (e) {
        console.warn('[SENTINEL] LinearAccelerationSensor fallback to devicemotion');
      }
    }
  }

  public async requestMotionPermission(): Promise<boolean> {
    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      try {
        const state = await (DeviceMotionEvent as any).requestPermission();
        return state === 'granted';
      } catch (e) {
        console.warn('[SENTINEL] DeviceMotion permission request rejected:', e);
        return false;
      }
    }
    return true;
  }

  public activate(onAnomaly: AnomalyCallback, onTelemetry?: TelemetryCallback) {
    this.anomalyCb = onAnomaly;
    if (onTelemetry) this.telemetryCb = onTelemetry;
    this.active = true;

    // 1. Hardware sensors
    if (this.sensor) {
      try {
        this.sensor.start();
      } catch (_) {}
    } else {
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
    }

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    this.startGpsTracking();

    // 2. High-frequency telemetry loop (10Hz)
    this.telemetryInterval = setInterval(() => {
      this.tickTelemetry();
    }, 100);

    console.log('[SENTINEL] Sentinel Omniscient Engine active.');
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
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('touchmove', this.handleTouchMove);

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

  private tickTelemetry() {
    if (!this.active) return;

    // Decay mouse kinetic energy smoothly
    if (this.mouseVelocityG > 0.01) {
      this.mouseVelocityG *= 0.85;
    } else {
      this.mouseVelocityG = 0;
    }

    // Add subtle ambient physical micro-oscillation (0.98G to 1.02G baseline gravity)
    const microJitter = (Math.sin(Date.now() / 400) * 0.02) + ((Math.random() - 0.5) * 0.01);
    
    // Only apply micro-jitter if not in simulated crash state
    if (!this.currentTelemetry.anomaly_type || this.currentTelemetry.g_force < 3.0) {
      const baseG = 1.00 + microJitter + this.mouseVelocityG;
      this.currentTelemetry.g_force = Math.max(0.5, Math.round(baseG * 100) / 100);
      this.currentTelemetry.accel_z = Math.round((9.8 + microJitter * 9.8) * 10) / 10;
    }

    this.currentTelemetry.timestamp = Date.now();

    if (this.telemetryCb) {
      this.telemetryCb({ ...this.currentTelemetry });
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    const now = Date.now();
    if (this.lastMouseTime > 0) {
      const dt = (now - this.lastMouseTime) / 1000;
      if (dt > 0 && dt < 0.2) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speedPxS = dist / dt;

        // Kinetic coupling: fast cursor movement induces simulated lateral G-force
        const addedG = Math.min(1.8, speedPxS / 1200);
        if (addedG > 0.1) {
          this.mouseVelocityG = Math.max(this.mouseVelocityG, addedG);
          this.currentTelemetry.accel_x = Math.round((dx / dt / 100) * 10) / 10;
          this.currentTelemetry.accel_y = Math.round((dy / dt / 100) * 10) / 10;
        }
      }
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastMouseTime = now;
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const now = Date.now();
      if (this.lastMouseTime > 0) {
        const dt = (now - this.lastMouseTime) / 1000;
        if (dt > 0 && dt < 0.2) {
          const dx = touch.clientX - this.lastMouseX;
          const dy = touch.clientY - this.lastMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speedPxS = dist / dt;
          const addedG = Math.min(2.2, speedPxS / 800);
          if (addedG > 0.15) {
            this.mouseVelocityG = Math.max(this.mouseVelocityG, addedG);
          }
        }
      }
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.lastMouseTime = now;
    }
  };

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
    const beta = Math.abs(event.beta || 0);
    const gamma = Math.abs(event.gamma || 0);
    const maxTilt = Math.max(beta, gamma);

    this.currentTelemetry.tilt_angle_deg = Math.round(maxTilt);

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

    // Severe Impact Threshold (> 4.5G)
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

              // Sudden stop / Crash
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
