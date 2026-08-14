# Daikin Cloud Prometheus Exporter

A Prometheus exporter that collects data from Daikin Cloud API and exposes it as metrics for monitoring and alerting.

## 🏠 Overview

This application connects to the Daikin Cloud API to fetch real-time data from your Daikin HVAC devices and exposes it as Prometheus metrics. It's designed to work within the daily API rate limits (200 calls/day) and provides comprehensive monitoring of temperature, humidity, power consumption, and device status.

## ✨ Features

- **Real-time HVAC monitoring** - Temperature, humidity, and device status
- **Energy consumption tracking** - Daily, weekly, monthly, and yearly power usage
- **Prometheus metrics** - Standard format for integration with monitoring systems
- **Rate limit compliant** - Respects Daikin's 200 API calls per day limit
- **Data caching** - Intelligent caching to minimize API calls and survive restarts
- **Health checks** - Built-in endpoint for service monitoring
- **Graceful shutdown** - Proper cleanup on service termination
- **Configurable paths** - Flexible file locations for certificates, cache, and tokens
- **Docker support** - Ready for containerized deployment

## 📊 Exported Metrics

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `daikin_room_temperature_celsius` | Gauge | Room temperature in Celsius | device_id, device_model, device_name, control_id |
| `daikin_room_humidity_percent` | Gauge | Room humidity percentage | device_id, device_model, device_name, control_id |
| `daikin_outdoor_temperature_celsius` | Gauge | Outdoor temperature in Celsius | device_id, device_model, device_name, control_id |
| `daikin_target_temperature_celsius` | Gauge | Target temperature setting in Celsius | device_id, device_model, device_name, control_id, mode |
| `daikin_device_online` | Gauge | Device online status (1=online, 0=offline) | device_id, device_model |
| `daikin_device_power_on` | Gauge | Device power status (1=on, 0=off) | device_id, device_model, device_name, control_id, mode |
| `daikin_operation_mode` | Gauge | Active operation mode (0=auto, 1=dry, 2=cooling, 3=heating, 4=fanOnly) | device_id, device_model, device_name, control_id, operation_mode |
| `daikin_holiday_mode` | Gauge | Holiday mode status (1=on, 0=off) | device_id, device_model, device_name, control_id |
| `daikin_error_code` | Gauge | Device error code (1 = current code) | device_id, device_model, device_name, control_id, error_code |
| `daikin_powerful_mode` | Gauge | Powerful mode status (1=on, 0=off) | device_id, device_model, device_name, control_id |
| `daikin_error_state` | Gauge | Device error state (1=error, 0=no error) | device_id, device_model, device_name, control_id |
| `daikin_warning_state` | Gauge | Device warning state (1=warning, 0=no warning) | device_id, device_model, device_name, control_id |
| `daikin_caution_state` | Gauge | Device caution state (1=caution, 0=no caution) | device_id, device_model, device_name, control_id |
| `daikin_fan_speed` | Gauge | Active mode fan speed (0=auto, 1=fixed, 2=quiet) | device_id, device_model, device_name, control_id, mode, fan_speed |
| `daikin_fan_speed_current_mode` | Gauge | Active mode fan speed setting (0=auto, 1=fixed, 2=quiet) | device_id, device_model, device_name, control_id, mode, current_mode |
| `daikin_fan_speed_fixed_level` | Gauge | Active mode fan speed fixed level (numeric value) | device_id, device_model, device_name, control_id, mode |
| `daikin_fan_direction` | Gauge | Active mode fan direction (0=stop, 1=swing) | device_id, device_model, device_name, control_id, mode, orientation, direction |
| `daikin_fan_direction_horizontal` | Gauge | Active mode horizontal fan direction (0=stop, 1=swing) | device_id, device_model, device_name, control_id, mode, direction |
| `daikin_fan_direction_vertical` | Gauge | Active mode vertical fan direction (0=stop, 1=swing) | device_id, device_model, device_name, control_id, mode, direction |
| `daikin_schedule_enabled` | Gauge | Schedule enabled status (1=enabled, 0=disabled) | device_id, device_model, device_name, control_id, schedule_mode |
| `daikin_schedule_current` | Gauge | Current active schedule (1 = current schedule) | device_id, device_model, device_name, control_id, schedule_mode, schedule_id |
| `daikin_gateway_info` | Gauge | Gateway information (always 1) | device_id, device_model, gateway_name, gateway_id, ip_address, mac_address, firmware_version, model_info |
| `daikin_gateway_firmware_update_supported` | Gauge | Gateway firmware update supported status (1=supported, 0=not supported) | device_id, device_model, gateway_name, gateway_id |
| `daikin_indoor_unit_info` | Gauge | Indoor unit information (always 1) | device_id, device_model, unit_name, unit_id, software_version |
| `daikin_device_last_updated_timestamp_seconds` | Gauge | Timestamp of last update from Daikin Cloud in seconds since Unix epoch | device_id, device_model |
| `daikin_consumption_heating_hour_kwh` | Gauge | Heating energy consumption in current hour in kWh (data is a 2 hour average) | device_id, device_model, device_name, control_id |
| `daikin_consumption_heating_today_kwh` | Gauge | Heating energy consumption today in kWh | device_id, device_model, device_name, control_id |
| `daikin_consumption_heating_week_kwh` | Gauge | Heating energy consumption this week in kWh | device_id, device_model, device_name, control_id |
| `daikin_consumption_heating_month_kwh` | Gauge | Heating energy consumption this month in kWh | device_id, device_model, device_name, control_id |
| `daikin_consumption_heating_year_kwh` | Gauge | Heating energy consumption this year in kWh | device_id, device_model, device_name, control_id |
| `daikin_consumption_cooling_hour_kwh` | Gauge | Cooling energy consumption in current hour in kWh (data is a 2 hour average) | device_id, device_model, device_name, control_id |
| `daikin_consumption_cooling_today_kwh` | Gauge | Cooling energy consumption today in kWh | device_id, device_model, device_name, control_id |
| `daikin_consumption_cooling_week_kwh` | Gauge | Cooling energy consumption this week in kWh | device_id, device_model, device_name, control_id |
| `daikin_consumption_cooling_month_kwh` | Gauge | Cooling energy consumption this month in kWh | device_id, device_model, device_name, control_id |
| `daikin_consumption_cooling_year_kwh` | Gauge | Cooling energy consumption this year in kWh | device_id, device_model, device_name, control_id |
| `daikin_data_updates_total` | Counter | Total number of API calls made | status |

## 🛠️ Tech Stack

- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript development
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[Express](https://expressjs.com/)** - Web framework for HTTP endpoints
- **[prom-client](https://github.com/siimon/prom-client)** - Prometheus metrics library
- **[daikin-controller-cloud](https://github.com/Apollon77/daikin-controller-cloud)** - Daikin Cloud API client
- **[tsx](https://github.com/esbuild-kit/tsx)** - TypeScript execution environment

## 🚀 Quick Start

### Prerequisites

1. **Daikin Developer Account**: Register at [developer.cloud.daikineurope.com](https://developer.cloud.daikineurope.com)
2. **OIDC Credentials**: Create an application and get your client ID and secret
3. **Node.js**: Version 18 or higher
4. **pnpm**: Package manager (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/emmekappa/daikin_cloud_exporter.git
cd daikin_cloud_exporter

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Daikin OIDC credentials
```

### Configuration

Edit the `.env` file with your credentials:

```env
# Daikin OIDC Client Credentials
OIDC_CLIENT_ID=your_daikin_oidc_client_id_here
OIDC_CLIENT_SECRET=your_daikin_oidc_client_secret_here

# Monitoring Configuration (8 minutes = 480 seconds)
# This respects the 200 API calls/day limit (~180 calls + 20 for testing)
UPDATE_INTERVAL=480

# Prometheus Exporter Port
PROMETHEUS_PORT=3001

# File Paths Configuration
CERT_PATH=./cert
CACHE_FILE_PATH=./daikin-cache.json
TOKEN_FILE_PATH=./daikin-controller-cloud-tokenset

# OIDC Callback Server
# OIDC_CALLBACK_SERVER_PORT=59748
# OIDC_CALLBACK_SERVER_EXTERNAL_ADDRESS=daikin.local
```

### Running the Application

**Development mode:**
```bash
pnpm start
# or
pnpm run run
```

**Production (compiled):**
```bash
pnpm run build
pnpm start
```

**Docker:**
```bash
# Build image
pnpm run docker:build

# Run container
pnpm run docker:run
```

## 📡 API Endpoints

- **Metrics**: `http://localhost:3001/metrics` - Prometheus metrics endpoint
- **Health Check**: `http://localhost:3001/health` - Service health status

## 🔧 Project Structure

```
src/
├── index.ts                      # Application entry point
├── daikin_monitoring_service.ts  # Main service orchestrator
├── daikin_prometheus_exporter.ts # Prometheus metrics exporter
├── daikin_data_parser.ts         # Daikin API response parser
└── daikin_integration_example.ts # Usage example (legacy)

cert/                             # SSL certificates for OIDC flow
├── cert.key                      # Private key
├── cert.pem                      # Certificate
└── generate.sh                   # Certificate generation script
```

## ⚙️ Configuration Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OIDC_CLIENT_ID` | - | Daikin OIDC Client ID (required) |
| `OIDC_CLIENT_SECRET` | - | Daikin OIDC Client Secret (required) |
| `UPDATE_INTERVAL` | 480 | Data fetch interval in seconds |
| `PROMETHEUS_PORT` | 3001 | Port for Prometheus metrics server |
| `ENABLE_NODE_METRICS` | `false` | Set to `true` to enable the default Node.js runtime metrics (`nodejs_*`) |
| `CERT_PATH` | `./cert` | Directory containing SSL certificates |
| `CACHE_FILE_PATH` | `./daikin-cache.json` | File path for data cache |
| `TOKEN_FILE_PATH` | `./daikin-controller-cloud-tokenset` | File path for OIDC tokens |
| `OIDC_CALLBACK_SERVER_PORT` | 59748 | Local port for the OIDC callback server |
| `OIDC_CALLBACK_SERVER_EXTERNAL_ADDRESS` | - | Externally reachable address (domain/IP) of the OIDC callback server; required when behind NAT, a reverse proxy, or Docker |

## 🐳 Docker Deployment

The application includes Docker support:

```bash
# Build the image
docker build -t daikin-prometheus-exporter .

# Run with environment file
docker run -p 3001:3001 --env-file .env daikin-prometheus-exporter

# Or with environment variables
docker run -p 3001:3001 \
  -e OIDC_CLIENT_ID=your_client_id \
  -e OIDC_CLIENT_SECRET=your_secret \
  daikin-prometheus-exporter
```

## 📊 Monitoring Setup

### Prometheus Configuration

Add this job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'daikin-exporter'
    static_configs:
      - targets: ['localhost:3001']
    scrape_interval: 60s
```

### Grafana Dashboard

Create dashboards using the exported metrics to visualize:
- Temperature trends over time
- Energy consumption patterns
- Device status and uptime
- HVAC efficiency metrics

## 🚨 Rate Limiting

Daikin Cloud API has a limit of **200 calls per day**. The default configuration uses 8-minute intervals (480 seconds) which results in approximately 180 automatic calls per day, leaving 20 calls for testing and manual operations.

To adjust the frequency, modify the `UPDATE_INTERVAL` environment variable:
- More frequent: Lower interval (use sparingly)
- Less frequent: Higher interval (more API calls available for testing)

## 💾 Data Caching

The application implements intelligent data caching to minimize API calls:

- **Automatic caching**: API responses are cached locally
- **Restart resilience**: Cached data is used on restart if still valid
- **Configurable location**: Cache file location via `CACHE_FILE_PATH`
- **TTL-based**: Cache respects the `UPDATE_INTERVAL` setting
- **Transparent**: No configuration needed, works automatically

This ensures that frequent restarts don't consume your daily API quota.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Daikin Developer Portal](https://developer.cloud.daikineurope.com)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)
- [daikin-controller-cloud Library](https://github.com/Apollon77/daikin-controller-cloud)

## 🆘 Support

If you encounter issues:

1. Check that your OIDC credentials are correct
2. Verify SSL certificates are present in the configured `CERT_PATH` directory
3. Ensure you're within the API rate limits
4. Check the application logs for detailed error messages
5. Verify file permissions for cache and token file locations

For bugs and feature requests, please open an issue on GitHub.
