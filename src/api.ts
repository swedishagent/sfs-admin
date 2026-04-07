/**
 * API client for Swedish Food Shop Admin
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.olav.se';

// Token is stored after TOTP auth
let authToken: string | null = localStorage.getItem('sfs_token');

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('sfs_token', token);
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('sfs_token');
}

export function isAuthenticated(): boolean {
  return !!authToken;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }

  // Add API key for now (can be removed once JWT-only auth is enforced)
  headers['X-Api-Key'] = import.meta.env.VITE_API_KEY || '';

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function authenticate(totpCode: string): Promise<{ token: string; expires_in: number }> {
  const result = await apiRequest<{ success: boolean; token: string; expires_in: number }>('/api/agent/auth', {
    method: 'POST',
    body: JSON.stringify({ totp_code: totpCode })
  });

  if (!result.success || !result.token) {
    throw new Error('Autentisering misslyckades');
  }

  setAuthToken(result.token);

  return result;
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export interface Order {
  entity_id: number;
  order_id: string;
  status: string;
  state: string;
  grand_total: number;
  subtotal: number;
  shipping_amount: number;
  currency?: string;
  customer_email: string;
  customer_name: string;
  created_at: string;
  qty_ordered: number;
  shipping_address: {
    name?: string;
    street: string;
    city: string;
    postcode: string;
    country: string;
    telephone: string;
  };
  packing_status: string;
  items_packed: number;
  in_shopping_list?: boolean;
}

export interface OrderItem {
  item_id: number;
  sku: string;
  name: string;
  qty_ordered: number;
  qty_shipped: number;
  qty_refunded: number;
  price: number;
  row_total: number;
  discount: number;
  tax: number;
  packing_status: string;
  qty_packed: number;
  qty_missing: number;
  notes: string;
  image_url?: string;
}

export interface UpsBillingCharge {
  id: number;
  invoice_number: string;
  invoice_date: string;
  tracking_number: string;
  order_id: string;
  weight: number;
  zone: string;
  service: string;
  recipient_name: string;
  recipient_country: string;
  net_charge: number;
  discount: number;
  invoice_section: string;
  invoice_type: string;
  pickup_date: string;
  created_at: string;
}

export interface OrderDetail {
  order: Order & {
    discount_amount: number;
    shipping_description: string;
    ups_total_cost?: number;
    ups_diff?: number;
    ups_margin_pct?: number;
  };
  items: OrderItem[];
  ups_charges?: UpsBillingCharge[];
}

export async function getOrders(status: string = 'processing', days: number = 0, limit: number = 200): Promise<{ orders: Order[] }> {
  const params = new URLSearchParams({ status, limit: String(limit) });
  if (days > 0) params.set('days', String(days));
  return apiRequest(`/api/admin/orders?${params}`);
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  return apiRequest(`/api/admin/orders/${orderId}`);
}

export interface OrderShipment {
  shipment_id: number;
  track_number: string;
  carrier: string;
  created_at: string;
  tracking_status: string | null;
  delivery_date: string | null;
}

export async function getOrderShipments(orderId: string): Promise<{ shipments: OrderShipment[] }> {
  return apiRequest(`/api/admin/orders/${orderId}/shipments`);
}

export async function updateOrderItemStatus(
  orderId: string,
  itemId: number,
  data: {
    sku: string;
    product_name: string;
    qty_ordered: number;
    unit_price: number;
    status: string;
    qty_packed?: number;
    qty_missing?: number;
    notes?: string;
  }
): Promise<{ success: boolean }> {
  return apiRequest(`/api/admin/orders/${orderId}/items/${itemId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  notes?: string
): Promise<{ success: boolean }> {
  return apiRequest(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  });
}

// ─── Shopping Lists ─────────────────────────────────────────────────────────

export interface ShoppingList {
  id: number;
  name: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  notes: string | null;
  item_count?: number;
  bought_count?: number;
}

export interface ShoppingItem {
  id: number;
  list_id: number;
  sku: string;
  product_name: string;
  qty_needed: number;
  qty_bought: number;
  status: string;
  source_order_ids: string;
  notes: string | null;
  image_url?: string;
  weight?: number;
  weight_unit?: string;
  is_cold?: boolean;
  category?: string;
  categories?: string[];
}

export async function getShoppingLists(): Promise<{ lists: ShoppingList[] }> {
  return apiRequest('/api/admin/shopping-lists');
}

export async function getShoppingList(listId: number): Promise<ShoppingList & { items: ShoppingItem[] }> {
  return apiRequest(`/api/admin/shopping-lists/${listId}`);
}

export async function createShoppingList(name: string, notes?: string): Promise<{ id: number; name: string }> {
  return apiRequest('/api/admin/shopping-lists', {
    method: 'POST',
    body: JSON.stringify({ name, notes })
  });
}

export async function updateShoppingItem(
  itemId: number,
  status: string,
  qtyBought?: number
): Promise<{ success: boolean }> {
  return apiRequest(`/api/admin/shopping-lists/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, qty_bought: qtyBought })
  });
}

export async function generateShoppingListFromOrders(
  orderIds: string[],
  listName?: string
): Promise<{ list_id: number; name: string; item_count: number; total_qty: number }> {
  return apiRequest('/api/admin/shopping-lists/generate-from-orders', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds, list_name: listName })
  });
}

export async function completeShoppingList(listId: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/admin/shopping-lists/${listId}/complete`, {
    method: 'POST'
  });
}

export async function deleteShoppingList(listId: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/admin/shopping-lists/${listId}`, {
    method: 'DELETE'
  });
}

// ─── Products ───────────────────────────────────────────────────────────────

export interface ProductDetail {
  sku: string;
  name: string;
  price?: number;
  description?: string;
  image_url?: string;
  weight?: number;
  weight_unit?: string;
  stock_qty?: number;
}

export async function getProductBySku(sku: string): Promise<ProductDetail> {
  return apiRequest(`/api/products/${sku}`);
}

export async function getProductStock(sku: string): Promise<{ qty: number; is_in_stock: boolean }> {
  return apiRequest(`/api/products/${sku}/stock`);
}

// ─── Refunds ────────────────────────────────────────────────────────────────

export interface Refund {
  id: number;
  order_id: string;
  item_id: number;
  sku: string;
  product_name: string;
  qty_missing: number;
  refund_amount: number;
  status: string;
  processed_at: string | null;
  notes: string | null;
  created_at: string;
}

export async function getPendingRefunds(): Promise<{ refunds: Refund[] }> {
  return apiRequest('/api/admin/refunds');
}

export async function markRefundProcessed(refundId: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/admin/refunds/${refundId}/process`, {
    method: 'POST'
  });
}

// ─── Shipments ──────────────────────────────────────────────────────────────

export interface Shipment {
  shipment_id: number;
  order_id: number;
  order_number: string;
  order_status?: string;
  customer_name: string;
  track_number: string;
  carrier: string;
  created_at: string;
  shipping_address?: {
    name?: string;
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
    telephone?: string;
  };
  tracking_status?: string;
  delivery_date?: string;
  tracking_updated_at?: string;
  ups_cost?: number | null;
  ups_charge?: UpsBillingCharge;
  sla_service?: string | null;
  sla_max_days?: number | null;
  sla_breached?: boolean | null;
  sla_days_used?: number | null;
  sla_status?: 'ok' | 'breached' | 'at_risk' | null;
}

export async function getShipments(
  days: number = 14,
  carrier?: string
): Promise<{ shipments: Shipment[] }> {
  const params = new URLSearchParams({ days: days.toString() });
  if (carrier) params.append('carrier', carrier);
  return apiRequest(`/api/admin/shipments?${params}`);
}

export interface TrackingData {
  track_number: string;
  status: string;
  status_description: string;
  current_location: string;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  pickup_date: string | null;
  activities: Array<{
    date: string;
    time: string;
    city: string;
    country: string;
    description: string;
    status_code: string;
  }>;
}

export async function getShipmentTracking(trackNumber: string): Promise<TrackingData> {
  return apiRequest(`/api/admin/shipments/track/${trackNumber}`);
}

export interface ShipmentDetail {
  shipment: Shipment;
  order: {
    order_id: string;
    created_at: string;
    grand_total: number;
    qty_ordered: number;
    customer_email: string;
    customer_name: string;
    status: string;
  } | null;
  ups_charge?: {
    net_charge: number;
    discount: number;
    service: string;
    weight: number;
    zone: string;
    invoice_number: string;
    invoice_section: string;
  } | null;
}

export async function getShipmentDetail(trackNumber: string): Promise<ShipmentDetail> {
  return apiRequest(`/api/admin/shipments/detail/${trackNumber}`);
}

export async function refreshShipmentTracking(trackNumbers?: string[], force?: boolean): Promise<{ queued: number; already_cached: number }> {
  const params = force ? '?force=true' : '';
  return apiRequest(`/api/admin/shipments/refresh-tracking${params}`, {
    method: 'POST',
    body: JSON.stringify(trackNumbers || null)
  });
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface AnalyticsData {
  delivery_times: {
    avg_order_to_ship_hours: number | null;
    avg_ship_to_deliver_hours: number | null;
    avg_total_hours: number | null;
    fastest_delivery_hours: number | null;
  };
  orders: {
    total_orders: number;
    total_revenue: number;
    avg_order_value: number;
    orders_per_day: number;
    revenue_per_day: number;
    avg_items_per_order: number;
  };
  shipping: {
    total: number;
    delivered: number;
    in_transit: number;
    exceptions: number;
    unknown: number;
    delivery_rate: number | null;
  };
  top_countries: Array<{
    country: string;
    orders: number;
    revenue: number;
    avg_delivery_hours: number | null;
  }>;
  packing: {
    pending: number;
    packed_today: number;
    avg_packing_hours: number | null;
  };
}

export async function getAnalytics(days: number = 30): Promise<AnalyticsData> {
  return apiRequest(`/api/admin/analytics?days=${days}`);
}

// ─── Emails ─────────────────────────────────────────────────────────────────

export interface EmailSummary {
  uid: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  is_read: boolean;
  is_incoming: boolean;
}

export interface EmailDetail extends EmailSummary {
  body: string;
  is_html: boolean;
}

export async function getEmailsByAddress(
  emailAddress: string,
  limit: number = 20
): Promise<{ emails: EmailSummary[]; total: number }> {
  return apiRequest(`/api/admin/emails/by-address/${encodeURIComponent(emailAddress)}?limit=${limit}`);
}

export async function getEmailDetail(uid: string): Promise<EmailDetail> {
  return apiRequest(`/api/admin/emails/${uid}`);
}

// ─── UPS Billing ────────────────────────────────────────────────────────────

export interface UpsBillingUploadResult {
  success: boolean;
  upload_id: number;
  invoice_number: string;
  invoice_date: string;
  rows_processed: number;
  rows_matched: number;
  rows_unmatched: number;
  rows_adjustments: number;
  total_charges: number;
}

export interface UpsBillingData {
  id: number;
  invoice_number: string;
  invoice_date: string;
  tracking_number: string;
  order_id: string | null;
  weight: number;
  zone: string;
  service: string;
  recipient_name: string;
  recipient_country: string;
  net_charge: number;
  discount: number;
  invoice_section: string;
  invoice_type: string;
  pickup_date: string;
  created_at: string;
  magento_shipping_amount: number | null;
  magento_grand_total: number | null;
  magento_currency: string | null;
  diff: number | null;
  margin_pct: number | null;
}

export interface UpsBillingSummary {
  total_ups_cost: number;
  total_customer_shipping: number;
  diff: number;
  order_count: number;
  adjustment_count: number;
  unmatched_count: number;
  avg_margin_pct: number;
  invoices: Array<{
    invoice_number: string;
    invoice_date: string;
    total_cost: number;
    row_count: number;
  }>;
}

export interface UpsBillingUpload {
  id: number;
  filename: string;
  invoice_number: string;
  total_rows: number;
  total_amount: number;
  uploaded_at: string;
}

export async function uploadUpsBilling(file: File): Promise<UpsBillingUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }
  headers['X-Api-Key'] = import.meta.env.VITE_API_KEY || '';

  const response = await fetch(`${API_BASE}/api/admin/ups-billing/upload`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getUpsBilling(params?: {
  invoice_number?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ billing_data: UpsBillingData[] }> {
  const queryParams = new URLSearchParams();
  if (params?.invoice_number) queryParams.append('invoice_number', params.invoice_number);
  if (params?.date_from) queryParams.append('date_from', params.date_from);
  if (params?.date_to) queryParams.append('date_to', params.date_to);
  
  const query = queryParams.toString();
  return apiRequest(`/api/admin/ups-billing${query ? '?' + query : ''}`);
}

export async function getUpsBillingSummary(): Promise<UpsBillingSummary> {
  return apiRequest('/api/admin/ups-billing/summary');
}

export async function getUpsBillingUploads(): Promise<{ uploads: UpsBillingUpload[] }> {
  return apiRequest('/api/admin/ups-billing/uploads');
}

export async function deleteUpsBillingUpload(uploadId: number): Promise<{ success: boolean }> {
  return apiRequest(`/api/admin/ups-billing/uploads/${uploadId}`, {
    method: 'DELETE'
  });
}

// ─── Shipping (UPS) ─────────────────────────────────────────────────────────

export interface ShippingRecipient {
  name: string;
  company: string;
  attention_name: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country_code: string;
  };
}

export interface ShippingItem {
  sku: string;
  name: string;
  invoice_name?: string;
  qty: number;
  weight_kg: number;
  hts_code: string;
  origin_country: string;
  unit_value: number;
  total_value: number;
  exclude_from_customs?: boolean;
}

export interface ShippingPackage {
  weight_kg: number;
  calculated_weight_kg?: number;
  suggested_box: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

export interface MagentoShipping {
  description: string;
  amount: number;
  currency: string;
}

export interface PreparedShipment {
  order_id: string;
  order_entity_id: number;
  order_status: string;
  currency: string;
  recipient: ShippingRecipient;
  recipient_email?: string;
  shipper: any;
  package: ShippingPackage;
  service: {
    code: string;
    name: string;
  };
  magento_shipping?: MagentoShipping;
  customs_required: boolean;
  items: ShippingItem[];
  total_value: number;
  total_value_currency: string;
  warnings: string[];
  errors: string[];
}

export interface ShipmentResult {
  success: boolean;
  tracking_number?: string;
  label_url?: string;
  label_base64?: string;
  label_format?: string;
  cost?: {
    amount: string;
    currency: string;
  };
  documents?: Array<{
    type: string;
    format: string;
    url?: string;
    base64?: string;
  }>;
  errors?: string[];
  warnings?: string[];
}

export async function prepareShipment(orderId: string): Promise<PreparedShipment> {
  return apiRequest('/api/shipping/prepare', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId })
  });
}

export interface RateService {
  code: string;
  name: string;
  amount: string;
  currency: string;
  transit_days?: string;
  delivery_by?: string;
  arrival_date?: string;
  arrival_time?: string;
}

export interface ShipmentRate {
  success: boolean;
  cost?: {
    amount: string;
    currency: string;
  };
  billable_weight?: {
    weight: string;
    unit: string;
  };
  service?: {
    code: string;
    name: string;
  };
  available_services?: RateService[];
  errors?: string[];
  warnings?: string[];
}

export async function rateShipment(data: PreparedShipment): Promise<ShipmentRate> {
  return apiRequest('/api/shipping/rate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function validateShipment(data: PreparedShipment): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  return apiRequest('/api/shipping/validate', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createShipment(data: PreparedShipment): Promise<ShipmentResult> {
  return apiRequest('/api/shipping/create', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function voidShipment(trackingNumber: string, orderId?: string): Promise<{ success: boolean; errors?: string[] }> {
  return apiRequest('/api/shipping/void', {
    method: 'POST',
    body: JSON.stringify({ tracking_number: trackingNumber, order_id: orderId })
  });
}

export async function getShippingLabel(trackingNumber: string): Promise<{ base64: string; format: string }> {
  return apiRequest(`/api/shipping/label/${trackingNumber}`);
}

export async function getShippingDocument(trackingNumber: string, docType: string = 'commercial_invoice'): Promise<{ base64: string; format: string }> {
  return apiRequest(`/api/shipping/document/${trackingNumber}?doc_type=${docType}`);
}
