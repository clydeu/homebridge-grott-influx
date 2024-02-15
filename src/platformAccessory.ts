import { Service, PlatformAccessory, Logger, PlatformConfig } from 'homebridge';
import { HomebridgeGrottInfluxPlatform } from './platform';
import { MqttService } from './mqttService';
import { InfluxDbService } from './influxdbService';

const LIGHT_SENSOR_MIN_VALUE = 0.0001;
const LIGHT_BULB_MIN_BRIGHTNESS = 0;
// const LIGHT_SENSOR_MAX_VALUE = 100000;

export class GrowattPV {
  private lightSensorService: Service;
  private lightbulbService: Service;
  private onValue = false;
  private brightnessValue: number = LIGHT_BULB_MIN_BRIGHTNESS;
  private luxValue: number = LIGHT_SENSOR_MIN_VALUE;
  private maxPvCapacity: number;
  private dataMode: string;

  constructor(
    private readonly platform: HomebridgeGrottInfluxPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly log: Logger,
    private readonly config: PlatformConfig,
  ) {
    this.maxPvCapacity = this.config['maxPvCapacity'] || 1000;
    this.dataMode = this.config['dataMode'];
    if (!this.maxPvCapacity){
      this.log.error('Make sure to specify Max PV Capacity');
      throw new Error('maxPvCapacity not defined');
    }
    this.log.debug(`maxPvCapacity: ${this.maxPvCapacity}`);

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Growatt')
      .setCharacteristic(this.platform.Characteristic.Model, this.config['model'])
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.config['serial']);

    this.lightSensorService = this.accessory.getService(this.platform.Service.LightSensor) ||
                    this.accessory.addService(this.platform.Service.LightSensor);
    this.lightbulbService = this.accessory.getService(this.platform.Service.Lightbulb) ||
                    this.accessory.addService(this.platform.Service.Lightbulb);

    this.lightSensorService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName + ' Sensor');
    this.lightbulbService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.displayName + ' Light');

    this.lightbulbService
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(() => this.onValue);

    this.lightbulbService
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .onGet(() => (this.brightnessValue > LIGHT_BULB_MIN_BRIGHTNESS) ? this.brightnessValue : LIGHT_BULB_MIN_BRIGHTNESS);

    this.lightSensorService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(() => (this.luxValue > LIGHT_SENSOR_MIN_VALUE) ? this.luxValue : LIGHT_SENSOR_MIN_VALUE);

    this.log.debug(`mode: ${config['dataMode']}`);
    if (config['dataMode'] === 'mqtt') {
      new MqttService(this.updateValue.bind(this), this.log, config['mqtt']);
    } else if (config['dataMode'] === 'influxdb') {
      new InfluxDbService(this.updateValue.bind(this), this.log, config['influxdb']);
    } else {
      throw new Error('Invalid mode');
    }
  }

  updateValue(value: number) {
    const pvValue = value/10;
    const brightness = Math.min((pvValue / this.maxPvCapacity) * 100, 100);
    if (brightness >= 1.0){
      this.brightnessValue = brightness;
      this.onValue = true;
      this.luxValue = pvValue;
    } else{
      this.brightnessValue = LIGHT_BULB_MIN_BRIGHTNESS;
      this.onValue = false;
      this.luxValue = LIGHT_SENSOR_MIN_VALUE;
    }
    

    this.lightbulbService
      .getCharacteristic(this.platform.Characteristic.On)
      .updateValue(this.onValue);

    this.lightbulbService
      .getCharacteristic(this.platform.Characteristic.Brightness)
      .updateValue(this.brightnessValue);

    this.lightSensorService
      .getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .updateValue(this.luxValue);
  }
}