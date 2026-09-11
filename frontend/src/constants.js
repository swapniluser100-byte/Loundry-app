// App-wide data constants. These are business/data values (matched exactly
// against what the backend expects in rate_card.item_name / service_type /
// orders.status), not language/translation strings - the UI text itself is
// written directly in each component in plain English.
export const ITEM_KEYS = ["shirt", "pant", "saree", "bedsheet", "other"];
export const ITEM_LABELS = {
  shirt: "Shirt",
  pant: "Trousers",
  saree: "Saree",
  bedsheet: "Bedsheet",
  other: "Other Items",
};

export const SERVICE_TYPES = ["Wash", "Iron", "Dry Clean"];

export const STATUS_FLOW = ["Received", "In Progress", "Ready for Pickup", "Handed Over"];
