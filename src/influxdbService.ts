import { Logger } from 'homebridge';
import { InfluxDB, QueryApi } from '@influxdata/influxdb-client';

type InfluxData = {
  result: string;
  table: number;
  _start: string;
  _stop: string;
  _time: string;
  _value: number;
  _field: string;
  _measurement: string;
};

type config = {
  url: string;
  apiKey: string;
  org: string;
  bucket: string;
  measurement: string;
  pollInterval: number;
};

export class InfluxDbService{
  private queryApi: QueryApi;
  private pollInterval: number;
  constructor(
    private readonly updateValue: (value: number) => void,
    private readonly log: Logger,
    private readonly config: config,
  ) {
    this.pollInterval = config['pollInterval'] || 5;
    if (!this.config.url || !this.config.apiKey || !this.config.org ||
        !this.config.bucket || !this.config.measurement || !this.pollInterval){
      this.log.error('InfluxDB: Make sure to specify all config for this mode');
      throw new Error('InfluxDB: Invlid Config');
    }
    this.log.debug(`InfluxDB: url: ${this.config.url},apiKey:${this.config.apiKey},org:${this.config.org},bucket: ${this.config.bucket},
      measurement: ${this.config.measurement},pollInterval: ${this.pollInterval}`);
    this.queryApi = new InfluxDB({url: this.config.url, token: this.config.apiKey}).getQueryApi(this.config.org);

    setInterval(async () => {
      await this.scheduledUpdate();
    }, this.pollInterval * 1000);

    this.scheduledUpdate();
  }

  async scheduledUpdate() {
    const data = await this.QueryData();
    if (data !== null) {
      this.updateValue(data._value);
      this.log.info(`InfluxDB: Fetched new value - ${data._value}.`);
    } else {
      this.log.error('InfluxDB: Error fetching value');
    }
  }

  async QueryData(): Promise<InfluxData | null>{
    const start = new Date();
    start.setHours(start.getHours(), start.getMinutes() - 10, 0, 0);
    const end = new Date();
    const fluxQuery = `from(bucket: "${this.config.bucket}")
        |> range(start: ${start.toISOString()}, stop: ${end.toISOString()})
        |> filter(fn: (r) => r["_measurement"] == "${this.config.measurement}")
        |> filter(fn: (r) => r["_field"] == "pvpowerout")
        |> last()`;

    const result = await this.queryApi.collectRows(fluxQuery);
    if (result.length > 0) {
      return result[0] as InfluxData;
    }

    return null;
  }
}