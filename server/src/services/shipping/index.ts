import { ShippingProvider } from "./types";
import { SimulatedShippingProvider } from "./simulated";
import { EasyPostShippingProvider } from "./easypost";

const apiKey = process.env.EASYPOST_API_KEY?.trim();
const simulated = new SimulatedShippingProvider();
const real = apiKey ? new EasyPostShippingProvider(apiKey) : null;

// Wraps the real EasyPost provider so any failure (bad key, network issue,
// EasyPost outage) transparently falls back to the local simulator rather
// than breaking checkout.
const provider: ShippingProvider = {
  async getRates(from, to, parcel) {
    if (real) {
      try {
        return await real.getRates(from, to, parcel);
      } catch (err) {
        console.warn("[shipping] EasyPost getRates failed, falling back to simulated carrier:", (err as Error).message);
      }
    }
    return simulated.getRates(from, to, parcel);
  },
  async buyLabel(shipmentId, rateId) {
    if (real && !shipmentId.startsWith("sim_")) {
      try {
        return await real.buyLabel(shipmentId, rateId);
      } catch (err) {
        console.warn("[shipping] EasyPost buyLabel failed, falling back to simulated carrier:", (err as Error).message);
      }
    }
    return simulated.buyLabel(shipmentId, rateId);
  },
  async trackShipment(trackingCode) {
    if (real && !trackingCode.startsWith("SIM")) {
      try {
        return await real.trackShipment(trackingCode);
      } catch (err) {
        console.warn("[shipping] EasyPost trackShipment failed, falling back to simulated carrier:", (err as Error).message);
      }
    }
    return simulated.trackShipment(trackingCode);
  },
};

export default provider;
export const shippingMode = apiKey ? "easypost" : "simulated";
