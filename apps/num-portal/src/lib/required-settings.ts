// Settings that must exist for this version to be healthy.
// Scenario S5 (configuration change) adds a name here, so the health check fails until
// the new setting is in place.
export const REQUIRED_SETTINGS: string[] = ['DATABASE_URL'];

export const missingSettings = () => REQUIRED_SETTINGS.filter((name) => !process.env[name]);
