import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { GrowattPV } from './platformAccessory';
export class HomebridgeGrottInfluxPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  discoverDevices() {
    const devices = [
      {
        id: 'pvpowerout' + this.config['model'] + this.config['serial'],
        displayName: 'PV Output W',
      },
    ];

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of devices) {
      const uuid = this.api.hap.uuid.generate(device.id);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new GrowattPV(this, existingAccessory, this.log, this.config);
      } else {
        this.log.info('Adding new accessory:', device.displayName);
        const accessory = new this.api.platformAccessory(device.displayName, uuid);
        accessory.context.device = device;
        new GrowattPV(this, accessory, this.log, this.config);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}