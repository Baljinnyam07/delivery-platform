import { sendSms } from "@/lib/maps";
import { supabase } from "@/lib/supabase";

type SmsDelivery = {
  id: string;
  customer_phone: string;
  package_description: string | null;
  amount_due: number;
  payment_status: string;
};

/**
 * Payment message for the customer:
 *   Neko элс ×2
 *   Хаан банк 5000000000 Нэр
 *   баярлалаа.
 *   үнэ 64000
 *   Гүйлгээний утга: утасны дугаар
 * Account and price lines only while money is still due.
 */
export function paymentMessage(d: SmsDelivery, accounts: string[]): string {
  const due = Number(d.amount_due) > 0 && d.payment_status !== "PAID";
  return [
    d.package_description,
    ...(due ? accounts : []),
    "баярлалаа.",
    due ? `үнэ ${Math.round(Number(d.amount_due))}` : null,
    due ? "Гүйлгээний утга: утасны дугаар" : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Bank accounts of the brands in this delivery (set by the admin per factory). */
async function fetchBankAccounts(deliveryId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_delivery_bank_accounts", { p_delivery_id: deliveryId });
  if (error) return []; // still open the message, just without an account
  return data ?? [];
}

/** Opens Messages with the customer's number and the payment text ready to send. */
export async function messageCustomer(d: SmsDelivery) {
  const accounts = await fetchBankAccounts(d.id);
  return sendSms(d.customer_phone, paymentMessage(d, accounts));
}
