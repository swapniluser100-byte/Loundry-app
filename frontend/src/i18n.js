// Marathi / Hinglish UI copy for Pune shop staff. Keeping every label in one
// place makes it trivial to tweak wording without touching component logic.
export const t = {
  appName: "Laundry Manager",
  shopTagline: "Pune Laundry Order System",

  // Auth
  login: "Login Kara",
  username: "Username",
  password: "Password",
  loginButton: "Login",
  loggingIn: "Login Hot Aahe...",
  logout: "Bahar Pada",
  invalidLogin: "Username kinva password chuk aahe",

  // Nav
  dashboard: "Dashboard",
  newOrder: "Nava Order",
  scanQr: "QR Scan Kara",

  // Customer lookup
  mobileNumber: "Mobile Number Takaa",
  mobileNumberPlaceholder: "10 ankyacha mobile number",
  search: "Shodha",
  searching: "Shodhat Aahe...",
  customerFound: "Customer Sapadla!",
  customerNotFound: "Nava Customer Aahe - Mahiti Bhara",
  customerName: "Naav",
  namePlaceholder: "Grahakache pura naav",
  area: "Area",
  areaPlaceholder: "Uda. Kothrud, Karve Nagar",
  landmark: "Landmark",
  landmarkPlaceholder: "Jawalcha khun (uda. Dominos jawal)",
  email: "Email",
  emailPlaceholder: "grahakacha email (order updates sathi)",
  saveAndContinue: "Save Karun Pudhe Ja",
  continueWithCustomer: "Pudhe Ja",

  // Order creation
  clothDetails: "Kapdechi Mahiti",
  shirt: "Shirt",
  pant: "Pant",
  saree: "Saree",
  bedsheet: "Bedsheet / Chadar",
  other: "Itar Kapde",
  serviceType: "Service Type Nivda",
  wash: "Wash",
  iron: "Istri (Iron)",
  dryClean: "Dry Clean",
  estimatedAmount: "Andaje Rakkam",
  createOrder: "Order Confirm Kara",
  creatingOrder: "Order Taiyar Hot Aahe...",
  atLeastOneItem: "Kiman ek kapada takaa",

  // Order created / QR
  orderCreated: "Order Yashaswi Zala!",
  orderId: "Order ID",
  emailSent: "Grahakala Email Pathavla Gela",
  showQrToCustomer: "Ha QR grahakala WhatsApp var pathva",
  backToDashboard: "Dashboard Var Ja",
  createAnother: "Ajun Ek Order Kara",

  // Dashboard
  allOrders: "Sarva Order",
  filterAll: "Sarva",
  noOrders: "Ajun koni order nahi",
  loading: "Load Hot Aahe...",
  moveToInProgress: "Processing Suru Kara",
  moveToReady: "Tayar Zala - Pickup Sathi",
  viewDetails: "Baghha",

  // Status labels
  status: {
    Received: "Received Zala",
    "In Progress": "Kaam Chalu Aahe",
    "Ready for Pickup": "Tayar Aahe",
    "Handed Over": "Handover Zala",
  },

  // Scan / pickup
  scanInstructions: "Grahakachya QR var camera dhara",
  startCamera: "Camera Suru Kara",
  stopCamera: "Camera Band Kara",
  manualEntryTitle: "Kinva Order ID Takaa",
  enterOrderId: "Order ID takaa (uda. PN-LND-2026-000123)",
  findOrder: "Order Shodha",
  orderNotFound: "Order sapadla nahi",
  finalAmount: "Final Rakkam",
  generatePaymentQr: "Payment QR Dakhva",
  generatingQr: "QR Taiyar Hot Aahe...",
  scanToPay: "Grahakala ha UPI QR scan karayla saanga",
  openUpiApp: "UPI App Madhe Ughada",
  markHandedOver: "Payment Zala - Handover Kara",
  updating: "Update Hot Aahe...",
  handoverDone: "Handover Zala! Dhanyavaad email pathavla.",

  // Public tracking page
  trackTitle: "Tumcha Laundry Order",
  yourOrder: "Tumcha Order",
  itemsLabel: "Kapde",
  amountLabel: "Rakkam",
  qrForPickup: "Pickup vela ha QR dakhva",

  // Generic
  back: "Mage",
  save: "Save Kara",
  cancel: "Radd Kara",
  errorGeneric: "Kahi tari chuk zali, punha try kara",
};

export const ITEM_KEYS = ["shirt", "pant", "saree", "bedsheet", "other"];
export const SERVICE_TYPES = ["Wash", "Iron", "Dry Clean"];
export const STATUS_FLOW = ["Received", "In Progress", "Ready for Pickup", "Handed Over"];
