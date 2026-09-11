// All UI copy for shop staff, in one place so wording can be tweaked without
// touching component logic.
export const t = {
  appName: "Laundry Manager",
  shopTagline: "Pune Laundry Order System",

  // Auth
  login: "Log In",
  username: "Username",
  password: "Password",
  loginButton: "Log In",
  loggingIn: "Logging in...",
  logout: "Log Out",
  invalidLogin: "Incorrect username or password",

  // Nav
  dashboard: "Dashboard",
  newOrder: "New Order",
  scanQr: "Scan QR Code",

  // Customer lookup
  mobileNumber: "Mobile Number",
  mobileNumberPlaceholder: "10-digit mobile number",
  search: "Search",
  searching: "Searching...",
  customerFound: "Customer found",
  customerNotFound: "New customer - please enter their details",
  customerName: "Name",
  namePlaceholder: "Customer's full name",
  area: "Area",
  areaPlaceholder: "e.g. Kothrud, Karve Nagar",
  landmark: "Landmark",
  landmarkPlaceholder: "Nearby landmark (e.g. near Domino's)",
  email: "Email",
  emailPlaceholder: "Customer's email address (used for order updates)",
  saveAndContinue: "Save & Continue",
  continueWithCustomer: "Continue",

  // Order creation
  clothDetails: "Order Items",
  shirt: "Shirt",
  pant: "Trousers",
  saree: "Saree",
  bedsheet: "Bedsheet",
  other: "Other Items",
  serviceType: "Service Type",
  wash: "Wash",
  iron: "Iron",
  dryClean: "Dry Clean",
  estimatedAmount: "Estimated Amount",
  createOrder: "Confirm Order",
  creatingOrder: "Creating order...",
  atLeastOneItem: "Please add at least one item",

  // Order created / QR
  orderCreated: "Order created successfully",
  orderId: "Order ID",
  emailSent: "Confirmation email sent to the customer",
  showQrToCustomer: "Send this QR code to the customer on WhatsApp",
  backToDashboard: "Back to Dashboard",
  createAnother: "Create Another Order",

  // Dashboard
  allOrders: "All Orders",
  filterAll: "All",
  noOrders: "No orders yet",
  loading: "Loading...",
  moveToInProgress: "Start Processing",
  moveToReady: "Mark Ready for Pickup",
  viewDetails: "View",

  // Status labels
  status: {
    Received: "Received",
    "In Progress": "In Progress",
    "Ready for Pickup": "Ready for Pickup",
    "Handed Over": "Handed Over",
  },

  // Scan / pickup
  scanInstructions: "Point the camera at the customer's QR code",
  startCamera: "Start Camera",
  stopCamera: "Stop Camera",
  manualEntryTitle: "Or enter the Order ID manually",
  enterOrderId: "Enter Order ID (e.g. PN-LND-2026-000123)",
  findOrder: "Find Order",
  orderNotFound: "Order not found",
  finalAmount: "Final Amount",
  generatePaymentQr: "Generate Payment QR Code",
  generatingQr: "Generating QR code...",
  scanToPay: "Ask the customer to scan this UPI QR code to pay",
  openUpiApp: "Open in UPI App",
  markHandedOver: "Payment Received - Mark as Handed Over",
  updating: "Updating...",
  handoverDone: "Handed over. Confirmation email sent.",

  // Public tracking page
  trackTitle: "Your Laundry Order",
  yourOrder: "Your Order",
  itemsLabel: "Items",
  amountLabel: "Amount",
  qrForPickup: "Show this QR code at pickup",

  // Generic
  back: "Back",
  save: "Save",
  cancel: "Cancel",
  errorGeneric: "Something went wrong. Please try again.",
};

export const ITEM_KEYS = ["shirt", "pant", "saree", "bedsheet", "other"];
export const SERVICE_TYPES = ["Wash", "Iron", "Dry Clean"];
export const STATUS_FLOW = ["Received", "In Progress", "Ready for Pickup", "Handed Over"];
