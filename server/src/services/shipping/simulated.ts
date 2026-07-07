import crypto from "crypto";
import {
  ParcelInput,
  PurchasedLabel,
  RateQuote,
  ShippingAddressInput,
  ShippingProvider,
} from "./types";

// In-memory registry of quoted shipments so buyLabel can look up what was quoted.
const quotedShipments = new Map<
  string,
  { from: ShippingAddressInput; to: ShippingAddressInput; parcel: ParcelInput; rates: RateQuote["rates"] }
>();

const CARRIERS: Array<{ carrier: string; service: string; baseRate: number; days: number }> = [
  { carrier: "USPS", service: "Priority", baseRate: 8.5, days: 3 },
  { carrier: "UPS", service: "Ground", baseRate: 11.25, days: 4 },
  { carrier: "FedEx", service: "2Day", baseRate: 22.0, days: 2 },
];

function estimateDistanceFactor(from: ShippingAddressInput, to: ShippingAddressInput): number {
  if (from.country !== to.country) return 2.5;
  if (from.state === to.state) return 0.85;
  return 1;
}

export class SimulatedShippingProvider implements ShippingProvider {
  async getRates(from: ShippingAddressInput, to: ShippingAddressInput, parcel: ParcelInput): Promise<RateQuote> {
    const shipmentId = `sim_shp_${crypto.randomUUID()}`;
    const distanceFactor = estimateDistanceFactor(from, to);
    const weightFactor = Math.max(parcel.weightOz / 16, 0.5);

    const rates = CARRIERS.map((c) => ({
      id: `sim_rate_${crypto.randomUUID()}`,
      carrier: c.carrier,
      service: c.service,
      rate: Number((c.baseRate * distanceFactor * weightFactor).toFixed(2)),
      currency: "USD",
      deliveryDays: c.days,
    }));

    quotedShipments.set(shipmentId, { from, to, parcel, rates });
    return { shipmentId, simulated: true, rates };
  }

  async buyLabel(shipmentId: string, rateId: string): Promise<PurchasedLabel> {
    const quoted = quotedShipments.get(shipmentId);
    if (!quoted) throw new Error("Unknown simulated shipment");
    const rate = quoted.rates.find((r) => r.id === rateId);
    if (!rate) throw new Error("Unknown simulated rate");

    const trackingCode = `SIM${crypto.randomInt(10 ** 11, 10 ** 12)}`;
    return {
      shipmentId,
      rateId,
      carrier: rate.carrier,
      service: rate.service,
      rateAmount: rate.rate,
      trackingCode,
      trackingUrl: `https://example.com/track/${trackingCode}`,
      labelUrl: `https://example.com/labels/${shipmentId}.pdf`,
      simulated: true,
    };
  }

  async trackShipment(_trackingCode: string): Promise<{ status: string }> {
    const stages = ["pre_transit", "in_transit", "out_for_delivery", "delivered"];
    return { status: stages[Math.floor(Math.random() * stages.length)] };
  }
}
