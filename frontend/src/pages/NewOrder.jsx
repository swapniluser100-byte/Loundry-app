import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { t, ITEM_KEYS, SERVICE_TYPES } from "../i18n";

const STEP_LOOKUP = 1;
const STEP_NEW_CUSTOMER = 2;
const STEP_ITEMS = 3;
const STEP_DONE = 4;

export default function NewOrder() {
  const [step, setStep] = useState(STEP_LOOKUP);

  // Step 1: phone lookup
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Customer (found or newly created)
  const [customer, setCustomer] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Step 3: items + service
  const [items, setItems] = useState(Object.fromEntries(ITEM_KEYS.map((k) => [k, 0])));
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [rateCard, setRateCard] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    api
      .getRateCard()
      .then((data) => setRateCard(data.rate_card))
      .catch(() => setRateCard([]));
  }, []);

  const estimatedAmount = useMemo(() => {
    if (!rateCard.length) return 0;
    let total = 0;
    for (const [itemName, qty] of Object.entries(items)) {
      if (!qty) continue;
      const rate = rateCard.find((r) => r.item_name === itemName && r.service_type === serviceType);
      if (rate) total += rate.price * qty;
    }
    return total;
  }, [items, serviceType, rateCard]);

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setSearchError("10 ankyacha mobile number takaa");
      return;
    }
    setSearching(true);
    try {
      const data = await api.findCustomer(digits);
      if (data.found) {
        setCustomer(data.customer);
        setStep(STEP_ITEMS);
      } else {
        setName("");
        setEmail("");
        setArea("");
        setLandmark("");
        setStep(STEP_NEW_CUSTOMER);
      }
    } catch (err) {
      setSearchError(err.message || t.errorGeneric);
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveCustomer(e) {
    e.preventDefault();
    setSavingCustomer(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const data = await api.createCustomer({ name, phone: digits, email, area, landmark });
      setCustomer(data.customer);
      setStep(STEP_ITEMS);
    } catch (err) {
      alert(err.message || t.errorGeneric);
    } finally {
      setSavingCustomer(false);
    }
  }

  function changeItem(key, delta) {
    setItems((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  }

  async function handleCreateOrder() {
    const totalItems = Object.values(items).reduce((a, b) => a + b, 0);
    if (totalItems <= 0) {
      setCreateError(t.atLeastOneItem);
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      const data = await api.createOrder({
        customer_id: customer.id,
        items,
        service_type: serviceType,
      });
      setCreatedOrder(data.order);
      setStep(STEP_DONE);
    } catch (err) {
      setCreateError(err.message || t.errorGeneric);
    } finally {
      setCreating(false);
    }
  }

  function resetAll() {
    setStep(STEP_LOOKUP);
    setPhone("");
    setCustomer(null);
    setItems(Object.fromEntries(ITEM_KEYS.map((k) => [k, 0])));
    setServiceType(SERVICE_TYPES[0]);
    setCreatedOrder(null);
    setCreateError("");
  }

  return (
    <div className="px-4 pt-6 pb-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t.newOrder}</h1>

      {step === STEP_LOOKUP && (
        <form onSubmit={handleSearch} className="card space-y-4">
          <label className="block text-sm font-medium text-gray-700">{t.mobileNumber}</label>
          <input
            className="input-field"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder={t.mobileNumberPlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            required
          />
          {searchError && <p className="text-red-600 text-sm">{searchError}</p>}
          <button type="submit" className="btn-primary w-full" disabled={searching}>
            {searching ? t.searching : t.search}
          </button>
        </form>
      )}

      {step === STEP_NEW_CUSTOMER && (
        <form onSubmit={handleSaveCustomer} className="card space-y-4">
          <p className="text-sm font-semibold text-brand">{t.customerNotFound}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.customerName}</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.area}</label>
            <input
              className="input-field"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={t.areaPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.landmark}</label>
            <input
              className="input-field"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder={t.landmarkPlaceholder}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={savingCustomer}>
            {savingCustomer ? t.searching : t.saveAndContinue}
          </button>
        </form>
      )}

      {step === STEP_ITEMS && customer && (
        <div className="space-y-4">
          <div className="card">
            <p className="font-semibold text-gray-900">{customer.name}</p>
            <p className="text-sm text-gray-500">{customer.phone} · {customer.email}</p>
            {customer.area && (
              <p className="text-sm text-gray-500">
                {customer.area}
                {customer.landmark ? ` · ${customer.landmark}` : ""}
              </p>
            )}
          </div>

          <div className="card space-y-3">
            <p className="font-semibold text-gray-900">{t.clothDetails}</p>
            {ITEM_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-700">{t[key]}</span>
                <div className="flex items-center gap-3">
                  <button type="button" className="stepper-btn" onClick={() => changeItem(key, -1)}>
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{items[key]}</span>
                  <button type="button" className="stepper-btn" onClick={() => changeItem(key, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card space-y-2">
            <p className="font-semibold text-gray-900">{t.serviceType}</p>
            <div className="flex gap-2">
              {SERVICE_TYPES.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => setServiceType(service)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border ${
                    serviceType === service ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {service === "Wash" ? t.wash : service === "Iron" ? t.iron : t.dryClean}
                </button>
              ))}
            </div>
          </div>

          <div className="card flex items-center justify-between">
            <span className="text-gray-600">{t.estimatedAmount}</span>
            <span className="text-xl font-bold text-gray-900">₹{estimatedAmount}</span>
          </div>

          {createError && <p className="text-red-600 text-sm">{createError}</p>}

          <button className="btn-primary w-full" onClick={handleCreateOrder} disabled={creating}>
            {creating ? t.creatingOrder : t.createOrder}
          </button>
        </div>
      )}

      {step === STEP_DONE && createdOrder && (
        <div className="card text-center space-y-4">
          <div className="text-5xl">✅</div>
          <p className="text-lg font-bold text-gray-900">{t.orderCreated}</p>
          <div>
            <p className="text-sm text-gray-500">{t.orderId}</p>
            <p className="text-2xl font-mono font-bold text-brand">{createdOrder.order_number}</p>
          </div>

          {createdOrder.qr_code_url && (
            <div>
              <img
                src={createdOrder.qr_code_url}
                alt="Order QR"
                className="w-48 h-48 mx-auto border border-gray-200 rounded-xl p-2"
              />
              <p className="text-xs text-gray-500 mt-2">{t.showQrToCustomer}</p>
            </div>
          )}

          <p className="text-sm text-green-700 font-medium">✓ {t.emailSent}</p>

          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={resetAll}>
              {t.createAnother}
            </button>
            <a href="/" className="btn-primary flex-1">
              {t.backToDashboard}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
