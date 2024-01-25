import { MqttClient, connect } from 'mqtt';
import { Logger } from 'homebridge';

type GrowattJson = {
  pvpowerout: number;
};

type config = {
  url: string;
  topic: string;
};

export class MqttService{
  private readonly client: MqttClient;
  constructor(
    private readonly updateValue: (value: number) => void,
    private readonly log: Logger,
    private readonly config: config,
  ) {
    if (!config.topic || !config.url){
      this.log.error('MQTT: Make sure to specify all config for this mode');
      throw new Error('MQTT: Invlid Config');
    }
    this.client = connect(config.url);
    this.client.on('connect', () =>{
      this.client.subscribe(config.topic, (err) => {
        if (err){
          this.log.error('MQTT subscription failed.');
          throw err;
        } else {
          this.log.info(`MQTT: Subscribed topic "${config.topic}" to broker "${config.url}".`);
        }
      });
    });


    this.client.on('message', (topic, message) => {
      const json: GrowattJson = JSON.parse(message.toString()).values;
      this.log.info(`MQTT: Received new value - ${json.pvpowerout}.`);
      this.updateValue(json.pvpowerout);
    });
  }
}