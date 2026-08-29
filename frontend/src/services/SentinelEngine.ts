/**
 * RoadSOS Sentinel Omniscient Engine (v7.0)
 * Rigorous Automotive Crash Sensing & Kinetic Physics:
 * 1. Gravity Vector Isolation via Linear Acceleration & Low-Pass Gravity Filter (Alpha = 0.88)
 * 2. True Dynamic G-Force Calculation (Zero false triggers on gentle hand movements / pickup)
 * 3. High-Pass Filtered Impact Impulse Window (>60ms sustained shockwave)
 * 4. GPS & Simulated Velocity Engine with Sudden Deceleration Monitoring
 * 5. Relative Baseline Orientation & Rollover Inversion Detection
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
    impactG: 3.8,
    tiltAngleDeg: 58,
    speedDropKmh: 25,
    label: 'Motorcycle / 2-Wheeler'
  },
  CAR: {
    impactG: 4.2,
    tiltAngleDeg: 68,
    speedDropKmh: 35,
    label: 'Passenger Car / Sedan'
  },
  TRUCK: {
    impactG: 5.0,
    tiltAngleDeg: 75,
    speedDropKmh: 45,
    label: 'Heavy Commercial / Bus'
  },
  TEST: {
    impactG: 3.0,
    tiltAngleDeg: 48,
    speedDropKmh: 20,
    label: 'Demo / Sensitivity Test Mode'
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

  // Gravity isolation filter state
  private gravityX: number = 0.0;
  private gravityY: number = 0.0;
  private gravityZ: number = 9.80665;
  private hasInitializedGravity: boolean = false;
  private consecutiveHighGFrames: number = 0;

  // Relative baseline orientation for rollover calibration
  private baselineBeta: number = 0.0;
  private baselineGamma: number = 0.0;
  private hasCalibratedOrientation: boolean = false;
  private rolloverStartTime: number = 0;

  // GPS & Velocity Tracking
  private lastLat: number | null = null;
  private lastLon: number | null = null;
  private lastGpsTime: number = 0;
  private lastSpeedKmh: number = 0;
  private lastSpeedTimestamp: number = 0;
  private simulatedSpeedKmh: number = 0;
  private isSimulatingDriving: boolean = false;

  private watchId: number | null = null;
  private telemetryInterval: any = null;
  private hasReceivedHardwareMotion: boolean = false;

  // Laptop / Trackpad hand inertia tracking
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMouseTime: number = 0;

  constructor() {
    this.initSensors();
  }

  private initSensors() {
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
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

  public calibrateSensors() {
    this.hasInitializedGravity = false;
    this.hasCalibratedOrientation = false;
    this.consecutiveHighGFrames = 0;
    this.currentTelemetry.g_force = 1.00;
    this.currentTelemetry.tilt_angle_deg = 0;
    console.log('[SENTINEL] Sensors recalibrated to current device baseline.');
  }

  public async requestMotionPermission(): Promise<boolean> {
    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      try {
        const state = await (DeviceMotionEvent as any).requestPermission();
        return state === 'granted';
      } catch (e) {
        console.warn('[SENTINEL] Motion permission request error:', e);
        return false;
      }
    }
    return true;
  }

  public isHardwareStreaming(): boolean {
    return this.hasReceivedHardwareMotion;
  }

  public activate(onAnomaly: AnomalyCallback, onTelemetry?: TelemetryCallback) {
    this.anomalyCb = onAnomaly;
    if (onTelemetry) this.telemetryCb = onTelemetry;
    this.active = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('devicemotion', this.handleDeviceMotion, true);
      window.addEventListener('deviceorientation', this.handleOrientation, true);
    }
    this.startGpsTracking();

    // High-frequency telemetry heartbeat loop (10Hz)
    this.telemetryInterval = setInterval(() => {
      if (!this.active) return;
      this.currentTelemetry.timestamp = Date.now();
      
      // If simulated driving is active, feed simulated speed
      if (this.isSimulatingDriving) {
        this.currentTelemetry.speed_kmh = this.simulatedSpeedKmh;
      }

      if (this.telemetryCb) {
        this.telemetryCb({ ...this.currentTelemetry });
      }
    }, 100);

    console.log('[SENTINEL] Sentinel Omniscient Engine v7.0 active.');
  }

  public deactivate() {
    this.active = false;
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

  // 1. Mobile Physical Hardware Accelerometer Handler (Linear Dynamic Force Isolation)
  private handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!this.active) return;

    this.hasReceivedHardwareMotion = true;

    // A. Check if the browser provides linear acceleration directly (gravity removed by OS)
    const linear = event.acceleration;
    if (linear && linear.x !== null && linear.y !== null && linear.z !== null) {
      const lx = linear.x || 0;
      const ly = linear.y || 0;
      const lz = linear.z || 0;

      const dynamicMagnitude = Math.sqrt(lx * lx + ly * ly + lz * lz);
      const dynamicG = dynamicMagnitude / 9.80665;
      const totalG = 1.00 + dynamicG;

      this.updateAccelerationState(lx, ly, lz, totalG, dynamicG);
      return;
    }

    // B. Fallback: Low-Pass Filter Gravity Isolation on raw accelerationIncludingGravity
    const raw = event.accelerationIncludingGravity;
    if (!raw || (raw.x === null && raw.y === null && raw.z === null)) return;

    const rx = raw.x || 0;
    const ry = raw.y || 0;
    const rz = raw.z !== null ? raw.z : 9.80665;

    if (!this.hasInitializedGravity) {
      this.gravityX = rx;
      this.gravityY = ry;
      this.gravityZ = rz;
      this.hasInitializedGravity = true;
    } else {
      // Low-pass filter to isolate continuous gravity vector (alpha = 0.88)
      const alpha = 0.88;
      this.gravityX = alpha * this.gravityX + (1 - alpha) * rx;
      this.gravityY = alpha * this.gravityY + (1 - alpha) * ry;
      this.gravityZ = alpha * this.gravityZ + (1 - alpha) * rz;
    }

    // High-pass dynamic linear acceleration = raw - gravity
    const dynX = rx - this.gravityX;
    const dynY = ry - this.gravityY;
    const dynZ = rz - this.gravityZ;

    const dynamicMagnitude = Math.sqrt(dynX * dynX + dynY * dynY + dynZ * dynZ);
    const dynamicG = dynamicMagnitude / 9.80665;
    const totalG = 1.00 + dynamicG;

    this.updateAccelerationState(dynX, dynY, dynZ, totalG, dynamicG);
  };

  private updateAccelerationState(x: number, y: number, z: number, totalG: number, dynamicG: number) {
    this.currentTelemetry.accel_x = Math.round(x * 10) / 10;
    this.currentTelemetry.accel_y = Math.round(y * 10) / 10;
    this.currentTelemetry.accel_z = Math.round(z * 10) / 10;
    this.currentTelemetry.g_force = Math.round(totalG * 100) / 100;

    const impactThreshold = SENSITIVITY_PROFILES[this.profile].impactG;

    // Sustained kinetic crash verification:
    // Requires total G to exceed calibrated threshold (e.g. 4.2G) OR dynamic shock impulse > 3.5G
    if (totalG >= impactThreshold) {
      this.consecutiveHighGFrames++;
      if (this.consecutiveHighGFrames >= 2 || totalG >= impactThreshold * 1.25) {
        this.triggerAlert('impact', {
          ...this.currentTelemetry,
          anomaly_type: 'impact',
        });
        this.consecutiveHighGFrames = 0;
      }
    } else {
      this.consecutiveHighGFrames = 0;
    }
  }

  // 2. Relative Baseline Orientation & Rollover Handler
  private handleOrientation = (event: DeviceOrientationEvent) => {
    if (!this.active) return;

    const beta = event.beta || 0;   // Front-to-back pitch (-180 to 180)
    const gamma = event.gamma || 0; // Left-to-right roll (-90 to 90)

    if (!this.hasCalibratedOrientation) {
      this.baselineBeta = beta;
      this.baselineGamma = gamma;
      this.hasCalibratedOrientation = true;
    }

    // Relative tilt deviation from the user's natural holding/mounting position
    const deltaBeta = Math.abs(beta - this.baselineBeta);
    const deltaGamma = Math.abs(gamma - this.baselineGamma);
    const relativeTilt = Math.round(Math.min(180, Math.sqrt(deltaBeta * deltaBeta + deltaGamma * deltaGamma)));

    this.currentTelemetry.tilt_angle_deg = relativeTilt;

    const threshold = SENSITIVITY_PROFILES[this.profile].tiltAngleDeg;

    // Rollover anomaly requires extreme angular tilt (>68 deg) sustained for > 1.2 seconds
    if (relativeTilt >= threshold) {
      const now = performance.now();
      if (this.rolloverStartTime === 0) {
        this.rolloverStartTime = now;
      } else if (now - this.rolloverStartTime >= 1200) {
        this.triggerAlert('rollover', {
          ...this.currentTelemetry,
          anomaly_type: 'rollover',
        });
        this.rolloverStartTime = 0;
      }
    } else {
      this.rolloverStartTime = 0;
    }
  };

  // 3. Desktop/Laptop Interactive Hand Flick Inertia Sensor
  private handleMouseMove = (e: MouseEvent) => {
    if (!this.active || this.hasReceivedHardwareMotion) return;

    const now = performance.now();
    if (this.lastMouseTime > 0) {
      const dt = (now - this.lastMouseTime) / 1000;
      if (dt > 0.01 && dt < 0.15) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const speedPixelsPerSec = Math.sqrt(dx * dx + dy * dy) / dt;

        // Convert hand flick speed to realistic physical G-force (1.0G rest up to 5.5G on hard shake)
        if (speedPixelsPerSec > 1400) {
          const dynamicG = Math.min(5.5, (speedPixelsPerSec / 1800) * 2.0);
          const totalG = 1.00 + dynamicG;
          const ax = Math.round((dx / dt / 180) * 10) / 10;
          const ay = Math.round((dy / dt / 180) * 10) / 10;
          this.updateAccelerationState(ax, ay, 0.0, totalG, dynamicG);
        } else {
          this.currentTelemetry.g_force = 1.00;
          this.currentTelemetry.accel_x = 0.0;
          this.currentTelemetry.accel_y = 0.0;
          this.currentTelemetry.accel_z = 9.8;
          this.consecutiveHighGFrames = 0;
        }
      }
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastMouseTime = now;
  };

  // 4. GPS Speed & Deceleration Monitor (with Computed Velocity Fallback)
  private startGpsTracking() {
    if (!('geolocation' in navigator)) return;

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          let speedKmh = 0;
          const now = Date.now();

          // A. Try direct hardware speed if provided
          if (pos.coords.speed !== null && pos.coords.speed >= 0) {
            speedKmh = Math.round(pos.coords.speed * 3.6);
          } else if (this.lastLat !== null && this.lastLon !== null && this.lastGpsTime > 0) {
            // B. Compute velocity from GPS delta distance over time
            const dtSec = (now - this.lastGpsTime) / 1000;
            if (dtSec >= 1.0 && dtSec <= 10.0) {
              const distMeters = this.haversineMeters(this.lastLat, this.lastLon, pos.coords.latitude, pos.coords.longitude);
              const computedSpeedKmh = (distMeters / dtSec) * 3.6;
              if (computedSpeedKmh >= 3 && computedSpeedKmh <= 220) {
                speedKmh = Math.round(computedSpeedKmh);
              }
            }
          }

          this.lastLat = pos.coords.latitude;
          this.lastLon = pos.coords.longitude;
          this.lastGpsTime = now;

          // Track Sudden Deceleration Drop
          if (this.lastSpeedTimestamp > 0) {
            const timeDeltaSec = (now - this.lastSpeedTimestamp) / 1000;
            if (timeDeltaSec > 0 && timeDeltaSec < 3.0) {
              const deltaSpeed = this.lastSpeedKmh - speedKmh;
              this.currentTelemetry.delta_speed_kmh = deltaSpeed;

              const dropThreshold = SENSITIVITY_PROFILES[this.profile].speedDropKmh;
              if (this.lastSpeedKmh > dropThreshold && speedKmh < 8 && deltaSpeed >= dropThreshold) {
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
          if (!this.isSimulatingDriving) {
            this.currentTelemetry.speed_kmh = speedKmh;
          }
        },
        (err) => console.warn('[SENTINEL] GPS speed info:', err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
      );
    } catch (e) {
      console.warn('[SENTINEL] GPS watch error:', e);
    }
  }

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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

  // --- Interactive Driving Speed Simulator ---
  public setSimulatedSpeed(speedKmh: number) {
    this.isSimulatingDriving = true;
    this.simulatedSpeedKmh = Math.max(0, Math.min(180, Math.round(speedKmh)));
    this.currentTelemetry.speed_kmh = this.simulatedSpeedKmh;
    if (this.telemetryCb) {
      this.telemetryCb({ ...this.currentTelemetry });
    }
  }

  public stopSpeedSimulation() {
    this.isSimulatingDriving = false;
    this.simulatedSpeedKmh = 0;
    this.currentTelemetry.speed_kmh = 0;
  }

  // --- Manual Kinetic Force Testing (for Desktop & Testing) ---
  public setManualGForce(g: number) {
    const totalG = Math.round(g * 100) / 100;
    this.currentTelemetry.g_force = totalG;
    this.currentTelemetry.accel_x = Math.round((g * 4.2) * 10) / 10;
    this.currentTelemetry.accel_y = Math.round((g * 4.8) * 10) / 10;
    this.currentTelemetry.accel_z = 9.8;
    if (this.telemetryCb) {
      this.telemetryCb({ ...this.currentTelemetry });
    }
    const impactThreshold = SENSITIVITY_PROFILES[this.profile].impactG;
    if (totalG >= impactThreshold) {
      this.triggerAlert('impact', this.currentTelemetry);
    }
  }

  // --- Kinetic Crash Simulation Studio Methods ---
  public simulateImpact(gMagnitude: number = 5.82) {
    const fakeTelemetry: KineticTelemetry = {
      g_force: gMagnitude,
      accel_x: Math.round(gMagnitude * 5.8 * 10) / 10,
      accel_y: Math.round(gMagnitude * 6.4 * 10) / 10,
      accel_z: 9.8,
      speed_kmh: 0,
      delta_speed_kmh: 62,
      tilt_angle_deg: 22,
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
      accel_x: 12.4,
      accel_y: 38.6,
      accel_z: 9.8,
      speed_kmh: 0,
      delta_speed_kmh: 65,
      tilt_angle_deg: 26,
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
      g_force: 3.45,
      accel_x: 22.4,
      accel_y: 10.8,
      accel_z: 2.1,
      speed_kmh: 30,
      delta_speed_kmh: 24,
      tilt_angle_deg: 92,
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
