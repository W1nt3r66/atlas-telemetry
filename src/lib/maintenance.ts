export function getTamlukWashIntervalDays(date = new Date()): {
  intervalDays: number;
  seasonLabel: string;
  rustTip: string;
} {
  const month = date.getMonth() + 1;

  if (month >= 6 && month <= 9) {
    return {
      intervalDays: 21,
      seasonLabel: 'Monsoon (Coastal Humid)',
      rustTip: 'Avoid frequent washes; dry door sills & wheel arches after rain to stop rust.',
    };
  }
  if (month >= 11 || month <= 2) {
    return {
      intervalDays: 25,
      seasonLabel: 'Winter Dry',
      rustTip: 'Use a dry microfiber duster for NH116 highway dust instead of water.',
    };
  }
  return {
    intervalDays: 30,
    seasonLabel: 'Summer Sea-Breeze',
    rustTip: 'High coastal humidity—keep washes to once a month and park under shade.',
  };
}

export function calculateMaintenanceStatus(vehicle: any, currentOdo: number) {
  const today = new Date();

  const lastWash = new Date(vehicle?.last_wash_date || today);
  const { intervalDays, seasonLabel, rustTip } = getTamlukWashIntervalDays(today);
  const daysSinceWash = Math.max(0, Math.floor((today.getTime() - lastWash.getTime()) / (1000 * 3600 * 24)));
  const washDaysLeft = intervalDays - daysSinceWash;

  const lastServiceDate = new Date(vehicle?.last_service_date || today);
  const daysSinceService = Math.max(0, Math.floor((today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24)));
  const serviceDaysLeft = (vehicle?.service_interval_days || 365) - daysSinceService;

  const kmSinceService = Math.max(0, currentOdo - (vehicle?.last_service_odo || 0));
  const serviceKmLeft = (vehicle?.service_interval_km || 10000) - kmSinceService;

  return {
    washDaysLeft,
    washInterval: intervalDays,
    seasonLabel,
    rustTip,
    serviceDaysLeft,
    serviceKmLeft,
    isWashDue: washDaysLeft <= 3,
    isServiceDue: serviceDaysLeft <= 15 || serviceKmLeft <= 500,
  };
}
