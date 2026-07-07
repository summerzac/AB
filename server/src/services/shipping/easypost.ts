// @ts-ignore - no bundled types for @easypost/api
import EasyPostClient from "@easypost/api";
import {
  ParcelInput,
  PurchasedLabel,
  RateQuote,
  ShippingAddressInput,
  ShippingProvider,
} from "./types";

function toEasyPostAddress(addr: ShippingAddressInput) {
  return {
    name: addr.name,
    street1: addr.street1,
    street2: addr.street2 || undefined,
    city: addr.city,
    state: addr.state,
    zip: addr.zip,
    country: addr.country,
    phone: addr.phone || undefined,
  };
}

export class EasyPostShippingProvider implements ShippingProvider {
  private client: any;

  constructor(apiKey: string) {
    this.client = new EasyPostClient(apiKey);
  }

  async getRates(from: ShippingAddressInput, to: ShippingAddressInput, parcel: ParcelInput): Promise<RateQuote> {
    const shipment = await this.client.Shipment.create({
      from_address: toEasyPostAddress(from),
      to_address: toEasyPostAddress(to),
      parcel: {
        weight: parcel.weightOz,
        length: parcel.lengthIn,
        width: parcel.widthIn,
        height: parcel.heightIn,
      },
    });

    const rates = (shipment.rates || []).map((r: any) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      rate: Number(r.rate),
      currency: r.currency || "USD",
      deliveryDays: r.delivery_days ?? null,
    }));

    return { shipmentId: shipment.id, simulated: false, rates };
  }

  async buyLabel(shipmentId: string, rateId: string): Promise<PurchasedLabel> {
    const bought = await this.client.Shipment.buy(shipmentId, { id: rateId });
    const rate = bought.selected_rate;
    return {
      shipmentId: bought.id,
      rateId: rate.id,
      carrier: rate.carrier,
      service: rate.service,
      rateAmount: Number(rate.rate),
      trackingCode: bought.tracking_code,
      trackingUrl: bought.tracker?.public_url || "",
      labelUrl: bought.postage_label?.label_url || "",
      simulated: false,
    };
  }

  async trackShipment(trackingCode: string): Promise<{ status: string }> {
    const tracker = await this.client.Tracker.create({ tracking_code: trackingCode });
    return { status: tracker.status };
  }
}
