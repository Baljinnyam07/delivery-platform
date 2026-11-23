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
 *   Neko Cassava Элс ×1
 *   Хаан банк 5000000000 Нэр
 *   Үнэ: 64000
 *   ГҮЙЛГЭЭНИЙ УТГА: Утасны дугаар
 *
 *   Манайхыг сонгосонд баярлалаа.
 * Account and price lines only while money is still due.
 */
export function paymentMessage(d: SmsDelivery, accounts: string[]): string {
  const due = Number(d.amount_due) > 0 && d.payment_status !== "PAID";
  const body = [
    d.package_description,
    ...(due ? accounts : []),
    due ? `Үнэ: ${Math.round(Number(d.amount_due))}` : null,
    due ? "ГҮЙЛГЭЭНИЙ УТГА: Утасны дугаар" : null,
  ].filter(Boolean);
  return [...body, "", "Манайхыг сонгосонд баярлалаа."].join("\n").trimStart();
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
