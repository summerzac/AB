export interface ShippingAddressInput {
  name: string;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
}

export interface ParcelInput {
  weightOz: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  deliveryDays: number | null;
}

export interface RateQuote {
  shipmentId: string;
  simulated: boolean;
  rates: ShippingRate[];
}

export interface PurchasedLabel {
  shipmentId: string;
  rateId: string;
  carrier: string;
  service: string;
  rateAmount: number;
  trackingCode: string;
  trackingUrl: string;
  labelUrl: string;
  simulated: boolean;
}

export interface ShippingProvider {
  getRates(from: ShippingAddressInput, to: ShippingAddressInput, parcel: ParcelInput): Promise<RateQuote>;
  buyLabel(shipmentId: string, rateId: string): Promise<PurchasedLabel>;
  trackShipment(trackingCode: string): Promise<{ status: string }>;
}
