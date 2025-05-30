export const DummyPayment = (paymentType: string, bank?: string) => {
  const orderId = Math.random().toString(36).substring(2, 6);
  const grossAmount = Math.floor(Math.random() * (1000000 - 100000 + 1)) + 100000;

  return {
    payment_type: paymentType ? paymentType : 'gopay',
    transaction_details: {
      order_id: `order-id-${orderId}`,
      gross_amount: grossAmount.toString(),
    },
    customer_details: {
      first_name: 'Farrid',
      last_name: 'Kuntoro',
      email: 'farridpastikaya@gmail.com',
      phone: '08979829907',
      customer_details_required_fields: ['email', 'first_name', 'phone'],
    },
    custom_field1: 'custom field 1 content',
    custom_field2: 'custom field 2 content',
    custom_field3: 'custom field 3 content',
    custom_expiry: { expiry_duration: 60, unit: 'minute' },
    metadata: { you: 'can', put: 'any', parameter: 'you like' },
    ...bank && paymentType === 'bank_transfer' &&
    {
      bank_transfer: {
        bank: bank,
      },
    },
  };
}
