import Joi from 'joi';
import { config } from '@/config';
import { redisClient } from '@/database/redis';
import { createLogger } from '@/utils/logger';

const logger = createLogger('QPAY');

const TOKEN_CACHE_KEY = 'qpay:token';
const TOKEN_SAFETY_BUFFER_SECONDS = 60;

export interface CreateInvoiceParams {
  senderInvoiceNo: string;
  amount: number;
  description: string;
  callbackUrl: string;
}

export interface QpayInvoiceResponse {
  invoiceId: string;
  qrText: string;
  qrImage: string;
  shortUrl?: string;
  deeplinks: Array<{ name: string; description: string; logo: string; link: string }>;
  raw: unknown;
}

export interface QpayPaymentCheckResponse {
  count: number;
  paidAmount: number;
  rows: Array<{ paymentId: string; paymentStatus: string; paymentAmount: number }>;
  raw: unknown;
}

const tokenSchema = Joi.object({
  access_token: Joi.string().required(),
  refresh_token: Joi.string().optional(),
  expires_in: Joi.number().required(),
}).unknown(true);

const invoiceSchema = Joi.object({
  invoice_id: Joi.string().required(),
  qr_text: Joi.string().required(),
  qr_image: Joi.string().required(),
  qPay_shortUrl: Joi.string().optional(),
  urls: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().allow('').default(''),
        description: Joi.string().allow('').default(''),
        logo: Joi.string().allow('').default(''),
        link: Joi.string().allow('').default(''),
      }).unknown(true)
    )
    .default([]),
}).unknown(true);

const paymentCheckSchema = Joi.object({
  count: Joi.number().required(),
  paid_amount: Joi.number().default(0),
  rows: Joi.array()
    .items(
      Joi.object({
        payment_id: Joi.string().required(),
        payment_status: Joi.string().required(),
        payment_amount: Joi.alternatives(Joi.string(), Joi.number()).optional(),
      }).unknown(true)
    )
    .default([]),
}).unknown(true);

function validate<T>(schema: Joi.Schema, data: unknown, label: string): T {
  const { error, value } = schema.validate(data, { stripUnknown: false });
  if (error) {
    logger.error(`QPay ${label} response validation failed: ${error.message}`);
    throw new Error(`Unexpected QPay ${label} response: ${error.message}`);
  }
  return value as T;
}

function baseHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function qpayFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${config.qpay.baseUrl}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error(`QPay ${path} failed: ${res.status}`);
    throw new Error(`QPay request failed (${res.status}) on ${path}: ${text.slice(0, 300)}`);
  }
  // Some endpoints (e.g. DELETE invoice) may return an empty body.
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function getAccessToken(): Promise<string> {
  const cached = await redisClient.get(TOKEN_CACHE_KEY).catch(() => null);
  if (cached) return cached;

  const basic = Buffer.from(`${config.qpay.clientId}:${config.qpay.clientSecret}`).toString(
    'base64'
  );
  const json = await qpayFetch('/v2/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
  });
  const parsed = validate<{ access_token: string; expires_in: number }>(tokenSchema, json, 'token');
  const ttl = Math.max(parsed.expires_in - TOKEN_SAFETY_BUFFER_SECONDS, 30);
  await redisClient.set(TOKEN_CACHE_KEY, parsed.access_token, ttl).catch(() => false);
  return parsed.access_token;
}

export async function createInvoice(params: CreateInvoiceParams): Promise<QpayInvoiceResponse> {
  const token = await getAccessToken();
  const json = await qpayFetch('/v2/invoice', {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify({
      invoice_code: config.qpay.invoiceCode,
      sender_invoice_no: params.senderInvoiceNo,
      invoice_receiver_code: 'terminal',
      invoice_description: params.description,
      amount: params.amount,
      callback_url: params.callbackUrl,
    }),
  });
  const parsed = validate<{
    invoice_id: string;
    qr_text: string;
    qr_image: string;
    qPay_shortUrl?: string;
    urls: Array<{ name: string; description: string; logo: string; link: string }>;
  }>(invoiceSchema, json, 'invoice');
  return {
    invoiceId: parsed.invoice_id,
    qrText: parsed.qr_text,
    qrImage: parsed.qr_image,
    shortUrl: parsed.qPay_shortUrl,
    deeplinks: parsed.urls,
    raw: json,
  };
}

export async function checkPayment(invoiceId: string): Promise<QpayPaymentCheckResponse> {
  const token = await getAccessToken();
  const json = await qpayFetch('/v2/payment/check', {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify({
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  const parsed = validate<{
    count: number;
    paid_amount: number;
    rows: Array<{ payment_id: string; payment_status: string; payment_amount?: string | number }>;
  }>(paymentCheckSchema, json, 'payment/check');
  return {
    count: parsed.count,
    paidAmount: parsed.paid_amount,
    rows: parsed.rows.map(r => ({
      paymentId: r.payment_id,
      paymentStatus: r.payment_status,
      paymentAmount: Number(r.payment_amount ?? 0),
    })),
    raw: json,
  };
}

export async function cancelInvoice(invoiceId: string): Promise<void> {
  const token = await getAccessToken();
  await qpayFetch(`/v2/invoice/${invoiceId}`, { method: 'DELETE', headers: baseHeaders(token) });
}
